import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function TimelyViewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [rawData, setRawData]   = useState(null);
  const [minutes, setMinutes]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [parseError, setParseError] = useState('');

  /* ───────── Firestore ───────── */
  useEffect(() => {
    if (!router.isReady || !id) return;
    const ref = doc(db, 'timelyNotes', id);
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setParseError('この議事録は存在しません');
          setLoading(false);
          return;
        }
        const data = snap.data();
        setRawData(data);
        if (typeof data.transcript === 'string') {
          try {
            const parsed = JSON.parse(data.transcript);
            setMinutes({ ...parsed, updatedAt: data.updatedAt });
          } catch(e) {
            setParseError('JSON 解析に失敗しました');
          }
        } else {
          setMinutes(data);
        }
        setLoading(false);
      },
      err => { console.error(err); setParseError('読み込みエラー'); setLoading(false);} );
    return () => unsubscribe();
  }, [router.isReady, id]);

  /* ───────── UI ───────── */
  if (loading)      return <div style={{ padding: 32, color:'#fff' }}>Loading...</div>;
  if (parseError)   return <div style={{ padding: 32, color:'#fff' }}>{parseError}</div>;
  if (!minutes)     return <div style={{ padding: 32, color:'#fff' }}>データがありません</div>;

  const divider = <hr style={{ border:'none', borderTop:'1px solid #555', margin:'24px 0' }} />;
  const white    = { color:'#fff' };

  return (
    <div style={{ padding:40, ...white }}>
      {/* RAW JSON */}
      <details style={{ marginBottom:32 }}>
        <summary style={{cursor:'pointer',fontWeight:'bold'}}>RAW JSON</summary>
        <pre style={{background:'#111',color:'#0f0',padding:16,overflowX:'auto'}}>
          {JSON.stringify(rawData,null,2)}
        </pre>
      </details>

      {/* ヘッダー */}
      <h1 style={{fontSize:'2rem',fontWeight:'bold'}}>📋 タイムリー議事録</h1>
      <p><strong>最終更新:</strong> {minutes.updatedAt?.seconds ? new Date(minutes.updatedAt.seconds*1000).toLocaleString() : '不明'}</p>
      {divider}

      {/* 1. 現在進行中トピックを最上部 */}
      {minutes.currentTopic && (
        <section style={{marginBottom:32}}>
          <h3 style={{fontSize:'1.2rem',fontWeight:'bold'}}>🕒 現在進行中: {minutes.currentTopic.topic || '（無題）'}</h3>
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

      {/* 2. 過去トピックを新しい順に逆並び */}
      {Array.isArray(minutes.pastTopics) && minutes.pastTopics.length>0 ? (
        [...minutes.pastTopics].reverse().map((topic,i) => (
          <section key={i} style={{marginBottom:32}}>
            <h3 style={{fontSize:'1.2rem',fontWeight:'bold'}}>{topic.topic || '（無題）'}</h3>
            {topic.summary && <p>{topic.summary}</p>}
            {Array.isArray(topic.decisions) && topic.decisions.length>0 && (
              <><h4>決定事項</h4><ul>{topic.decisions.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {Array.isArray(topic.actionItems) && topic.actionItems.length>0 && (
              <><h4>TODO</h4><ul>{topic.actionItems.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {i !== minutes.pastTopics.length-1 && divider}
          </section>
        ))
      ) : <p style={{opacity:0.7}}>（過去トピックはまだありません）</p>}
    </div>
  );
}
