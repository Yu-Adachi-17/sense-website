// src/components/MinutesDetail.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullScreenOverlay from './FullScreenOverlay';

const MinutesDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { paper } = location.state || {};

  // 万が一 paper が存在しない場合はリスト画面へ戻す
  if (!paper) {
    navigate('/minutes-list');
    return null;
  }

  // FullScreenOverlay で全文表示切替用の state
  const [isExpanded, setIsExpanded] = useState(false);

  // FullScreenOverlay の閉じる処理（閉じると前の画面に戻る）
  const handleClose = () => {
    navigate(-1);
  };

  return (
    <FullScreenOverlay
      setShowFullScreen={handleClose}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      transcription={paper.transcription || ''}
      minutes={paper.minutes || ''}
      audioURL={paper.audioURL || ''}
    />
  );
};

export default MinutesDetail;
