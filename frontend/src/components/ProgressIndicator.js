import React, { useState, useEffect } from 'react';

const ProgressIndicator = ({ progress }) => {
  // 親から渡された progress をスムーズにアニメーションさせるための内部 state
  const [internalProgress, setInternalProgress] = useState(progress);

  useEffect(() => {
    // progress が変わったら、内部状態をアニメーションで更新
    const duration = 500; // アニメーション時間（ミリ秒）
    const stepTime = 20;  // 補間の更新間隔
    const steps = duration / stepTime;
    const progressDiff = progress - internalProgress;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      // 線形補間
      const newProgress = internalProgress + (progressDiff * currentStep) / steps;
      setInternalProgress(newProgress);
      
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepTime);
    
    return () => clearInterval(interval);
  }, [progress]);

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
    boldText: {
      fontWeight: 'bold',
    },
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(internalProgress, 100) / 100);

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
            r={radius}
          />
          <circle
            style={styles.progressBar}
            cx="75"
            cy="75"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div style={styles.progressText}>{Math.min(Math.floor(internalProgress), 100)}%</div>
      </div>
      <div style={styles.progressLabel}>
        <span style={styles.boldText}>
          Taking minutes takes about 3 minutes for a 30-minute meeting...
        </span>
      </div>
    </div>
  );
};

export default ProgressIndicator;
