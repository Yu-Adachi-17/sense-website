// frontend/src/pages/zoom/oauth/callback.js
export default function ZoomOAuthCallback() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      console.log('Zoom OAuth callback:', { code, state });
    }
    return (
      <main style={{padding:20,fontFamily:'system-ui'}}>
        <h1>Authorization complete</h1>
        <p>You may close this window.</p>
      </main>
    );
  }
  