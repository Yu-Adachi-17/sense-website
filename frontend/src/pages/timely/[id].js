import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function TimelyViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const [transcript, setTranscript] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !id) return;

    const ref = doc(db, 'timelyNotes', id);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTranscript(data.transcript || '');
        setUpdatedAt(data.updatedAt?.toDate().toISOString() || '');
      } else {
        setTranscript('（この議事録は存在しません）');
      }
      setLoading(false);
    }, (error) => {
      console.error('リアルタイム監視中にエラー:', error);
      setTranscript('（読み込みエラー）');
      setLoading(false);
    });

    return () => unsubscribe(); // 🔁 クリーンアップ
  }, [router.isReady, id]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>📋 タイムリー議事録</h1>
      <p><strong>最終更新:</strong> {updatedAt}</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f2f2f2', padding: '1rem', borderRadius: '8px' }}>
        {transcript}
      </pre>
    </div>
  );
}
