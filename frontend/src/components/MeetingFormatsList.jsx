import React, { useState, useEffect, useRef } from 'react';
import defaultMeetingFormats from './MeetingFormatElements';

const MeetingFormatsList = () => {
  // state: フォーマット一覧、追加フォーム表示切替、新規追加用フィールド
  const [formats, setFormats] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  // IndexedDB のインスタンスを保持する ref
  const dbRef = useRef(null);

  /* === IndexedDB 関連のユーティリティ関数 === */

  // データベースをオープン。なければ onupgradeneeded で objectStore を作成。
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

  // オブジェクトストアからすべてのフォーマットを取得
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

  // １件のフォーマットを（新規もしくは更新として）保存
  const putFormat = (db, format) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('formats', 'readwrite');
      const store = transaction.objectStore('formats');
      const request = store.put(format);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  };

  /* === コンポーネント初回マウント時に IndexedDB を初期化＆データ取得 === */
  useEffect(() => {
    let isMounted = true;
    openDB()
      .then(db => {
        dbRef.current = db;
        return getAllFormats(db);
      })
      .then(savedFormats => {
        if (isMounted) {
          if (savedFormats && savedFormats.length > 0) {
            // IndexedDB に保存済みのデータがあればそれを利用
            setFormats(savedFormats);
          } else {
            // 初回起動時：default のフォーマットに selected プロパティを追加して保存
            const initialFormats = defaultMeetingFormats.map(format => ({
              ...format,
              selected: false,
            }));
            setFormats(initialFormats);
            initialFormats.forEach(format => {
              putFormat(dbRef.current, format)
                .catch(err => console.error('Error saving default format:', err));
            });
          }
        }
      })
      .catch(err => {
        console.error('Error opening IndexedDB:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /* === フォーマット内容（テンプレート）の編集ハンドラ === */
  const handleContentChange = (id, event) => {
    const newText = event.target.value;
    const updatedFormats = formats.map(format =>
      format.id === id ? { ...format, template: newText } : format
    );
    setFormats(updatedFormats);
    const updatedFormat = updatedFormats.find(format => format.id === id);
    if (dbRef.current) {
      putFormat(dbRef.current, updatedFormat)
        .catch(err => console.error('Error updating format:', err));
    }
  };

  /* === チェックボックス選択状態変更ハンドラ === */
  const handleSelectionChange = (id, event) => {
    const selected = event.target.checked;
    const updatedFormats = formats.map(format =>
      format.id === id ? { ...format, selected } : format
    );
    setFormats(updatedFormats);
    const updatedFormat = updatedFormats.find(format => format.id === id);
    if (dbRef.current) {
      putFormat(dbRef.current, updatedFormat)
        .catch(err => console.error('Error updating selection:', err));
    }
  };

  /* === 新規フォーマット追加ハンドラ === */
  const handleAddNewFormat = () => {
    // id はタイムスタンプを利用してユニークなものとする
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
      putFormat(dbRef.current, newFormat)
        .catch(err => console.error('Error adding new format:', err));
    }
    // 入力フォームをリセットして非表示にする
    setNewTitle('');
    setNewTemplate('');
    setShowAddForm(false);
  };

  return (
    <div>
      {/* 新規フォーマット追加フォーム */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'キャンセル' : '新規フォーマット追加'}
        </button>
        {showAddForm && (
          <div style={{ marginTop: '10px' }}>
            <input
              type="text"
              placeholder="タイトル"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            <br />
            <textarea
              placeholder="テンプレート内容"
              value={newTemplate}
              onChange={e => setNewTemplate(e.target.value)}
              style={{
                width: '300px',
                height: '150px',
                display: 'block',
                marginTop: '10px',
                marginBottom: '10px'
              }}
            />
            <button onClick={handleAddNewFormat}>追加</button>
          </div>
        )}
      </div>

      {/* フォーマット一覧の表示（横スクロールレイアウト） */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          height: '60vh',            // 画面の 0.6 倍の高さ
          gap: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0'
        }}
      >
        {formats.map(format => (
          <div
            key={format.id}
            style={{
              minWidth: '300px',      // 各ボックスの最小幅（必要に応じて調整）
              height: '100%',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
              backgroundColor: 'white',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* タイトルとチェックボックス */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', flex: 1 }}>
                {format.title}
              </h3>
              <input
                type="checkbox"
                checked={!!format.selected}
                onChange={(e) => handleSelectionChange(format.id, e)}
                title="表示/非表示選択"
              />
            </div>
            {/* 編集可能なテンプレート内容 */}
            <textarea
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '5px',
                fontFamily: 'monospace'
              }}
              value={format.template}
              onChange={(e) => handleContentChange(format.id, e)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingFormatsList;
