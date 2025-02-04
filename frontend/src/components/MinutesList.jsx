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
    paper.minutes.length <= 15 ? paper.minutes : paper.minutes.slice(0, 15) + '…';

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
      <div style={{ fontSize: 12, marginBottom: 5 }}>{dateString}</div>
      <div style={{ fontWeight: 'bold' }}>{truncatedText}</div>
    </div>
  );
};

const MinutesList = () => {
  const [papers, setPapers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // onAuthStateChanged を利用して、ユーザーの認証状態を監視
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🟢 [DEBUG] ユーザーがログインしています:", user.uid);

        // Firestore のクエリを作成
        const q = query(
          collection(db, 'meetingRecords'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const unsubscribeSnapshot = onSnapshot(
          q,
          (querySnapshot) => {
            console.log("🟢 [DEBUG] Snapshot 取得, 件数:", querySnapshot.size);
            const fetchedPapers = [];
            querySnapshot.forEach((doc) => {
              console.log("🟢 [DEBUG] ドキュメント取得:", doc.id, doc.data());
              fetchedPapers.push({ id: doc.id, ...doc.data() });
            });
            setPapers(fetchedPapers);
          },
          (error) => {
            console.error("🔴 [ERROR] Firestore からの取得に失敗:", error);
          }
        );

        // ユーザーがログインしている場合は、Firestore のリスナーの unsubscribe を返す
        return () => unsubscribeSnapshot();
      } else {
        console.log("🔴 [DEBUG] ユーザーがログインしていません");
      }
    });

    // onAuthStateChanged のリスナーもクリーンアップ
    return () => unsubscribeAuth();
  }, []);

  // 検索フィールドでフィルタリング
  const filteredPapers = papers.filter((paper) =>
    paper.minutes.toLowerCase().includes(searchText.toLowerCase())
  );

  // 日付でグループ化（シンプルな例）
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
      {/* ヘッダー部分：戻るボタン */}
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
        <h2>My Minutes</h2>
      </div>

      {/* 検索フィールド */}
      <div style={{ marginBottom: 20 }}>
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
            fontSize: 16
          }}
        />
      </div>

      {/* グループごとの表示 */}
      {sortedDateKeys.map((dateKey) => (
        <div key={dateKey} style={{ marginBottom: 30 }}>
          <h3 style={{ borderBottom: '1px solid #555', paddingBottom: 5 }}>{dateKey}</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 15,
              marginTop: 10
            }}
          >
            {groupedPapers[dateKey]
              .sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
                return dateB - dateA;
              })
              .map((paper) => (
                <PaperItem key={paper.id} paper={paper} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MinutesList;
