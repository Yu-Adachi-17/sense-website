// src/pages/minutes/[id].js
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// FullScreenOverlay はブラウザ API に触れる可能性があるので SSR を無効化
// 参考: Next.js の dynamic import + ssr:false（ブラウザ依存コンポーネント）
// https://nextjs.org/docs/pages/guides/lazy-loading
const FullScreenOverlay = dynamic(() => import('../fullscreenoverlay'), { ssr: false });

export default function MinutesDetailPage() {
  const router = useRouter();
  const { id: rawId } = router.query || {};
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // undefined=読み込み中, null=見つからず, object=OK
  const [paper, setPaper] = useState(undefined);
  const [isExpanded, setIsExpanded] = useState(false);

  // onSnapshot のクリーンアップ保持
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !id) return; // isReady は useEffect 内で使う（Next.js 推奨）
    // 参考: router.isReady の使い方
    // https://github.com/vercel/next.js/discussions/33293

    let cancelled = false;

    (async () => {
      try {
        // ★ Firestore はクライアント側でだけ import/実行（SSRに載せない）
        //   minutes/[id].js → 「2つ上」に戻るのが正しい相対パス
        const { getDb } = await import('../../firebaseConfig');
        const db = await getDb();
        if (!db) throw new Error('Firestore not initialized on client (db is null).');

        // ★ ドキュメント取得は collection(...) ではなく doc(...) を使う
        // 参考: Web v9 modular API: doc() + getDoc()
        // https://firebase.google.com/docs/firestore/query-data/get-data
        const { doc, getDoc, onSnapshot } = await import('firebase/firestore');
        const ref = doc(db, 'meetingRecords', String(id));

        // 1回取得（キャッシュ or サーバ）→ state 反映
        const snapOnce = await getDoc(ref);
        if (!cancelled) setPaper(snapOnce.exists() ? { id: snapOnce.id, ...snapOnce.data() } : null);

        // ライブ反映（必要なければ onSnapshot を外してもOK）
        unsubRef.current = onSnapshot(
          ref,
          (snap) => {
            if (cancelled) return;
            setPaper(snap.exists() ? { id: snap.id, ...snap.data() } : null);
          },
          (err) => {
            console.error('onSnapshot error:', err);
          }
        );
      } catch (err) {
        console.error('MinutesDetail fetch error:', err);
        if (!cancelled) setPaper(null);
      }
    })();

    return () => {
      cancelled = true;
      const unsub = unsubRef.current;
      unsubRef.current = null;
      if (typeof unsub === 'function') unsub();
    };
  }, [router.isReady, id]);

  const handleClose = () => router.back();

  // 初期レンダリングでは何も描かない（SSR での不整合回避）
  if (paper === undefined) return null;

  // 見つからなければ一覧へ戻す（クライアント側で置換）
  if (paper === null) {
    if (typeof window !== 'undefined') router.replace('/minutes-list');
    return null;
  }

  // FullScreenOverlay に既存 props をそのまま継承
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
