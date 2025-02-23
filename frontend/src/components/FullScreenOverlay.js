// FullScreenOverlay.js
import React, { useState, useEffect } from 'react';
import { TbClipboardList, TbClipboardText } from "react-icons/tb";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoIosDownload } from "react-icons/io";
import { FaRegCopy } from "react-icons/fa";

// Firebase Firestore update module
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";  // Initialized Firestore instance

const FullScreenOverlay = ({
  setShowFullScreen,
  isExpanded,
  setIsExpanded,
  transcription,
  minutes,
  audioURL,
  docId  // Document ID to update
}) => {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Editing mode state and the text being edited (either minutes or transcription)
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(isExpanded ? transcription : minutes);

  useEffect(() => {
    if (docId && !isEditing) {  // If not editing, reflect external changes
      const docRef = doc(db, 'meetingRecords', docId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Update the text based on the state of isExpanded
          setEditedText(isExpanded ? data.transcription : data.minutes);
        }
      });
      return unsubscribe;
    }
  }, [docId, isExpanded, isEditing]);

  // Monitor changes in screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update displayed content when isExpanded or props change, if not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedText(isExpanded ? transcription : minutes);
    }
  }, [isExpanded, transcription, minutes, isEditing]);

  // Audio data download handler
  const handleDownload = () => {
    if (audioURL) {
      const link = document.createElement('a');
      link.href = audioURL;
      link.download = 'meeting_recording.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No downloadable audio data available.');
    }
  };

  // Toggle between full transcript and minutes (also exits editing mode)
  const handleSwitchView = () => {
    setIsExpanded(!isExpanded);
    setShowSideMenu(false);
    setIsEditing(false);
  };

  // Switch to minutes view (also exits editing mode)
  const handleSwitchToMinutes = () => {
    if (isExpanded) {
      setIsExpanded(false);
      setShowSideMenu(false);
      setIsEditing(false);
    }
  };

  // Copy minutes or full transcript to clipboard
  const handleShare = () => {
    const content = editedText;
    navigator.clipboard.writeText(content).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard.');
    });
  };

  // Update Firebase (if isExpanded is true, update transcription; otherwise, update minutes)
  const handleSave = async () => {
    if (!docId) {
      alert('No document ID available for saving.');
      return;
    }
    try {
      const docRef = doc(db, 'meetingRecords', docId);
      if (isExpanded) {
        await updateDoc(docRef, { transcription: editedText });
      } else {
        await updateDoc(docRef, { minutes: editedText });
      }
      setIsEditing(false);
      alert('Save successful.');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert('Save failed: ' + error.message);
    }
  };

  // Prevent clicks inside the side menu from propagating to the overlay
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // Below are style definitions (kept as is)
  const styles = {
    fullScreenOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
      opacity: 1,
      transform: 'translateY(0)',
      zIndex: 1000,
      pointerEvents: 'auto',
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      left: '30px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
    },
    hamburgerButton: {
      position: 'absolute',
      top: '20px',
      right: '30px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
      zIndex: 1300,
    },
    shareButton: {
      position: 'absolute',
      top: '7px',
      right: '20px',
      fontSize: '20px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
      zIndex: 1300,
    },
    fullScreenContent: {
      width: '90%',
      height: '85%',
      overflowY: 'auto',
      backgroundColor: '#222222',
      padding: '20px',
      borderRadius: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      textAlign: 'left',
      transition: 'max-height 0.5s ease',
      marginBottom: '20px',
      position: 'relative',
    },
    summaryText: {
      maxHeight: 'none',
      overflowY: 'auto',
    },
    fullText: {
      maxHeight: 'none',
      overflowY: 'auto',
    },
    title: {
      marginBottom: '20px',
      paddingTop: '20px',
      fontSize: '30px',
      fontWeight: 'bold',
    },
    titleContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    saveButton: {
      backgroundColor: '#FFFFFF',
      color: '#000000',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      marginLeft: '10px',
      borderRadius: '5px',
    },
    editButton: {
      backgroundColor: 'transparent',
      color: '#FFFFFF',
      border: '1px solid #FFFFFF',
      padding: '5px 10px',
      cursor: 'pointer',
      marginLeft: '10px',
      borderRadius: '5px',
    },
    textEditor: {
      width: '100%',
      height: '100%',
      backgroundColor: '#222222',
      color: '#FFFFFF',
      border: '1px solid #555',
      borderRadius: '10px',
      padding: '20px',
      boxSizing: 'border-box',
      fontSize: '16px',
      outline: 'none',
      resize: 'none',
    },
    sideMenuOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1100,
      display: showSideMenu ? 'block' : 'none',
      transition: 'opacity 0.5s ease',
      opacity: showSideMenu ? 1 : 0,
    },
    sideMenu: {
      position: 'fixed',
      top: 0,
      right: 0,
      width: isMobile ? '66.66%' : '33%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: '#FFF',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      zIndex: 1200,
      transform: showSideMenu ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.5s ease-out',
    },
    sideMenuButton: {
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      fontSize: '24px',
      cursor: 'pointer',
      margin: '10px 0',
      display: 'flex',
      alignItems: 'center',
      fontWeight: 'bold',
    },
    sideMenuClose: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      fontSize: '30px',
      background: 'none',
      border: 'none',
      color: '#FFFFFF',
      cursor: 'pointer',
    },
    iconSpacing: {
      marginLeft: '10px',
      fontWeight: 'bold',
      fontSize: '16px',
    },
  };

  return (
    <>
      <div style={styles.fullScreenOverlay}>
        {/* Close button */}
        <button style={styles.closeButton} onClick={() => setShowFullScreen(false)}>
          &times;
        </button>

        {/* Hamburger menu */}
        <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
          <GiHamburgerMenu size={24} />
        </button>

        {/* Title and Edit/Save buttons */}
        <div style={styles.titleContainer}>
          <h2 style={styles.title}>
            {isExpanded ? 'Full Transcript' : 'Minutes'}
          </h2>
          {isEditing ? (
            <button style={styles.saveButton} onClick={handleSave}>
              Save
            </button>
          ) : (
            <button style={styles.editButton} onClick={() => setIsEditing(true)}>
              Edit
            </button>
          )}
        </div>

        {/* Text display area */}
        <div
          style={{
            ...styles.fullScreenContent,
            ...(isExpanded ? styles.fullText : styles.summaryText),
          }}
        >
          {/* Share button */}
          <button style={styles.shareButton} onClick={handleShare}>
            <FaRegCopy size={20} />
          </button>

          {/* If in editing mode, display a textarea; otherwise, display a paragraph */}
          {isEditing ? (
            <textarea
              style={styles.textEditor}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            <p style={{ whiteSpace: 'pre-wrap' }}>{editedText}</p>
          )}
        </div>
      </div>

      {/* Side menu overlay */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* Button to toggle between full transcript and minutes */}
            {!isExpanded ? (
              <button style={styles.sideMenuButton} onClick={handleSwitchView}>
                <TbClipboardText size={24} />
                <span style={styles.iconSpacing}>Show Full Transcript</span>
              </button>
            ) : (
              <button style={styles.sideMenuButton} onClick={handleSwitchToMinutes}>
                <TbClipboardList size={24} />
                <span style={styles.iconSpacing}>Show Minutes</span>
              </button>
            )}

            {/* Audio data download button */}
            <button style={styles.sideMenuButton} onClick={handleDownload}>
              <IoIosDownload size={24} />
              <span style={styles.iconSpacing}>Download Audio Data</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FullScreenOverlay;
