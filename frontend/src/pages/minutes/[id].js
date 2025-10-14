// src/pages/minutes/[id].js
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

// FullScreenOverlay はブラウザ API に触れる可能性があるので SSR を無効化
const FullScreenOverlay = dynamic(() => import('../fullscreenoverlay'), { ssr: false });

export default function MinutesDetailPage() {
  const router = useRouter();
  const { t } = useTranslation('common'); // ← i18n t を取得

  const { id: rawId } = router.query || {};
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  // undefined=読み込み中, null=見つからず, object=OK
  const [paper, setPaper] = useState(undefined);
  const [isExpanded, setIsExpanded] = useState(false);

  // onSnapshot のクリーンアップ保持
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !id) return; // isReady は useEffect 内で使う（Next.js 推奨）

    let cancelled = false;

    (async () => {
      try {
        // Firestore はクライアント側でだけ import/実行（SSRに載せない）
        const { getDb } = await import('../../firebaseConfig');
        const db = await getDb();
        if (!db) throw new Error('Firestore not initialized on client (db is null).');

        // ドキュメント取得は doc() を使用
        const { doc, getDoc, onSnapshot } = await import('firebase/firestore');
        const ref = doc(db, 'meetingRecords', String(id));

        // 1回取得（キャッシュ or サーバ）→ state 反映
        const snapOnce = await getDoc(ref);
        if (!cancelled) setPaper(snapOnce.exists() ? { id: snapOnce.id, ...snapOnce.data() } : null);

        // ライブ反映
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

  // FullScreenOverlay に既存 props をそのまま継承 + t を渡す
  return (
    <FullScreenOverlay
      setShowFullScreen={handleClose}
      isExpanded={isExpanded}
      setIsExpanded={setIsExpanded}
      transcription={paper.transcription || ''}
      minutes={paper.minutes || ''}
      audioURL={paper.audioURL || ''}
      docId={paper.id}
      i18nT={t}          // ← 追加：Overlay に t を渡す
      i18nNs="common"    // ← 任意：名前空間
    />
  );
}

// ★ 動的ページなので SSG ではなく SSR で翻訳を供給する
export async function getServerSideProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
