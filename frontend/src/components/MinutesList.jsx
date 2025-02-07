// src/components/MinutesList.jsx
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { RxArrowLeft } from 'react-icons/rx';

// 議事録項目コンポーネント（選択モード対応版）
const PaperItem = ({ paper, selectionMode, isSelected, toggleSelect }) => {
  const navigate = useNavigate();

  const createdDate =
    paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  const truncatedText =
    paper.minutes.length <= 100 ? paper.minutes : paper.minutes.slice(0, 100) + '…';

  // 選択モードの場合は選択状態を切り替え、通常時は詳細画面へ遷移
  const handleClick = () => {
    if (selectionMode) {
      toggleSelect(paper.id);
    } else {
      navigate(`/minutes/${paper.id}`, { state: { paper } });
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: isSelected ? '#555' : '#1e1e1e',
        border: isSelected ? '2px solid red' : 'none',
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
  // 選択モードと選択済みの議事録IDの管理
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🟡 [DEBUG] MinutesList がマウントされました");

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🟢 [DEBUG] ログインユーザー:", user.uid);

        const q = query(
          collection(db, 'meetingRecords'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        console.log("🟡 [DEBUG] Firestore クエリを実行します");

        const unsubscribeSnapshot = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`🟢 [DEBUG] Firestore から ${querySnapshot.size} 件のデータを取得`);
            const fetchedPapers = [];
            querySnapshot.forEach((docSnapshot) => {
              console.log("🟢 [DEBUG] 取得したドキュメント:", docSnapshot.id, docSnapshot.data());
              fetchedPapers.push({ id: docSnapshot.id, ...docSnapshot.data() });
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

  // 議事録選択のトグル処理
  const toggleSelect = (id) => {
    setSelectedIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((item) => item !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // 削除処理（確認アラート経由）
  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert("削除する議事録を選択してください。");
      return;
    }
    const confirmed = window.confirm("削除しますか？この動作は戻せません");
    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'meetingRecords', id));
      }
      // 削除後は選択状態をリセットし、選択モードを解除
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error("削除中にエラーが発生しました", error);
      alert("削除中にエラーが発生しました");
    }
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: 20, color: 'white' }}>
      {/* ヘッダー部分 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
          <h2>議事録一覧</h2>
        </div>
        <div>
          {selectionMode ? (
            <>
              <button
                onClick={() => {
                  // キャンセル時は選択状態をリセットし、選択モードを解除
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
                style={{
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 4,
                  marginRight: 10,
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#ff4d4d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                削除する
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              選択
            </button>
          )}
        </div>
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
            backgroundColor: '#1e1e1e',
            color: 'white',
            outline: 'none',
            textAlign: 'left'
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(23vw, 23vw))',
                gap: 15,
                marginTop: 10,
                justifyContent: 'start'
              }}
            >
              {groupedPapers[dateKey].map((paper) => (
                <PaperItem
                  key={paper.id}
                  paper={paper}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.includes(paper.id)}
                  toggleSelect={toggleSelect}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MinutesList;
