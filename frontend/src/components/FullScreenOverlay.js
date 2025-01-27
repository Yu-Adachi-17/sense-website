// src/components/FullScreenOverlay.js
import React, { useState, useEffect } from 'react';
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy } from "react-icons/fa";

const FullScreenOverlay = ({
  setShowFullScreen,
  isExpanded,
  setIsExpanded,
  transcription,
  minutes,
  audioURL,
}) => {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 画面サイズの変更を監視
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 音声データのダウンロード処理
  const handleDownload = () => {
    if (audioURL) {
      const link = document.createElement('a');
      link.href = audioURL;
      link.download = '議事録音声データ.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('ダウンロード可能な音声データがありません。');
    }
  };

  // 全文と議事録の表示を切り替える処理
  const handleSwitchView = () => {
    setIsExpanded(!isExpanded);
    setShowSideMenu(false); // サイドメニューを閉じる
  };

  // 議事録表示に切り替える処理
  const handleSwitchToMinutes = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setShowSideMenu(false);
    }
  };

  // 議事録または全文をクリップボードにコピーする処理
  const handleShare = () => {
    const content = isExpanded ? transcription : minutes; // 表示中の内容を取得

    // クリップボードにコピー
    navigator.clipboard.writeText(content).then(() => {
      alert('クリップボードにコピーしました！');
    }).catch(() => {
      alert('クリップボードへのコピーに失敗しました。');
    });
  };

  // サイドメニュー内のクリックがオーバーレイに伝わらないようにする
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // スタイル定義
  const styles = {
    fullScreenOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      opacity: 1,
      transform: 'translateY(0)',
      zIndex: 1000,
      pointerEvents: 'auto',
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      left: '30px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
    },
    hamburgerButton: {
      position: 'absolute',
      top: '20px',
      right: '30px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
      zIndex: 1300,
    },
    shareButton: {
      position: 'absolute',
      top: '7px', // グレーボックスの上部からの距離
      right: '20px', // グレーボックスの右端からの距離
      fontSize: '20px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
      zIndex: 1300,
    },
    fullScreenContent: {
      width: '90%',
      height: '85%',
      overflowY: 'auto',
      backgroundColor: '#222222',
      padding: '20px',
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      textAlign: 'left',
      transition: 'max-height 0.5s ease',
      marginBottom: '20px',
      position: 'relative', // 追加
    },
    summaryText: {
      maxHeight: 'none',
      overflowY: 'auto',
    },
    fullText: {
      maxHeight: 'none',
      overflowY: 'auto',
    },
    title: {
      marginBottom: '20px',
      paddingTop: '20px',
      marginLeft: '-75%',
      fontSize: '30px',
      fontWeight: 'bold',
    },
    sideMenuOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1100,
      display: showSideMenu ? 'block' : 'none',
      transition: 'opacity 0.5s ease',
      opacity: showSideMenu ? 1 : 0,
    },
    sideMenu: {
      position: 'fixed',
      top: 0,
      right: 0,
      width: isMobile ? '66.66%' : '33%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: '#FFF',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      zIndex: 1200,
      transform: showSideMenu ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.5s ease-out',
    },
    sideMenuButton: {
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      fontSize: '24px',
      cursor: 'pointer',
      margin: '10px 0',
      display: 'flex',
      alignItems: 'center',
      fontWeight: 'bold',
    },
    sideMenuClose: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
    },
    iconSpacing: {
      marginLeft: '10px',
      fontWeight: 'bold',
      fontSize: '16px',
    },
  };

  return (
    <>
      <div style={styles.fullScreenOverlay}>
        {/* 閉じるボタン */}
        <button style={styles.closeButton} onClick={() => setShowFullScreen(false)}>
          &times;
        </button>

        {/* ハンバーガーメニュー */}
        <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
          <GiHamburgerMenu size={24} />
        </button>

        {/* タイトルの表示 */}
        <h2 style={styles.title}>
          {isExpanded ? '全文' : '議事録'}
        </h2>

        {/* テキスト描写範囲ボックス */}
        <div
          style={{
            ...styles.fullScreenContent,
            ...(isExpanded ? styles.fullText : styles.summaryText),
          }}
        >
          {/* シェアボタン */}
          <button style={styles.shareButton} onClick={handleShare}>
            <FaRegCopy size={20} />
          </button>

          {/* 議事録または全文の表示 */}
          <p>{isExpanded ? transcription : minutes}</p>
        </div>
      </div>

      {/* サイドメニューオーバーレイ */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          {/* サイドメニュー */}
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* 全文と議事録の切り替えボタン */}
            {!isExpanded ? (
              <button style={styles.sideMenuButton} onClick={handleSwitchView}>
                <TbClipboardText size={24} />
                <span style={styles.iconSpacing}>全文を表示</span>
              </button>
            ) : (
              <button style={styles.sideMenuButton} onClick={handleSwitchToMinutes}>
                <TbClipboardList size={24} />
                <span style={styles.iconSpacing}>議事録を表示</span>
              </button>
            )}

            {/* 音声データのダウンロードボタン */}
            <button style={styles.sideMenuButton} onClick={handleDownload}>
              <IoIosDownload size={24} />
              <span style={styles.iconSpacing}>音声データをダウンロード</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FullScreenOverlay;
