import React, { useState, useEffect, useRef } from 'react';
import defaultMeetingFormats from './MeetingFormatElements';

const MeetingFormatsList = () => {
  // State 管理
  const [formats, setFormats] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [editingFormat, setEditingFormat] = useState(null); // 現在編集中のフォーマット
  const [editingText, setEditingText] = useState('');         // 編集用テキスト
  const [selectionMode, setSelectionMode] = useState(false);    // 選択モード（必要な場合）
  const dbRef = useRef(null);

  /* ===== IndexedDB 関連 ===== */
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('MeetingFormatsDB', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('formats')) {
          db.createObjectStore('formats', { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const getAllFormats = (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('formats', 'readonly');
      const store = transaction.objectStore('formats');
      const request = store.getAll();
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  };

  const putFormat = (db, format) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('formats', 'readwrite');
      const store = transaction.objectStore('formats');
      const request = store.put(format);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  };

  // コンポーネント初回マウント時に IndexedDB をオープンし、データを取得する
  useEffect(() => {
    let isMounted = true;
    openDB()
      .then((db) => {
        dbRef.current = db;
        return getAllFormats(db);
      })
      .then((savedFormats) => {
        if (isMounted) {
          if (savedFormats && savedFormats.length > 0) {
            setFormats(savedFormats);
          } else {
            // 初回起動時は default のフォーマットに selected プロパティを追加して保存
            const initialFormats = defaultMeetingFormats.map((format) => ({
              ...format,
              selected: false,
            }));
            setFormats(initialFormats);
            initialFormats.forEach((format) => {
              putFormat(dbRef.current, format).catch((err) =>
                console.error('Error saving default format:', err)
              );
            });
          }
        }
      })
      .catch((err) => console.error('Error opening IndexedDB:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // 検索フィルタリング（タイトル or テンプレート内容）
  const filteredFormats = formats.filter(
    (format) =>
      format.title.toLowerCase().includes(searchText.toLowerCase()) ||
      format.template.toLowerCase().includes(searchText.toLowerCase())
  );

  // 並び順のソート
  const sortedFormats = [...filteredFormats].sort((a, b) => {
    // 優先度を決める関数（低い数値ほど優先）
    const getPriority = (format) => {
      if (format.selected) return 0; // チェックがついているものが最優先
      if (format.title.toLowerCase() === 'general') return 1; // 次に "General"
      return 2; // それ以外
    };

    const aPriority = getPriority(a);
    const bPriority = getPriority(b);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    } else {
      // 同じ優先度の場合はタイトルを localeCompare で比較（日本語の場合は 'ja' を指定）
      return a.title.localeCompare(b.title, 'ja');
    }
  });

  // --- 単一選択にするための共通ロジック ---
  // 対象が既に選択されている場合はすべて unselected、そうでなければ対象のみ selected にする
  const updateSingleSelection = (targetId) => {
    const target = formats.find((format) => format.id === targetId);
    const updatedFormats = formats.map((format) => {
      if (target && target.selected) {
        return { ...format, selected: false };
      } else {
        return { ...format, selected: format.id === targetId };
      }
    });
    setFormats(updatedFormats);
    updatedFormats.forEach((f) => {
      if (dbRef.current) {
        putFormat(dbRef.current, f).catch((err) =>
          console.error('Error updating selection:', err)
        );
      }
    });
  };

  // チェックボックス変更時（クリックの伝播を止める）
  const handleSelectionChange = (id, event) => {
    event.stopPropagation();
    updateSingleSelection(id);
  };

  // 選択モード時、項目タップで選択状態のトグル
  const toggleSelect = (id) => {
    updateSingleSelection(id);
  };

  // 各フォーマット項目をタップしたときの処理（編集用オーバーレイを表示）
  const handleItemClick = (format) => {
    if (selectionMode) {
      toggleSelect(format.id);
    } else {
      setEditingFormat(format);
      setEditingText(format.template);
    }
  };

  // 編集用オーバーレイの「保存」ボタン
  const handleSaveEdit = () => {
    if (!editingFormat) return;
    const updatedFormat = { ...editingFormat, template: editingText };
    const updatedFormats = formats.map((format) =>
      format.id === updatedFormat.id ? updatedFormat : format
    );
    setFormats(updatedFormats);
    if (dbRef.current) {
      putFormat(dbRef.current, updatedFormat).catch((err) =>
        console.error('Error saving edited format:', err)
      );
    }
    setEditingFormat(null);
    setEditingText('');
  };

  // 編集用オーバーレイの「キャンセル」または背景タップ時
  const handleCancelEdit = () => {
    setEditingFormat(null);
    setEditingText('');
  };

  // 新規フォーマット追加
  const handleAddNewFormat = () => {
    const newId = `custom-${Date.now()}`;
    const newFormat = {
      id: newId,
      title: newTitle || 'New Format',
      template: newTemplate || '',
      selected: false,
    };
    const updatedFormats = [...formats, newFormat];
    setFormats(updatedFormats);
    if (dbRef.current) {
      putFormat(dbRef.current, newFormat).catch((err) =>
        console.error('Error adding new format:', err)
      );
    }
    setNewTitle('');
    setNewTemplate('');
    setShowAddForm(false);
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: 20, color: 'white' }}>
      {/* ヘッダー：タイトルと「＋」ボタン（＋ボタン押下で新規追加オーバーレイを表示） */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '90%',
          margin: '0 auto',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '38px' }}>Meeting Formats</h1>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            backgroundColor: '#1e1e1e',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: 4,
            fontSize: 24,
            cursor: 'pointer',
          }}
        >
          ＋
        </button>
      </div>

      {/* 検索ボックス */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '99%',
            padding: 10,
            borderRadius: 8,
            border: 'none',
            fontSize: 16,
            backgroundColor: '#1e1e1e',
            color: 'white',
            outline: 'none',
            textAlign: 'left',
          }}
        />
      </div>

      {/* フォーマット一覧（タイトルはボックス外、内容はダークグレーのボックス内に表示） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 15,
        }}
      >
        {sortedFormats.map((format) => (
          <div
            key={format.id}
            style={{ cursor: 'pointer' }}
            onClick={() => handleItemClick(format)}
          >
            {/* タイトルとチェックボックス（ボックス外に独立して表示） */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '28px', textAlign: 'center', width: '100%' }}>{format.title}</h3>
              <input
                type="checkbox"
                checked={!!format.selected}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleSelectionChange(format.id, e)}
              />
            </div>
            {/* テンプレート内容を表示するダークグレーのボックス */}
            <div
              style={{
                backgroundColor: '#1e1e1e',
                borderRadius: 10,
                padding: 10,
                minHeight: 150,
                marginTop: 5,
              }}
            >
