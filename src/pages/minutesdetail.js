import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FullScreenOverlay from './fullscreenoverlay';

export default function MinutesDetail() {
  const router = useRouter();
  const { paper: paperQuery } = router.query;
  const [paper, setPaper] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // クエリパラメータから paper 情報を取得（JSON文字列をパース）
  useEffect(() => {
    if (!router.isReady) return;
    if (paperQuery) {
      try {
        const parsedPaper = JSON.parse(paperQuery);
        setPaper(parsedPaper);
      } catch (error) {
        console.error("Failed to parse paper data:", error);
        setPaper(null);
      }
    } else {
      setPaper(null);
    }
  }, [router.isReady, paperQuery]);

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
