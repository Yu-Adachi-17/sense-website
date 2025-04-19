// pages/timely/[id].js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../src/lib/firebaseConfig' // 適宜調整

export default function TimelyViewPage() {
  const router = useRouter()
  const { id } = router.query
  const [transcript, setTranscript] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!router.isReady || !id) return;

    const fetchData = async () => {
      try {
        const ref = doc(db, 'timelyNotes', id)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setTranscript(snap.data().transcript || '')
          setUpdatedAt(snap.data().updatedAt?.toDate().toISOString() || '')
        } else {
          setTranscript(null)
        }
      } catch (e) {
        console.error('Fetch error', e)
        setTranscript(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router.isReady, id])

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!transcript) return <div style={{ padding: 40 }}>議事録が存在しません。</div>

  return (
    <div style={{ padding: 40 }}>
      <h1>📋 タイムリー議事録</h1>
      <p><strong>最終更新:</strong> {updatedAt}</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f2f2f2', padding: '1rem', borderRadius: '8px' }}>
        {transcript}
      </pre>
    </div>
  )
}
