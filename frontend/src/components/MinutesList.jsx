// src/components/MinutesList.jsx
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { RxArrowLeft } from 'react-icons/rx';

const PaperItem = ({ paper }) => {
  const createdDate =
    paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  const dateString = createdDate.toLocaleDateString();
  const truncatedText =
    paper.minutes.length <= 100 ? paper.minutes : paper.minutes.slice(0, 100) + '…';

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        borderRadius: 10,
        padding: 10,
        color: 'white',
        textAlign: 'center',
        cursor: 'pointer'
      }}
    >
      
      <div style={{ fontWeight: 'bold' }}>{truncatedText}</div>
    </div>
  );
};

const MinutesList = () => {
  const [papers, setPapers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🟡 [DEBUG] MinutesList がマウントされました");

    // Firebase 認証状態を監視
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🟢 [DEBUG] ログインユーザー:", user.uid);

        // Firestore クエリを作成
        const q = query(
          collection(db, 'meetingRecords'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        console.log("🟡 [DEBUG] Firestore クエリを実行します");

        // Firestore のリアルタイムリスナーを設定
        const unsubscribeSnapshot = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`🟢 [DEBUG] Firestore から ${querySnapshot.size} 件のデータを取得`);
            const fetchedPapers = [];
            querySnapshot.forEach((doc) => {
              console.log("🟢 [DEBUG] 取得したドキュメント:", doc.id, doc.data());
              fetchedPapers.push({ id: doc.id, ...doc.data() });
            });

            if (fetchedPapers.length === 0) {
              console.warn("⚠️ [WARNING] Firestore にはデータがありません");
            }

            setPapers(fetchedPapers);
          },
          (error) => {
            console.error("🔴 [ERROR] Firestore からの取得に失敗:", error);
          }
        );

        return () => {
          console.log("🟡 [DEBUG] Firestore リスナーを解除");
          unsubscribeSnapshot();
        };
      } else {
        console.warn("⚠️ [WARNING] ユーザーがログインしていません");
      }
    });

    return () => {
      console.log("🟡 [DEBUG] onAuthStateChanged のリスナーを解除");
      unsubscribeAuth();
    };
  }, []);

  // 検索フィルタリング
  const filteredPapers = papers.filter((paper) =>
    paper.minutes.toLowerCase().includes(searchText.toLowerCase())
  );

  // 日付ごとにグループ化
  const groupedPapers = filteredPapers.reduce((groups, paper) => {
    const date = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
    const key = date.toLocaleDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(paper);
    return groups;
  }, {});

  const sortedDateKeys = Object.keys(groupedPapers).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: 20, color: 'white' }}>
      {/* ヘッダー部分 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 24,
            cursor: 'pointer',
            marginRight: 10
          }}
        >
          <RxArrowLeft />
        </button>
        <h2></h2>
      </div>

{/* 検索フィールド */}
<div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
  <input
    type="text"
    placeholder="Search..."
    value={searchText}
    onChange={(e) => setSearchText(e.target.value)}
    style={{
      width: '100%',
      padding: 10,
      borderRadius: 8,
      border: 'none',
      fontSize: 16,
      backgroundColor: '#1e1e1e',  // 各議事録アイテムと同じ黒に近いグレー
      color: 'white',              // 入力文字色を白
      outline: 'none',             // フォーカス時の青枠を削除（任意）
      textAlign: 'left'            // 入力文字は左揃え（中央揃えしたい場合は 'center'）
    }}
  />
</div>


{/* 議事録の一覧表示 */}
{sortedDateKeys.length === 0 ? (
  <p style={{ color: 'gray', textAlign: 'center' }}>議事録がありません</p>
) : (
  sortedDateKeys.map((dateKey) => (
    <div key={dateKey} style={{ marginBottom: 30 }}>
      <h3 style={{ borderBottom: '1px solid #555', paddingBottom: 5 }}>{dateKey}</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 15,
          marginTop: 10,
          maxWidth: 'calc(4 * 140px)',  // 最大4列になるように制限（120px + gap）
          margin: '0 auto'  // 中央揃え
        }}
      >
        {groupedPapers[dateKey].map((paper) => (
          <PaperItem key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  ))
)}

    </div>
  );
};

export default MinutesList;
