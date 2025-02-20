import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Firebase 関連
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
// アイコン類
import { GiHamburgerMenu } from "react-icons/gi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaTicketAlt } from "react-icons/fa";
import { BsWrenchAdjustable } from "react-icons/bs";
import { PiGridFourFill } from "react-icons/pi";

export function PurchaseMenu() {
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [profileRemainingSeconds, setProfileRemainingSeconds] = useState(null);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        console.log("✅ Firebase ログインユーザーの UID:", user.uid);
      } else {
        setUserId(null);
        setUserEmail(null);
        console.log("❌ ユーザーはログアウトしています。");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) {
      const fetchUserData = async () => {
        try {
          const docRef = doc(db, "users", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileRemainingSeconds(data.remainingSeconds);
          }
        } catch (error) {
          console.error("ユーザーデータ取得エラー:", error);
        }
      };
      fetchUserData();
    }
  }, [userId]);

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
    },
    policyButtonContainer: {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
    },
    policyButton: {
      background: "none",
      border: "none",
      color: "#FFF",
      fontSize: "14px",
      cursor: "pointer",
      padding: "4px 8px",
    },
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleHamburgerClick = () => {
    if (!showSideMenu) {
      setShowSideMenu(true);
    } else {
      if (userId) {
        setShowProfileOverlay(true);
      } else {
        navigate("/login");
      }
      setShowSideMenu(false);
    }
  };

  return (
    <>
      <button style={styles.hamburgerButton} onClick={handleHamburgerClick}>
        {showSideMenu ? (
          <IoPersonCircleOutline size={30} />
        ) : (
          <GiHamburgerMenu size={30} />
        )}
      </button>

      {showSideMenu && (
        <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
          <div style={styles.sideMenu} onClick={stopPropagation}>
            {/* 上段：中央に「サービスと料金表」、右端に「人アイコン」 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "16px", height: "50px", width: "100%" }}>
              <button
                style={{
                  background: "none",
                  border: "2px solid white",
                  borderRadius: "30px",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "bold",
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowSideMenu(false);
                  navigate("/seo");
                }}
              >
                サービスと料金表
              </button>
              <button
                style={{
                  background: "none",
                  border: "none",
                  position: "absolute",
                  right: 0,
                  fontSize: "30px",
                  color: "white",
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

            {/* 下段：縦並びの各メニュー */}
            <button
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                marginBottom: "16px"
              }}
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
              議事録リスト
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                color: "yellow",
                padding: "10px 0",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                marginBottom: "16px"
              }}
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
              アイテムを購入
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                color: "#FFF",
                padding: "10px 0",
                fontSize: "16px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                marginBottom: "16px"
              }}
              onClick={() => {
                setShowSideMenu(false);
                navigate("/meeting-formats");
              }}
            >
              <BsWrenchAdjustable style={{ marginRight: "8px" }} />
              議事録フォーマット
            </button>

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
                特定商取引法に基づく表記
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileOverlay && (
        <div style={{
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
        }} onClick={() => setShowProfileOverlay(false)}>
          <div style={{
            width: "300px",
            height: "400px",
            background: "rgba(20, 20, 20, 1)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            boxSizing: "border-box",
            position: "relative"
          }} onClick={stopPropagation}>
            <button
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "transparent",
                color: "red",
                fontWeight: "bold",
                padding: "8px 12px",
                borderRadius: "5px",
                border: "2px solid red",
                cursor: "pointer",
                fontFamily: "Impact, sans-serif",
              }}
              onClick={() => {
                const confirmLogout = window.confirm("ログアウトしますか？");
                if (confirmLogout) {
                  auth.signOut();
                  setShowProfileOverlay(false);
                }
              }}
            >
              ログアウト
            </button>
            <IoPersonCircleOutline style={{ fontSize: "160px", color: "gray", marginBottom: "20px", marginTop: "5%" }} />
            <div style={{ textAlign: "center", fontSize: "16px", color: "#FFF", fontFamily: "Impact, sans-serif" }}>
              <p>Email: {userEmail}</p>
              <p>Remaining Seconds: {profileRemainingSeconds}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PurchaseMenu
