import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// FullScreenOverlay はブラウザ API に触れる可能性があるので SSR を無効化
const FullScreenOverlay = dynamic(() => import('../fullscreenoverlay'), { ssr: false });

export default function MinutesDetailPage() {
  const router = useRouter();
  const { id } = router.query || {};

  // undefined=読み込み中, null=見つからず, object=OK
  const [paper, setPaper] = useState(undefined);
  const [isExpanded, setIsExpanded] = useState(false);

  // Firestore はクライアント側でだけ import/実行（SSRに載せない）
  useEffect(() => {
    if (!router.isReady || !id) return;

    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebaseConfig');
        const ref = doc(db, 'meetingRecords', String(id));
        const snap = await getDoc(ref);
        setPaper(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (err) {
        console.error('MinutesDetail fetch error:', err);
        setPaper(null);
      }
    })();
  }, [router.isReady, id]);

  const handleClose = () => router.back();

  if (paper === undefined) return null; // SSR/初期レンダリングでは何も描かない
  if (paper === null) {
    if (typeof window !== 'undefined') router.replace('/minutes-list');
    return null;
  }

  return (
    <FullScreenOverlay
      setShowFullScreen={handleClose}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      transcription={paper.transcription || ''}
      minutes={paper.minutes || ''}
      audioURL={paper.audioURL || ''}
      docId={paper.id}
    />
  );
}
