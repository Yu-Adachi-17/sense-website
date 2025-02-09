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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
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

  // 各フォーマット項目をタップしたときの処理
  const handleItemClick = (format) => {
    if (selectionMode) {
      // 選択モードの場合は選択状態をトグル
      toggleSelect(format.id);
    } else {
      // 編集モードの場合はオーバーレイを表示
      setEditingFormat(format);
      setEditingText(format.template);
    }
  };

  // 編集モーダルで「保存」ボタンを押したとき
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

  // 編集モーダルで「キャンセル」ボタンまたは背景タップ時
  const handleCancelEdit = () => {
    setEditingFormat(null);
    setEditingText('');
  };

  // チェックボックス変更時（クリックイベントの伝播を止める）
  const handleSelectionChange = (id, event) => {
    event.stopPropagation();
    const selected = event.target.checked;
    const updatedFormats = formats.map((format) =>
      format.id === id ? { ...format, selected } : format
    );
    setFormats(updatedFormats);
    const updatedFormat = updatedFormats.find((format) => format.id === id);
    if (dbRef.current) {
      putFormat(dbRef.current, updatedFormat).catch((err) =>
        console.error('Error updating selection:', err)
      );
    }
  };

  // 選択モード時のトグル処理
  const toggleSelect = (id) => {
    setSelectedIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((item) => item !== id);
      } else {
        return [...prevSelected, id];
      }
    });
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
      {/* ヘッダー：タイトルと「＋」ボタン（新規追加）を同列に配置 */}
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
        <h1 style={{ margin: 0 }}>Meeting Formats</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
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

      {/* 検索ボックス（幅 90%） */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '90%',
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

      {/* 新規フォーマット追加フォーム */}
      {showAddForm && (
        <div style={{ marginBottom: 20, maxWidth: 600, margin: '0 auto' }}>
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
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleAddNewFormat}
              style={{
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              追加
            </button>
          </div>
        </div>
      )}

      {/* フォーマット一覧（グリッドレイアウト） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 15,
        }}
      >
        {filteredFormats.map((format) => (
          <div
            key={format.id}
            onClick={() => handleItemClick(format)}
            style={{
              backgroundColor: '#1e1e1e',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 150,
              cursor: 'pointer',
            }}
          >
            {/* ヘッダー部分：タイトルとチェックボックス */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0 }}>{format.title}</h3>
              <input
                type="checkbox"
                checked={!!format.selected}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleSelectionChange(format.id, e)}
              />
            </div>
            {/* 内容の一部（オーバーフロー時は省略表示） */}
            <div
              style={{
                marginTop: 10,
                color: '#ccc',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {format.template}
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
    </div>
  );
};

export default MeetingFormatsList;