<div
  style={{
    color: '#ccc',
    fontSize: 14,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre-line', // 'pre-wrap' から 'pre-line' に変更
  }}
>
  {format.template}
</div>

            </div>
          </div>
        ))}
      </div>

      {/* 編集用オーバーレイ（モーダル） */}
      {editingFormat && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={handleCancelEdit}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: 20,
              borderRadius: 10,
              width: '90%',
              maxWidth: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{editingFormat.title}</h2>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 200,
                padding: 10,
                borderRadius: 8,
                border: 'none',
                fontSize: 16,
                backgroundColor: '#1e1e1e',
                color: 'white',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  backgroundColor: '#555',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                  marginRight: 10,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規フォーマット追加オーバーレイ */}
      {showAddForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddForm(false)}
        >
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: 20,
              borderRadius: 10,
              width: '90%',
              maxWidth: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>新規フォーマット追加</h2>
            <input
              type="text"
              placeholder="タイトル"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: 'none',
                fontSize: 16,
                marginBottom: 10,
                backgroundColor: '#1e1e1e',
                color: 'white',
                outline: 'none',
              }}
            />
            <textarea
              placeholder="テンプレート内容"
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: 'none',
                fontSize: 16,
                marginBottom: 10,
                backgroundColor: '#1e1e1e',
                color: 'white',
                outline: 'none',
                minHeight: 150,
                resize: 'vertical',
              }}
            />
            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  backgroundColor: '#555',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                  marginRight: 10,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleAddNewFormat}
                style={{
                  backgroundColor: 'black',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingFormatsList;
