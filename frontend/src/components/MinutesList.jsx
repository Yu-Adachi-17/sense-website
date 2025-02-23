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

// Meeting Record Item Component (Selection Mode Version)
const PaperItem = ({ paper, selectionMode, isSelected, toggleSelect }) => {
  const navigate = useNavigate();

  const createdDate =
    paper.createdAt?.toDate ? paper.createdAt.toDate() : new Date();
  const truncatedText =
    paper.minutes.length <= 100 ? paper.minutes : paper.minutes.slice(0, 100) + '…';

  // In selection mode, toggle selection; otherwise, navigate to the detail screen
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
      {/* Added white-space: pre-wrap */}
      <div style={{ fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
        {truncatedText}
      </div>
    </div>
  );
};

const MinutesList = () => {
  const [papers, setPapers] = useState([]);
  const [searchText, setSearchText] = useState('');
  // Manage selection mode and selected meeting record IDs
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🟡 [DEBUG] MinutesList mounted");

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🟢 [DEBUG] Logged in user:", user.uid);

        const q = query(
          collection(db, 'meetingRecords'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        console.log("🟡 [DEBUG] Executing Firestore query");

        const unsubscribeSnapshot = onSnapshot(
          q,
          (querySnapshot) => {
            console.log(`🟢 [DEBUG] Retrieved ${querySnapshot.size} documents from Firestore`);
            const fetchedPapers = [];
            querySnapshot.forEach((docSnapshot) => {
              console.log("🟢 [DEBUG] Retrieved document:", docSnapshot.id, docSnapshot.data());
              fetchedPapers.push({ id: docSnapshot.id, ...docSnapshot.data() });
            });

            if (fetchedPapers.length === 0) {
              console.warn("⚠️ [WARNING] No data in Firestore");
            }

            setPapers(fetchedPapers);
          },
          (error) => {
            console.error("🔴 [ERROR] Failed to retrieve data from Firestore:", error);
          }
        );

        return () => {
          console.log("🟡 [DEBUG] Unsubscribing Firestore listener");
          unsubscribeSnapshot();
        };
      } else {
        console.warn("⚠️ [WARNING] User is not logged in");
      }
    });

    return () => {
      console.log("🟡 [DEBUG] Unsubscribing onAuthStateChanged listener");
      unsubscribeAuth();
    };
  }, []);

  // Filtering for search
  const filteredPapers = papers.filter((paper) =>
    paper.minutes.toLowerCase().includes(searchText.toLowerCase())
  );

  // Group by date
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

  // Toggle selection for meeting record
  const toggleSelect = (id) => {
    setSelectedIds((prevSelected) => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter((item) => item !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };

  // Delete process (via confirmation alert)
  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert("Please select meeting records to delete.");
      return;
    }
    const confirmed = window.confirm("Are you sure you want to delete? This action cannot be undone.");
    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'meetingRecords', id));
      }
      // Reset selection state and exit selection mode after deletion
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error("An error occurred during deletion", error);
      alert("An error occurred during deletion");
    }
  };

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', padding: 20, color: 'white' }}>
      {/* Header */}
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
          <h2></h2>
        </div>
        <div>
          {selectionMode ? (
            <>
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
                style={{
                  backgroundColor: '#1e1e1e',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  marginRight: 10,
                  cursor: 'pointer',
                  fontSize: 18 // Changed here!
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#ff4d4d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 18, // Changed here!
                  fontWeight: 'bold' // Make text bold
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              style={{
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 18 // Changed here!
              }}
            >
              Select
            </button>
          )}
        </div>
      </div>

      {/* Search Field */}
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

      {/* List of meeting records */}
      {sortedDateKeys.length === 0 ? (
        <p style={{ color: 'gray', textAlign: 'center' }}>No meeting records available</p>
      ) : (
        sortedDateKeys.map((dateKey) => (
          <div key={dateKey} style={{ marginBottom: 30 }}>
            <h2 style={{ borderBottom: '1px solid #555', paddingBottom: 5 }}>{dateKey}</h2>
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
