// frontend/src/pages/m/[id].js
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://sense-website-production.up.railway.app';

export default function MeetingJoinPage() {
  const router = useRouter();
  const { id } = router.query; // /m/:id
  const [meeting, setMeeting] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle|loading|connected|error
  const roomRef = useRef(null);

  // 1) 会議情報を取得（roomName を解決）
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/meetings/${id}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setMeeting(json); // { id, roomName, joinUrl, ... }
      } catch (e) {
        console.error('fetch meeting failed', e);
        setStatus('error');
      }
    })();
  }, [id]);

  // 2) 参加処理
  const join = async () => {
    if (!meeting) return;
    try {
      setStatus('loading');

      // トークンをサーバ発行
      const body = {
        roomName: meeting.roomName,
        identity: crypto.randomUUID(),
        name: name || 'Guest'
      };
      const tokRes = await fetch(`${API_BASE}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());

      if (tokRes.error) throw new Error(tokRes.error);
      const { token, wsUrl } = tokRes; // ← これで Room.connect

      // NextのSSR回避：ブラウザでのみSDKを読み込む
      const { Room } = await import('livekit-client');

      const room = new Room();
      roomRef.current = room;

      // 接続
      await room.connect(wsUrl, token); // ← docsの基本手順
      console.log('connected to room', room.name);

      // 音声のみ運用ならマイクだけ。映像も必要なら setCameraEnabled(true)
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus('connected');

      // 参加者のスピーカー表示など任意（active speaker等はSDKのハンドラ参照）
      room.on('participantConnected', (p) => console.log('participant joined:', p.identity));
      room.on('participantDisconnected', (p) => console.log('participant left:', p.identity));
      room.on('disconnected', () => setStatus('idle'));
    } catch (e) {
      console.error('join failed', e);
      setStatus('error');
    }
  };

  const leave = async () => {
    try {
      await roomRef.current?.disconnect();
    } finally {
      roomRef.current = null;
      setStatus('idle');
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h2>Join meeting</h2>
      {!meeting && <p>Loading meeting...</p>}
      {meeting && status !== 'connected' && (
        <>
          <p><b>Room:</b> {meeting.roomName}</p>
          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ padding: 8, marginRight: 8 }}
          />
          <button onClick={join} disabled={status === 'loading'}>
            {status === 'loading' ? 'Joining...' : 'Join'}
          </button>
        </>
      )}

      {status === 'connected' && (
        <>
          <p>Connected to <b>{meeting?.roomName}</b></p>
          <button onClick={leave}>Leave</button>
        </>
      )}

      {status === 'error' && <p style={{ color: 'crimson' }}>Failed to join. Check console.</p>}
    </div>
  );
}
