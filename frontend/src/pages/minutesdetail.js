import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FullScreenOverlay from './fullscreenoverlay';

export default function MinutesDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [paper, setPaper] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // URLのIDからFirebaseの議事録データを取得
  useEffect(() => {
    if (!router.isReady || !id) return;
    const fetchPaper = async () => {
      try {
        const docRef = doc(db, "meetingRecords", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPaper({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("No such document!");
          setPaper(null);
        }
      } catch (error) {
        console.error("Error fetching paper data:", error);
        setPaper(null);
      }
    };
    fetchPaper();
  }, [router.isReady, id]);

  // paper がない場合は /minutes-list へリダイレクト
  useEffect(() => {
    if (router.isReady && !paper) {
      router.push('/minutes-list');
    }
  }, [paper, router.isReady]);

  // paper が null の場合は何も表示しない（リダイレクト待ち）
  if (!paper) return null;

  // FullScreenOverlay の閉じる処理（閉じると前の画面に戻る）
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
