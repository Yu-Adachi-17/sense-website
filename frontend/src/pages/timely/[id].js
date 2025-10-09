// src/pages/timely/[id].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { getDb } from '../../firebaseConfig'; // ★ 変更：dbはゲッター経由で取得

export default function TimelyViewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;

  const [minutes, setMinutes] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!router.isReady || !id) return;

    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      try {
        const db = await getDb();
        if (!db) {
          if (!cancelled) {
            setErrorMsg(t('Load error'));
            setLoading(false);
          }
          return;
        }

        // Firestore はクライアントでのみ動的に読み込む
        const { doc, onSnapshot } = await import('firebase/firestore');
        const ref = doc(db, 'timelyNotes', String(id));

        unsubscribe = onSnapshot(
          ref,
          (snap) => {
            if (!snap.exists()) {
              setErrorMsg(t('This meeting note does not exist'));
              setLoading(false);
              return;
            }

            const data = snap.data();
            try {
              if (typeof data.minutes === 'string') {
                const parsed = JSON.parse(data.minutes);
                setMinutes(parsed);
              } else {
                setMinutes(data);
              }
              setUpdatedAt(data.updatedAt);
            } catch (e) {
              console.error("⚠️ JSON parse error:", e, "\nInput:", data.minutes);
              setErrorMsg(t('Failed to parse JSON'));
            }
            setLoading(false);
          },
          (err) => {
            console.error(err);
            setErrorMsg(t('Load error'));
            setLoading(false);
          }
        );
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setErrorMsg(t('Load error'));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { unsubscribe(); } catch {}
    };
  }, [router.isReady, id, t]);

  if (loading)  return <div style={{ padding:32, color:'#fff' }}>{t('Loading...')}</div>;
  if (errorMsg) return <div style={{ padding:32, color:'#fff' }}>{errorMsg}</div>;
  if (!minutes) return <div style={{ padding:32, color:'#fff' }}>{t('No data available')}</div>;

  const white = { color: '#fff' };
  const divider = <hr style={{ border: 'none', borderTop: '1px solid #555', margin: '24px 0' }} />;

  return (
    <div style={{ padding: 40, ...white }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        {minutes.meetingTitle ? `${minutes.meetingTitle} (${t('Live')})` : t('Timely Minutes')}
      </h1>
      <p>
        <strong>{t('Last updated:')}</strong>{' '}
        {updatedAt?.seconds
          ? new Date(updatedAt.seconds * 1000).toLocaleString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : t('Unknown')}
      </p>
      {divider}

      {minutes.currentTopic && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{t('Currently Ongoing:')}</h2>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '4px 0 12px 0' }}>
            {minutes.currentTopic.topic || t('(Untitled)')}
          </h3>
          {minutes.currentTopic.summarySoFar && <p>{minutes.currentTopic.summarySoFar}</p>}

          {Array.isArray(minutes.currentTopic.confirmedMatters) && minutes.currentTopic.confirmedMatters.length > 0 && (
            <>
              <h4>{t('Confirmed Matters')}</h4>
              <ul>
                {minutes.currentTopic.confirmedMatters.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}

          {Array.isArray(minutes.currentTopic.pendingPoints) && minutes.currentTopic.pendingPoints.length > 0 && (
            <>
              <h4>{t('Pending Points')}</h4>
              <ul>
                {minutes.currentTopic.pendingPoints.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}

          {Array.isArray(minutes.currentTopic.nextActionables) && minutes.currentTopic.nextActionables.length > 0 && (
            <>
              <h4>{t('Next Actions')}</h4>
              <ul>
                {minutes.currentTopic.nextActionables.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </>
          )}
        </section>
      )}

      {divider}

      {Array.isArray(minutes.pastTopics) && minutes.pastTopics.length > 0 ? (
        [...minutes.pastTopics].reverse().map((topic, i, arr) => (
          <section key={i} style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {arr.length - i}. {topic.topic || t('(Untitled)')}
            </h3>
            {topic.summary && <p>{topic.summary}</p>}
            {Array.isArray(topic.decisions) && topic.decisions.length > 0 && (
              <>
                <h4>{t('Decisions')}</h4>
                <ul>{topic.decisions.map((d, j) => <li key={j}>{d}</li>)}</ul>
              </>
            )}
            {Array.isArray(topic.actionItems) && topic.actionItems.length > 0 && (
              <>
                <h4>{t('TODO')}</h4>
                <ul>{topic.actionItems.map((d, j) => <li key={j}>{d}</li>)}</ul>
              </>
            )}
            {i !== arr.length - 1 && divider}
          </section>
        ))
      ) : (
        <p style={{ opacity: 0.7 }}>{t('(No past topics yet)')}</p>
      )}
    </div>
  );
}
