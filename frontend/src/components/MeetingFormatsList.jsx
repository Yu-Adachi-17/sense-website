import React, { useState, useEffect, useRef } from 'react';
import useLocalizedMeetingFormats, { localizeFormat } from './useLocalizedMeetingFormats';
import HomeIcon from './HomeIcon';
import { useTranslation } from "react-i18next";

const MeetingFormatsList = () => {
  const { t } = useTranslation();
  // フックからはキー情報のみのデフォルトフォーマットを取得
  const defaultFormats = useLocalizedMeetingFormats();
  const [formats, setFormats] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTemplate, setNewTemplate] = useState('');
  const [editingFormat, setEditingFormat] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const dbRef = useRef(null);

  /* ===== IndexedDB Related ===== */
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
            // 初回はデフォルトフォーマットのキー情報を使って初期化し、"general" を初期選択にする
            const initialFormats = defaultFormats.map((format) => ({
              ...format,
              selected: format.id === 'general',
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
  }, [defaultFormats]);

  useEffect(() => {
    const selected = formats.find((f) => f.selected);
    if (selected) {
      localStorage.setItem('selectedMeetingFormat', JSON.stringify(selected));
    }
  }, [formats]);

  // フォーマットをレンダー前にローカライズ（デフォルトの場合はキーを t() で翻訳）
  const getDisplayFormat = (format) => {
    if (format.titleKey && format.templateKey) {
      return localizeFormat(format, t);
    }
    return format;
  };

  // 検索テキストでフィルタリング（表示時にローカライズ済み値で比較）
  const filteredFormats = formats.filter((format) => {
    const localized = getDisplayFormat(format);
    return (
      localized.title.toLowerCase().includes(searchText.toLowerCase()) ||
      localized.template.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  // ソート処理：選択中、"general"、その他の順
  const sortedFormats = [...filteredFormats].sort((a, b) => {
    const getPriority = (format) => {
      const localized = getDisplayFormat(format);
      if (localized.selected) return 0;
      if (localized.id === 'general') return 1;
      return 2;
    };

    const aPriority = getPriority(a);
    const bPriority = getPriority(b);
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    } else {
      const localizedA = getDisplayFormat(a);
      const localizedB = getDisplayFormat(b);
      return localizedA.title.localeCompare(localizedB.title, 'ja');
    }
  });

  // 単一選択の更新処理
  const updateSingleSelection = (targetId) => {
    const updatePromises = [];
    const updatedFormats = formats.map((format) => {
      const isSelected = format.id === targetId;
      if (format.selected !== isSelected && dbRef.current) {
        updatePromises.push(
          putFormat(dbRef.current, { ...format, selected: isSelected }).catch((err) =>
            console.error('Error updating format selection:', err)
          )
        );
      }
      return { ...format, selected: isSelected };
    });
    setFormats(updatedFormats);
    Promise.all(updatePromises)
      .then(() => {
        window.location.reload();
      })
      .catch((err) => console.error('Error in selection update:', err));
  };

  const handleSelectionChange = (id, event) => {
    event.stopPropagation();
    updateSingleSelection(id);
  };

  const toggleSelect = (id) => {
    updateSingleSelection(id);
  };

  const handleItemClick = (format) => {
    if (selectionMode) {
      toggleSelect(format.id);
    } else {
      setEditingFormat(format);
      setEditingText(getDisplayFormat(format).template);
    }
  };

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

  const handleCancelEdit = () => {
    setEditingFormat(null);
    setEditingText('');
  };

  const handleAddNewFormat = () => {
    const newId = `custom-${Date.now()}`;
    // 新規追加の場合は、ユーザー入力値をそのまま保存（ローカライズ対象外）
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '70px',
          padding: '0 20px',
          backgroundColor: '#000',
          zIndex: 1500,
        }}
      >
        <div style={{ width: '70px' }}>
          <HomeIcon size={30} color="white" />
        </div>
        <div style={{ flexGrow: 1, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '38px' }}>{t("Minutes Formats")}</h1>
        </div>
        <div style={{ width: '70px', textAlign: 'right' }}>
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
      </div>

      <div>
        {/* Search Box */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <input
            type="text"
            placeholder={t("Search...")}
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
              textAlign: 'left',
            }}
          />
        </div>

        {/* フォーマット一覧 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 15,
          }}
        >
          {sortedFormats.map((format) => {
            const displayFormat = getDisplayFormat(format);
            return (
              <div
                key={displayFormat.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleItemClick(format)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '28px', textAlign: 'center', width: '100%' }}>
                    {displayFormat.title}
                  </h3>
                  <input
                    type="checkbox"
                    checked={!!displayFormat.selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleSelectionChange(displayFormat.id, e)}
                  />
                </div>
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
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {displayFormat.template}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 編集モーダル */}
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
            <h2 style={{ marginTop: 0 }}>{getDisplayFormat(editingFormat).title}</h2>
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
                {t("Cancel")}
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
                {t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規フォーマット追加モーダル */}
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
            <h2 style={{ marginTop: 0 }}>{t("Add New Format")}</h2>
            <input
              type="text"
              placeholder={t("Title")}
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
              placeholder={t("Template Content")}
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
                {t("Cancel")}
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
                {t("Add")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingFormatsList;
