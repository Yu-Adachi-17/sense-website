import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function TimelyViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const ref = doc(db, 'timelyNotes', id);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setMinutes(snap.data());
        } else {
          setMinutes({ error: 'この議事録は存在しません' });
        }
        setLoading(false);
      },
      (error) => {
        console.error('リアルタイム監視中にエラー:', error);
        setMinutes({ error: '読み込みエラー' });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router.isReady, id]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!minutes || minutes.error) return <div style={{ padding: 40 }}>{minutes?.error}</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>📋 タイムリー議事録</h1>
      <p><strong>最終更新:</strong> {new Date(minutes.updatedAt.seconds * 1000).toLocaleString()}</p>
      <hr style={{ margin: '1rem 0', opacity: 0.3 }} />

      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{minutes.meetingTitle}</h2>
      <p style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>{minutes.date}</p>

      {minutes.pastTopics && minutes.pastTopics.map((topic, i) => (
        <div key={i} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{i + 1}. {topic.topic}</h3>
          <p>{topic.summary}</p>

          {topic.decisions?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>決定事項</h4>
              <ul>{topic.decisions.map((d, j) => <li key={j}>{d}</li>)}</ul>
            </div>
          )}

          {topic.actionItems?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>TODO</h4>
              <ul>{topic.actionItems.map((a, j) => <li key={j}>{a}</li>)}</ul>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🕒 現在進行中: {minutes.currentTopic.topic}</h3>
        <p>{minutes.currentTopic.summarySoFar}</p>

        {minutes.currentTopic.confirmedMatters?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontWeight: 'bold' }}>合意された事項</h4>
            <ul>{minutes.currentTopic.confirmedMatters.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}

        {minutes.currentTopic.pendingPoints?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontWeight: 'bold' }}>検討中のポイント</h4>
            <ul>{minutes.currentTopic.pendingPoints.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}

        {minutes.currentTopic.nextActionables?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontWeight: 'bold' }}>次のアクション</h4>
            <ul>{minutes.currentTopic.nextActionables.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
