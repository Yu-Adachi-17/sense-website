 // src/pages/minutes/[id].js
 import React, { useEffect, useRef, useState } from 'react';
 import dynamic from 'next/dynamic';
 import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

 const FullScreenOverlay = dynamic(() => import('../fullscreenoverlay'), { ssr: false });

 export default function MinutesDetailPage() {
   const router = useRouter();
  const { t } = useTranslation('common');  // ← 追加（このページで t を作る）

   const { id: rawId } = router.query || {};
   const id = Array.isArray(rawId) ? rawId[0] : rawId;

   const [paper, setPaper] = useState(undefined);
   const [isExpanded, setIsExpanded] = useState(false);
   const unsubRef = useRef(null);

   useEffect(() => {
     if (!router.isReady || !id) return;
     let cancelled = false;

     (async () => {
       try {
         const { getDb } = await import('../../firebaseConfig');
         const db = await getDb();
         if (!db) throw new Error('Firestore not initialized on client (db is null).');

         const { doc, getDoc, onSnapshot } = await import('firebase/firestore');
         const ref = doc(db, 'meetingRecords', String(id));

         const snapOnce = await getDoc(ref);
         if (!cancelled) setPaper(snapOnce.exists() ? { id: snapOnce.id, ...snapOnce.data() } : null);

         unsubRef.current = onSnapshot(
           ref,
           (snap) => {
             if (cancelled) return;
             setPaper(snap.exists() ? { id: snap.id, ...snap.data() } : null);
           },
           (err) => { console.error('onSnapshot error:', err); }
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

   if (paper === undefined) return null;
   if (paper === null) {
     if (typeof window !== 'undefined') router.replace('/minutes-list');
     return null;
   }

   return (
     <FullScreenOverlay
       setShowFullScreen={handleClose}
       isExpanded={isExpanded}
       setIsExpanded={setIsExpanded}
       transcription={paper.transcription || ''}
       minutes={paper.minutes || ''}
       audioURL={paper.audioURL || ''}
       docId={paper.id}
      i18nT={t}                 // ← 追加：Overlay に t を渡す
      i18nNs="common"           // ← （任意）名前空間。省略時は 'common' でもOK
     />
   );
 }

// ★ このページでも 'common' を preload しておく
export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
