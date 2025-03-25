import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import FullScreenOverlay from '../fullscreenoverlay';

export default function MinutesDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [paper, setPaper] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // ← 新しく追加

  useEffect(() => {
    if (!router.isReady || !id) return;
    const fetchPaper = async () => {
      try {
        const docRef = doc(db, "meetingRecords", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPaper({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPaper(null);
        }
      } catch (error) {
        console.error("Error fetching paper data:", error);
        setPaper(null);
      } finally {
        setIsLoading(false); // ← 読み込み完了
      }
    };
    fetchPaper();
  }, [router.isReady, id]);

  // 読み込み完了後に paper が null ならリダイレクト
  useEffect(() => {
    if (!isLoading && !paper) {
      router.push('/minutes-list');
    }
  }, [isLoading, paper]);

  if (isLoading || !paper) return null; // ← 読み込み中やリダイレクト準備中は何も表示しない

  const handleClose = () => {
    router.back();
  };

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
