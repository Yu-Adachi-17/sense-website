// src/components/MinutesList.jsx
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { RxArrowLeft } from 'react-icons/rx';

// ユーザーの議事録データ1件の表示コンポーネント
const PaperItem = ({ paper }) => {
  // createdAt は Firestore の Timestamp 型の場合、toDate() で Date 型に変換可能
  const createdDate = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  // 日付のフォーマット（例：2025-02-04）
  const dateString = createdDate.toLocaleDateString();

  // 議事録の本文（assistantResponseContent）を最大15文字で表示（長い場合は末尾に "…" を付与）
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

  // Firestore から現在ログイン中のユーザーの議事録（meetingRecords コレクション）を取得
  useEffect(() => {
    if (!auth.currentUser) {
      console.error('ユーザーがログインしていません');
      return;
    }

    const q = query(
      collection(db, 'meetingRecords'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPapers = [];
      querySnapshot.forEach((doc) => {
        // Firestore に保存したフィールドはそのまま利用
        fetchedPapers.push({ id: doc.id, ...doc.data() });
      });
      setPapers(fetchedPapers);
    }, (error) => {
      console.error("Firestore からの取得に失敗:", error);
    });

    return () => unsubscribe();
  }, []);

  // 検索テキストに応じてフィルタリング
  const filteredPapers = papers.filter((paper) =>
    paper.minutes.toLowerCase().includes(searchText.toLowerCase())
  );

  // 日付ごとにグループ化
  const groupedPapers = filteredPapers.reduce((groups, paper) => {
    // createdAt が Firestore の Timestamp 型の場合は toDate() する
    const date = paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
    const key = date.toLocaleDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(paper);
    return groups;
  }, {});

  // 日付キーを降順にソート（最新の日付順）
  const sortedDateKeys = Object.keys(groupedPapers).sort((a, b) => new Date(b) - new Date(a));

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

      {/* グループごとに議事録カードを表示 */}
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
                // 並び順は createdAt の降順
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
