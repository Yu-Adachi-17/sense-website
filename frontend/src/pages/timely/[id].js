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
        if (!snap.exists()) { setErrorMsg('This meeting note does not exist'); setLoading(false); return; }
        const data = snap.data();
        if (typeof data.minutes === 'string') {
          try {
            const parsed = JSON.parse(data.minutes);
            // ✅ explicitly add updatedAt
            setMinutes({ ...parsed, updatedAt: data.updatedAt });
          } catch (e) {
            console.error("⚠️ JSON parse error:", e, "\nInput:", data.minutes);
            setErrorMsg('Failed to parse JSON');
          }
        } else {
          setMinutes(data);
        }
        
        setLoading(false);
      },
      err => { console.error(err); setErrorMsg('Load error'); setLoading(false);} );
    return () => unsub();
  }, [router.isReady, id]);

  /* ───────── UI ───────── */
  if (loading)  return <div style={{ padding:32, color:'#fff' }}>Loading...</div>;
  if (errorMsg) return <div style={{ padding:32, color:'#fff' }}>{errorMsg}</div>;
  if (!minutes) return <div style={{ padding:32, color:'#fff' }}>No data available</div>;

  const white   = { color:'#fff' };
  const divider = <hr style={{border:'none',borderTop:'1px solid #555',margin:'24px 0'}} />;

  return (
    <div style={{ padding:40, ...white }}>
      {/* Header */}
      <h1 style={{fontSize:'2rem',fontWeight:'bold'}}>
        {minutes.meetingTitle ? `${minutes.meetingTitle} (Live)` : 'Timely Minutes'}
      </h1>
      <p><strong>Last updated:</strong> {minutes.updatedAt?.seconds ? new Date(minutes.updatedAt.seconds*1000).toLocaleString() : 'Unknown'}</p>
      {divider}

      {/* Currently Ongoing */}
      {minutes.currentTopic && (
        <section style={{marginBottom:32}}>
          <h2 style={{fontSize:'1.8rem',fontWeight:'bold',margin:0}}>Currently Ongoing: </h2>
          <h3 style={{fontSize:'1.8rem',fontWeight:'bold',margin:'4px 0 12px 0'}}>{minutes.currentTopic.topic || '(Untitled)'}</h3>
          {minutes.currentTopic.summarySoFar && <p>{minutes.currentTopic.summarySoFar}</p>}

          {Array.isArray(minutes.currentTopic.confirmedMatters) && minutes.currentTopic.confirmedMatters.length>0 && (
            <><h4>Confirmed Matters</h4><ul>{minutes.currentTopic.confirmedMatters.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}

          {Array.isArray(minutes.currentTopic.pendingPoints) && minutes.currentTopic.pendingPoints.length>0 && (
            <><h4>Pending Points</h4><ul>{minutes.currentTopic.pendingPoints.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}

          {Array.isArray(minutes.currentTopic.nextActionables) && minutes.currentTopic.nextActionables.length>0 && (
            <><h4>Next Actions</h4><ul>{minutes.currentTopic.nextActionables.map((t,i)=><li key={i}>{t}</li>)}</ul></>)}
        </section>
      )}

      {divider}

      {/* Past Topics (Newest → Oldest) */}
      {Array.isArray(minutes.pastTopics) && minutes.pastTopics.length>0 ? (
        [...minutes.pastTopics].reverse().map((topic, i, arr) => (
          <section key={i} style={{marginBottom:32}}>
            <h3 style={{fontSize:'1.2rem',fontWeight:'bold'}}>{arr.length - i}. {topic.topic || '(Untitled)'}</h3>
            {topic.summary && <p>{topic.summary}</p>}
            {Array.isArray(topic.decisions) && topic.decisions.length>0 && (
              <><h4>Decisions</h4><ul>{topic.decisions.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {Array.isArray(topic.actionItems) && topic.actionItems.length>0 && (
              <><h4>TODO</h4><ul>{topic.actionItems.map((d,j)=><li key={j}>{d}</li>)}</ul></>)}
            {i!==arr.length-1 && divider}
          </section>
        ))
      ) : <p style={{opacity:0.7}}>(No past topics yet)</p>}
    </div>
  );
}
