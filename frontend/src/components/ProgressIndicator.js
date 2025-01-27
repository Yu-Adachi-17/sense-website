// src/components/ProgressIndicator.js
import React from 'react';

const ProgressIndicator = ({ progress }) => {
  const styles = {
    progressOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', // 半透明の黒
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    progressCircle: {
      position: 'relative',
      width: '150px',
      height: '150px',
    },
    progressSvg: {
      transform: 'rotate(-90deg)',
      width: '150px',
      height: '150px',
    },
    progressBackground: {
      fill: 'none',
      stroke: '#555555',
      strokeWidth: '10',
    },
    progressBar: {
      fill: 'none',
      stroke: 'url(#progress-gradient)',
      strokeWidth: '10',
      strokeLinecap: 'round',
      transition: 'stroke-dashoffset 0.5s ease',
    },
    progressText: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '35px',
      fontWeight: 'bold',
      fontFamily: 'Impact, sans-serif',
      color: '#FFFFFF',
    },
    progressLabel: {
      marginTop: '10px',
      color: '#FFFFFF',
      fontSize: '18px',
    },
  };

  return (
    <div style={styles.progressOverlay}>
      <div style={styles.progressCircle}>
        <svg style={styles.progressSvg}>
          <defs>
            <linearGradient id="progress-gradient" gradientTransform="rotate(90)">
              <stop offset="0%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <circle
            style={styles.progressBackground}
            cx="75"
            cy="75"
            r="60"
          />
          <circle
            style={styles.progressBar}
            cx="75"
            cy="75"
            r="60"
            strokeDasharray={2 * Math.PI * 60}
            strokeDashoffset={2 * Math.PI * 60 * (1 - progress / 100)}
          />
        </svg>
        <div style={styles.progressText}>{Math.min(Math.floor(progress), 100)}%</div>
      </div>
      <div style={styles.progressLabel}>議事録を生成しています...</div>
    </div>
  );
};

export default ProgressIndicator;

