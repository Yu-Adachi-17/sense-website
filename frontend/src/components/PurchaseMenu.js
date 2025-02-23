import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Firebase-related
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
// Icon components
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5"; // Keep this one
import { FaTicketAlt, FaCircle } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { PiGridFourFill } from "react-icons/pi";  // Added: Icon for meeting records list
import { HiOutlineDotsCircleHorizontal } from "react-icons/hi"; // Icon for top-right action menu

export function PurchaseMenu() {
  // Define various states
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  // remainingSeconds fetched from the Firestore user document
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  // Subscription status on Firebase (true: unlimited, false: limited time)
  const [subscription, setSubscription] = useState(false);
  // For displaying the profile modal
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  // For displaying the action menu
  const [showActionMenu, setShowActionMenu] = useState(false);

  const navigate = useNavigate();

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Monitor Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        console.log("✅ Firebase logged-in user UID:", user.uid);
      } else {
        setUserId(null);
        setUserEmail(null);
        console.log("❌ User is logged out.");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user data (remainingSeconds, subscription) from Firestore
  useEffect(() => {
    if (userId) {
      const fetchUserData = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileRemainingSeconds(data.remainingSeconds);
            setSubscription(data.subscription === true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    }
  }, [userId]);

  // Environment variable check (for debugging)
  useEffect(() => {
    console.log("🔍 Environment Variable Check:");
    console.log("REACT_APP_STRIPE_PRODUCT_120MIN:", process.env.REACT_APP_STRIPE_PRODUCT_120MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_1200MIN:", process.env.REACT_APP_STRIPE_PRODUCT_1200MIN);
    console.log("REACT_APP_STRIPE_PRODUCT_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED);
    console.log("REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED:", process.env.REACT_APP_STRIPE_PRODUCT_YEARLY_UNLIMITED);
  }, []);

  // Function to format seconds to mm:ss
  const formatTime = (seconds) => {
    const sec = Math.floor(Number(seconds));
    const minutes = Math.floor(sec / 60);
    const remainingSeconds = sec % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Define various styles
  const styles = {
    hamburgerButton: {
      position: "fixed",
      top: "20px",
      right: "30px",
      fontSize: "30px",
      background: "none",
      border: "none",
      color: "#FFFFFF",
      cursor: "pointer",
      zIndex: 1300,
    },
    sideMenuOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1100,
      display: showSideMenu ? "block" : "none",
      transition: "opacity 0.5s ease",
      opacity: showSideMenu ? 1 : 0,
    },
    sideMenu: {
      position: "fixed",
      top: 0,
      right: 0,
      width: isMobile ? "66.66%" : "33%",
      height: "100%",
      background: "linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(128, 128, 128, 0.2))",
      color: "#FFF",
      padding: "20px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      zIndex: 1200,
      transition: "transform 0.5s ease-out",
      transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
    },
    // "Meeting Records List" button (yellow text, left-aligned)
    minutesListButton: {
      background: "none",
      border: "none",
      color: "white",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "16px",
    },
    // "Purchase Items" button (yellow text, left-aligned)
    purchaseButton: {
      background: "none",
      border: "none",
      color: "yellow",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
      marginBottom: "16px",
    },
    // "Meeting Formats" button
    formatButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      padding: "10px 0",
      fontSize: "16px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      cursor: "pointer",
      textAlign: "left",
    },
    profileOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.9)",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    profileModal: {
      width: "450px",
      height: "500px",
      background: "rgba(20, 20, 20, 1)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px",
      boxSizing: "border-box",
      position: "relative",
    },
    logoutButton: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontFamily: "Impact, sans-serif",
      color: "#FFF" // Set icon color to white
    },
    // Outer circle for gradient ring
    profileCircle: {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "80vw",
      height: "80vw",
      maxWidth: "320px",
      maxHeight: "320px",
      borderRadius: "50%",
      background: "linear-gradient(to bottom right, rgb(153, 184, 255), rgba(115, 115, 255, 1), rgba(102, 38, 153, 1), rgb(95, 13, 133), rgba(255, 38, 38, 1), rgb(199, 42, 76))",
      padding: "10px", // Adjust ring thickness
      boxSizing: "border-box",
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    // innerCircle: filled with the same color as the overlay background to appear as a ring
    innerCircle: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      background: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    profileInfo: {
      textAlign: "center",
      fontSize: "16px",
      color: "#FFF",
      fontFamily: "Impact, sans-serif",
    },
    // Container for Privacy Policy / Terms of Use buttons at bottom-right
    policyButtonContainer: {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    },
    // Small button style
    policyButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: "14px",
      cursor: "pointer",
      padding: "4px 8px",
    },
    // New: Container for the top row (upper header)
    topRow: {
      position: "relative",
      width: "100%",
      height: "50px",
      marginBottom: "16px",
    },
    // New: Style for the action menu (black background, white text)
    actionMenu: {
      position: "absolute",
      top: "40px",
      right: "10px",
      backgroundColor: "#000",
      color: "#FFF",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      zIndex: 1500,
    },
    actionMenuItem: {
      padding: "8px 12px",
      cursor: "pointer",
      borderBottom: "1px solid #333",
    },
    // New: unlimited text style (large font & gradient)
    unlimitedText: {
      fontSize: "32px",
      fontWeight: "bold",
      background: "linear-gradient(90deg, rgb(153, 184, 255), rgba(115, 115, 255, 1), rgba(102, 38, 153, 1), rgb(95, 13, 133), rgba(255, 38, 38, 1), rgb(199, 42, 76))",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
  };

  // Prevent event bubbling
  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  // Handler for hamburger button click
  const handleHamburgerClick = () => {
    setShowSideMenu(!showSideMenu);
  };

  // Edit Profile handler (using window.prompt to update username)
  const handleEditProfile = async () => {
    setShowActionMenu(false);
    const newUserName = window.prompt("Enter new username:");
    if (newUserName) {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, { userName: newUserName }, { merge: true });
        alert("Username updated successfully.");
      } catch (error) {
        console.error("Error updating username:", error);
        alert("Error updating username.");
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    setShowActionMenu(false);
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await auth.signOut();
        setShowProfileOverlay(false);
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    setShowActionMenu(false);
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        // Delete user data from Firestore
        await deleteDoc(doc(db, "users", userId));
        // Delete user from Authentication
        if (auth.currentUser) {
          await auth.currentUser.delete();
        }
        setShowProfileOverlay(false);
        navigate("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account.");
      }
    }
  };

  return (
    <>
      {/* Show hamburger icon only when side menu is closed */}
      { !showSideMenu && (
        <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
          <GiHamburgerMenu size={30} />
        </button>
      )}

      {/* Side menu overlay */}
      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* New: Top row header (center: "Services and Pricing", right: profile icon) */}
            <div style={styles.topRow}>
              <button
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/seo");
                }}
              >
                Services and Pricing
              </button>
              <button
                style={{
                  position: "absolute",
                  right: 0,
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "30px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  if (userId) {
                    setShowProfileOverlay(true);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                <IoPersonCircleOutline size={30} />
              </button>
            </div>

            {/* Vertical menu items */}
            <button
              style={styles.minutesListButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  navigate("/minutes-list");
                } else {
                  navigate("/login");
                }
              }}
            >
              <PiGridFourFill style={{ marginRight: "8px" }} />
              Meeting Records List
            </button>

            <button
              style={styles.purchaseButton}
              onClick={() => {
                setShowSideMenu(false);
                if (userId) {
                  navigate("/buy-tickets");
                } else {
                  navigate("/login");
                }
              }}
            >
              <FaTicketAlt style={{ marginRight: "8px" }} />
              Purchase Items
            </button>

            <button
              style={styles.formatButton}
              onClick={() => {
                setShowSideMenu(false);
                navigate("/meeting-formats");
              }}
            >
              <BsWrenchAdjustable style={{ marginRight: "8px" }} />
              Meeting Formats
            </button>

            {/* Policy buttons at bottom-right */}
            <div style={styles.policyButtonContainer}>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/terms-of-use");
                }}
              >
                Terms of Use
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/privacy-policy");
                }}
              >
                Privacy Policy
              </button>
              <button
                style={styles.policyButton}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/transactions-law");
                }}
              >
                Legal Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Overlay */}
      {showProfileOverlay && (
        <div
          style={styles.profileOverlay}
          onClick={() => {
            setShowProfileOverlay(false);
            setShowActionMenu(false);
          }}
        >
          <div style={styles.profileModal} onClick={stopPropagation}>
            {/* Top-right icon button */}
            <button
              style={styles.logoutButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowActionMenu(!showActionMenu);
              }}
            >
              <HiOutlineDotsCircleHorizontal size={30} />
            </button>
            {/* Action menu */}
            {showActionMenu && (
              <div style={styles.actionMenu}>
                <div style={styles.actionMenuItem} onClick={handleEditProfile}>
                  Edit Profile
                </div>
                <div style={styles.actionMenuItem} onClick={handleLogout}>
                  Logout
                </div>
                <div style={{ ...styles.actionMenuItem, borderBottom: "none" }} onClick={handleDeleteAccount}>
                  Delete account
                </div>
              </div>
            )}
            {/* Outer gradient ring and inner circle */}
            <div style={styles.profileCircle}>
              <div style={styles.innerCircle}>
                <div style={styles.profileInfo}>
                  <p>Email: {userEmail}</p>
                  {subscription ? (
                    <p style={styles.unlimitedText}>unlimited</p>
                  ) : (
                    <p>Remaining Time: {profileRemainingSeconds !== null ? formatTime(profileRemainingSeconds) : "00:00"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PurchaseMenu;
