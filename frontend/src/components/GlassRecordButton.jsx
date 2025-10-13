import React from "react";

export default function GlassRecordButton({ isRecording, audioLevel, onClick, size = 420 }) {
  const [ripples, setRipples] = React.useState([]);
  const rafRef = React.useRef(null);
  const lastRef = React.useRef(0);
  const emitAccRef = React.useRef(0);
  const idRef = React.useRef(0);
  const activityRef = React.useRef(0);
  const reduceMotionRef = React.useRef(false);

  const DEAD_ZONE = 0.02;
  const SENSITIVITY = 1.35;
  const lvl = Math.max(1, Math.min(audioLevel ?? 1, 2));
  const norm = Math.max(0, lvl - 1 - DEAD_ZONE);
  const activity = Math.min(1, (norm / (1 - DEAD_ZONE)) * SENSITIVITY);
  React.useEffect(() => { activityRef.current = activity; }, [activity, audioLevel]);

  const lerp = (a, b, t) => a + (b - a) * t;

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      reduceMotionRef.current =
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;
    }
    if (!isRecording || reduceMotionRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
      emitAccRef.current = 0;
      return;
    }

    const tick = (t) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;

      const act = activityRef.current;
      const pulsesPerSec = act <= 0 ? 0 : lerp(0.6, 3.0, act);
      emitAccRef.current += dt * pulsesPerSec;

      const w = typeof window !== 'undefined' ? window.innerWidth  : size;
      const h = typeof window !== 'undefined' ? window.innerHeight : size;
      const diag = Math.hypot(w, h);
      const farScale = Math.max(4, (diag / size) * 1.1);

      const baseOpacity = lerp(0.55, 0.92, act);
      const baseLife    = lerp(1700, 900, act);
      const life = Math.round(baseLife * (farScale / 3.4));

      while (emitAccRef.current >= 1) {
        emitAccRef.current -= 1;
        setRipples((prev) => {
          const id = idRef.current++;
          const next = [...prev, { id, farScale, baseOpacity, life }];
          return next.length > 10 ? next.slice(-10) : next;
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); rafRef.current = null; };
  }, [isRecording, size]);

  const handleEnd = (id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="recordWrap" style={{ width: size, height: size }} aria-live="polite">
      {isRecording && !reduceMotionRef.current && (
        <div className="ripples" aria-hidden="true">
          {ripples.map((r) => (
            <span
              key={r.id}
              className="ring"
              onAnimationEnd={() => handleEnd(r.id)}
              style={{
                '--farScale': r.farScale,
                '--baseOpacity': r.baseOpacity,
                '--duration': `${r.life}ms`,
              }}
            />
          ))}
        </div>
      )}

      <button
        onClick={onClick}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={`neuBtn ${isRecording ? 'recording' : ''}`}
        style={{ width: size, height: size }}
      />

      <style jsx>{`
        .recordWrap { position: relative; display: inline-block; overflow: visible; isolation: isolate;
          --ripple-color: rgba(255, 92, 125, 0.86); --ripple-glow: rgba(255,72,96,0.34); }
        .ripples { position: absolute; inset: 0; pointer-events: none; overflow: visible;
          filter: drop-shadow(0 0 28px var(--ripple-glow)); transform: translateZ(0); }
        .ring { position: absolute; left: 50%; top: 50%; width: 100%; height: 100%; border-radius: 9999px;
          border: 3px solid var(--ripple-color); transform: translate(-50%, -50%) scale(1); opacity: 0;
          backface-visibility: hidden; contain: paint; animation: ripple var(--duration) linear forwards;
          mix-blend-mode: screen; }
        @keyframes ripple { 0%{ transform: translate(-50%,-50%) scale(1); opacity: var(--baseOpacity);}
                            100%{ transform: translate(-50%,-50%) scale(var(--farScale)); opacity:0;} }
        .neuBtn { position: relative; border: none; border-radius: 9999px; padding: 0; cursor: pointer; overflow: hidden; outline: none;
          background: radial-gradient(140% 140% at 50% 35%, rgba(255,82,110,0.26), rgba(255,82,110,0) 60%),
                      linear-gradient(180deg, rgba(255,120,136,0.42), rgba(255,90,120,0.36)), #ffe9ee;
          box-shadow: -4px -4px 8px rgba(255,255,255,0.9), 6px 10px 16px rgba(0,0,0,0.12), 0 34px 110px rgba(255,64,116,0.30);
          border: 1px solid rgba(255,255,255,0.7); filter: saturate(120%); transform: translateZ(0); }
        .neuBtn::after { content: ''; position: absolute; inset: 0; border-radius: 9999px; border: 8px solid rgba(255,72,96,0.10);
          filter: blur(6px); transform: translateY(2px); pointer-events: none;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%);
                  mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 100%); }
        .neuBtn.recording { animation: none; }
        @media (prefers-reduced-motion: reduce) { .ripples { display: none; } }
      `}</style>
    </div>
  );
}
