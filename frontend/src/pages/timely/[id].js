import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function TimelyViewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [rawData, setRawData]   = useState(null);   // Firestore からそのまま取得
  const [minutes, setMinutes]   = useState(null);   // 解析後の JSON 構造
  const [loading, setLoading]   = useState(true);
  const [parseError, setParseError] = useState('');

  // ────────────────────────────
  // Firestore 監視
  // ────────────────────────────
  useEffect(() => {
    if (!router.isReady || !id) return;

    const ref = doc(db, 'timelyNotes', id);
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        if (snap.exists()) {
          const data = snap.data();
          setRawData(data); // デバッグ用 RAW

          // --- transcript フィールドに文字列 JSON が入っているケースに対応
          if (typeof data.transcript === 'string') {
            try {
              const parsed = JSON.parse(data.transcript);
              setMinutes({ ...parsed, updatedAt: data.updatedAt });
            } catch (e) {
              console.error('JSON parse error:', e);
              setParseError('JSON 解析に失敗しました');
              setMinutes(null);
            }
          } else {
            // すでにオブジェクト構造の場合はこちらを使う
            setMinutes(data);
          }
        } else {
          setParseError('この議事録は存在しません');
          setMinutes(null);
        }
        setLoading(false);
      },
      error => {
        console.error('Firestore onSnapshot error:', error);
        setParseError('読み込みエラー');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router.isReady, id]);

  // ──────────────  UI ──────────────
  if (loading) return <div style={{ padding: 32, color: '#fff' }}>Loading...</div>;
  if (parseError)  return <div style={{ padding: 32, color: '#fff' }}>{parseError}</div>;
  if (!minutes)    return <div style={{ padding: 32, color: '#fff' }}>データがありません</div>;

  const textColor = { color: '#fff' };

  return (
    <div style={{ padding: 40, ...textColor }}>
      {/* RAW JSON デバッグ */}
      <details style={{ marginBottom: 32 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>RAW JSON（クリックで展開）</summary>
        <pre style={{ background: '#111', color: '#0f0', padding: 16, overflowX: 'auto' }}>
          {JSON.stringify(rawData, null, 2)}
        </pre>
      </details>

      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>📋 タイムリー議事録</h1>
      <p><strong>最終更新:</strong>{' '}
        {minutes.updatedAt?.seconds ? new Date(minutes.updatedAt.seconds * 1000).toLocaleString() : '不明'}</p>
      <hr style={{ margin: '1rem 0', opacity: 0.3 }} />

      {minutes.meetingTitle && (
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{minutes.meetingTitle}</h2>
      )}
      {minutes.date && (
        <p style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>{minutes.date}</p>
      )}

      {/* pastTopics */}
      {Array.isArray(minutes.pastTopics) && minutes.pastTopics.length > 0 ? (
        minutes.pastTopics.map((topic, i) => (
          <div key={i} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{i + 1}. {topic.topic || '（無題のトピック）'}</h3>

            {topic.summary && (
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>要点まとめ</h4>
                <p>{topic.summary}</p>
              </div>
            )}

            {Array.isArray(topic.decisions) && topic.decisions.length > 0 && (
              <section style={{ marginTop: '1rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>決定事項</h4>
                <ul>{topic.decisions.map((d, j) => <li key={j}>{d}</li>)}</ul>
              </section>
            )}

            {Array.isArray(topic.actionItems) && topic.actionItems.length > 0 && (
              <section style={{ marginTop: '1rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>TODO</h4>
                <ul>{topic.actionItems.map((a, j) => <li key={j}>{a}</li>)}</ul>
              </section>
            )}
          </div>
        ))
      ) : (
        <p style={{ opacity: 0.7 }}>（過去トピックはまだありません）</p>
      )}

      {/* currentTopic */}
      {minutes.currentTopic ? (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🕒 現在進行中: {minutes.currentTopic.topic || '（無題のトピック）'}</h3>

          {minutes.currentTopic.summarySoFar && <p>{minutes.currentTopic.summarySoFar}</p>}

          {Array.isArray(minutes.currentTopic.confirmedMatters) && minutes.currentTopic.confirmedMatters.length > 0 && (
            <section style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>合意された事項</h4>
              <ul>{minutes.currentTopic.confirmedMatters.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </section>
          )}

          {Array.isArray(minutes.currentTopic.pendingPoints) && minutes.currentTopic.pendingPoints.length > 0 && (
            <section style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>検討中のポイント</h4>
              <ul>{minutes.currentTopic.pendingPoints.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </section>
          )}

          {Array.isArray(minutes.currentTopic.nextActionables) && minutes.currentTopic.nextActionables.length > 0 && (
            <section style={{ marginTop: '1rem' }}>
              <h4 style={{ fontWeight: 'bold' }}>次のアクション</h4>
              <ul>{minutes.currentTopic.nextActionables.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </section>
          )}
        </div>
      ) : (
        <p style={{ opacity: 0.7 }}>（現在進行中のトピックはありません）</p>
      )}
    </div>
  );
}