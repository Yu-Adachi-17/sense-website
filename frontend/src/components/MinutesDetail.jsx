// src/components/MinutesDetail.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FullScreenOverlay from './FullScreenOverlay';

const MinutesDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { paper } = location.state || {};

  // FullScreenOverlay で全文表示切替用の state
  const [isExpanded, setIsExpanded] = useState(false);

  // paper がない場合にリスト画面へ戻す処理を useEffect 内で実行
  useEffect(() => {
    if (!paper) {
      navigate('/minutes-list');
    }
  }, [paper, navigate]);

  // paper が null の場合は何も表示しない（リダイレクトを待つ）
  if (!paper) return null;

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
