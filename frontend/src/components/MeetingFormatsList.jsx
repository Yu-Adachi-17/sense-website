import React, { useState, useEffect, useRef } from 'react';
import defaultMeetingFormats from './MeetingFormatElements';

const MeetingFormatsList = () => {
  // State 管理
  const [formats, setFormats] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  // IndexedDB の DB インスタンスを保持する ref
  const dbRef = useRef(null);

  /* ===== IndexedDB 関連のユーティリティ関数 ===== */

  // データベースオープン（なければ objectStore を作成）
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open('MeetingFormatsDB', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('formats')) {
          db.createObjectStore('formats', { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  };

  // 全フォーマットの取得
  const getAllFormats = (db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('formats', 'readonly');
      const store = transaction.objectStore('formats');
      const request = store.getAll();
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  };

  // 1 件のフォーマットを保存（新規追加・更新）
  const putFormat = (db, format) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('formats', 'readwrite');
      const store = transaction.objectStore('formats');
      const request = store.put(format);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  };

  /* ===== コンポーネント初回マウント時に IndexedDB を初期化＆データ取得 ===== */
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
            // 初回起動時：default のフォーマットに selected プロパティを追加
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
      .catch((err) => {
        console.error('Error opening IndexedDB:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /* ===== 各種ハンドラ ===== */

  // テンプレート内容編集時
  const handleContentChange = (id, event) => {
    const newText = event.target.value;
    const updatedFormats = formats.map((format) =>
      format.id === id ? { ...format, template: newText } : format
    );
    setFormats(updatedFormats);
    const updatedFormat = updatedFormats.find((format) => format.id === id);
    if (dbRef.current) {
      putFormat(dbRef.current, updatedFormat).catch((err) =>
        console.error('Error updating format:', err)
      );
    }
  };

  // チェックボックス選択変更時（表示／非表示の切り替え）
  const handleSelectionChange = (id, event) => {
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

  // 新規フォーマット追加
  const handleAddNewFormat = () => {
    // id はタイムスタンプでユニークに
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
    // 入力フォームリセット＆非表示に
    setNewTitle('');
    setNewTemplate('');
    setShowAddForm(false);
  };

  // 検索によるフィルタリング（タイトル or テンプレート内容）
  const filteredFormats = formats.filter(
    (format) =>
      format.title.toLowerCase().includes(searchText.toLowerCase()) ||
      format.template.toLowerCase().includes(searchText.toLowerCase())
  );

  /* ===== レンダリング ===== */
  return (
    <div
      style={{
        backgroundColor: '#000',
        minHeight: '100vh',
        padding: 20,
        color: 'white',
      }}
    >
      {/* ヘッダー部分 */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1 style={{ margin: '0 0 10px 0' }}>Meeting Formats</h1>
        <input
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 600,
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
      </header>

      {/* 新規フォーマット追加フォーム */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
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
          {showAddForm ? 'キャンセル' : '新規フォーマット追加'}
        </button>
      </div>

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
              backgroundColor: 'white',
              color: '#000',
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

      {/* ミーティングフォーマットの一覧表示（グリッドレイアウト） */}
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
            style={{
              backgroundColor: '#1e1e1e',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 300,
            }}
          >
            {/* ヘッダー：タイトルとチェックボックス */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>{format.title}</h3>
              <input
                type="checkbox"
                checked={!!format.selected}
                onChange={(e) => handleSelectionChange(format.id, e)}
                title="表示/非表示選択"
              />
            </div>
            {/* 編集可能なテンプレート内容 */}
            <textarea
              value={format.template}
              onChange={(e) => handleContentChange(format.id, e)}
              style={{
                flex: 1,
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: 5,
                fontFamily: 'monospace',
                fontSize: 14,
                color: '#000',
                backgroundColor: 'white',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingFormatsList;
