// pages/minutes/[id].js

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import FullScreenOverlay from '../../components/fullscreenoverlay'; //←必要に応じてパス調整

export default function MinutesDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [paper, setPaper] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  useEffect(() => {
    if (router.isReady && !paper) {
      router.push('/minutes-list');
    }
  }, [paper, router.isReady]);

  if (!paper) return null;

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
