import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function TimelyViewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  /* ───────── Firestore ───────── */
  useEffect(() => {
    if (!router.isReady || !id) return;

    const ref = doc(db, 'timelyNotes', id);
    const unsub = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) { setErrorMsg('この議事録は存在しません'); setLoading(false); return; }
        const data = snap.data();
        if (typeof data.transcript === 'string') {
          try { setMinutes({ ...JSON.parse(data.minutes), updatedAt: data.updatedAt }); }
          catch { setErrorMsg('JSON 解析に失敗しました'); }
        } else {
          setMinutes(data);
        }
        setLoading(false);
      },
      err => { console.error(err); setErrorMsg('読み込みエラー'); setLoading(false);} );
    return () => unsub();
  }, [router.isReady, id]);

  /* ───────── UI ───────── */
  if (loading)  return <div style={{ padding:32, color:'#fff' }}>Loading...</div>;
  if (errorMsg) return <div style={{ padding:32, color:'#fff' }}>{errorMsg}</div>;
  if (!minutes) return <div style={{ padding:32, color:'#fff' }}>データがありません</div>;

  const white   = { color:'#fff' };
  const divider = <hr style={{border:'none',borderTop:'1px solid #555',margin:'24px 0'}} />;

  return (
    <div style={{ padding:40, ...white }}>
      {/* ヘッダー */}
      <h1 style={{fontSize:'2rem',fontWeight:'bold'}}>
        {minutes.meetingTitle ? `${minutes.meetingTitle}（速報）` : 'タイムリー議事録'}
      </h1>
      <p><strong>最終更新:</strong> {minutes.updatedAt?.seconds ? new Date(minutes.updatedAt.seconds*1000).toLocaleString() : '不明'}</p>
      {divider}

      {/* 現在進行中 */}
      {minutes.currentTopic && (
        <section style={{marginBottom:32}}>
          <h2 style={{fontSize:'1.8rem',fontWeight:'bold',margin:0}}>現在進行中</h2>
          <h3 style={{fontSize:'1.8rem',fontWeight:'bold',margin:'4px 0 12px 0'}}>{minutes.currentTopic.topic || '（無題）'}</h3>
          {minutes.currentTopic.summarySoFar && <p>{minutes.currentTopic.summarySoFar}</p>}

          {Array.isArray(minutes.currentTopic.confirmedMatters) && minutes.currentTopic.confirmedMatters.length>0 && (
            <><h4>合意された事項</h4><ul>{minutes.currentTopic.confirmedMatters.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}

          {Array.isArray(minutes.currentTopic.pendingPoints) && minutes.currentTopic.pendingPoints.length>0 && (
            <><h4>検討中のポイント</h4><ul>{minutes.currentTopic.pendingPoints.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}

          {Array.isArray(minutes.currentTopic.nextActionables) && minutes.currentTopic.nextActionables.length>0 && (
            <><h4>次のアクション</h4><ul>{minutes.currentTopic.nextActionables.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}
        </section>
      )}

      {divider}

      {/* 過去トピック（最新→古い） */}
      {Array.isArray(minutes.pastTopics) && minutes.pastTopics.length>0 ? (
        [...minutes.pastTopics].reverse().map((topic, i, arr) => (
          <section key={i} style={{marginBottom:32}}>
            <h3 style={{fontSize:'1.2rem',fontWeight:'bold'}}>{arr.length - i}. {topic.topic || '（無題）'}</h3>
            {topic.summary && <p>{topic.summary}</p>}
            {Array.isArray(topic.decisions) && topic.decisions.length>0 && (
              <><h4>決定事項</h4><ul>{topic.decisions.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {Array.isArray(topic.actionItems) && topic.actionItems.length>0 && (
              <><h4>TODO</h4><ul>{topic.actionItems.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {i!==arr.length-1 && divider}
          </section>
        ))
      ) : <p style={{opacity:0.7}}>（過去トピックはまだありません）</p>}
    </div>
  );
}