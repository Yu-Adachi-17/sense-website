// // frontend/src/pages/zoom/oauth/callback.js
// export default function ZoomOAuthCallback() {
//   const REDIRECT_URI = "https://sense-ai.world/zoom/oauth/callback";

//   if (typeof window !== 'undefined') {
//     const p = new URLSearchParams(window.location.search);
//     const code  = p.get('code');
//     const state = p.get('state'); // ← 後述のstart側で発行・検証する

//     (async () => {
//       try {
//         if (!code) throw new Error('missing code');
//         const r = await fetch('https://sense-website-production.up.railway.app/api/zoom/oauth/exchange', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           credentials: 'include',
//           body: JSON.stringify({ code, redirectUri: REDIRECT_URI, state }),
//         });
//         const data = await r.json();
//         if (!r.ok || !data.ok) throw new Error(data?.detail || data?.error || 'exchange failed');

//         // 成功後にアプリ内へ
//         window.location.replace('/minutes/dashboard');
//       } catch (e) {
//         console.error('OAuth exchange error:', e);
//         document.getElementById('status')?.replaceChildren('Authorization failed. Please retry.');
//       }
//     })();
//   }

//   return (
//     <main style={{padding:20,fontFamily:'system-ui'}}>
//       <h1>Authorization complete</h1>
//       <p id="status">Finalizing…</p>
//     </main>
//   );
// }
