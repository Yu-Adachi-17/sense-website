// 署名はサーバーで生成し、ここへ埋め込む or fetch する実装でもOK
import { useEffect } from 'react'
export default function PuppetJoin() {
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(location.search)
      const mn   = params.get('mn')!
      const name = params.get('name') || 'MinutesAI Bot'
      // サーバー側 API で署名を発行（role:0）
      const sigRes = await fetch(`/api/zoom-signature?mn=${encodeURIComponent(mn)}&role=0`)
      const { signature, sdkKey } = await sigRes.json()

      // Zoom Web SDK Client View の init → join
      // https://developers.zoom.us/docs/meeting-sdk/web/client-view/error-codes/
      // ※ v2.13+ 系を想定（WASM 版）
      // eslint-disable-next-line
      const client = (window as any).ZoomMtgEmbedded.createClient()
      const root = document.getElementById('zmmtg-root')!
      client.init({ root, zoomAppRoot: root }).then(() => {
        client.join({
          sdkKey,
          signature,
          meetingNumber: mn,
          userName: name,
          password: '' // パスコードは不要でも可（招待URLで入れる場合は別処理）
        }).then(() => {
          ;(window as any).__ZOOM_JOINED__ = true
          // 以降は放置で OK（音声は Chrome→PulseAudio→FFmpeg で収録）
        })
      })
    })()
  }, [])
  return <div id="zmmtg-root" style={{width:'1280px',height:'720px'}}/>
}
