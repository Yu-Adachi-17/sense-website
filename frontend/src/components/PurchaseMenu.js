import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaTicketAlt, FaCircle } from "react-icons/fa"; // ✅ チケットアイコンと処理中マーク

export function PurchaseMenu() {
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // ✅ ページ遷移用

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // ✅ 商品購入ボタンのクリック処理（購入する商品を指定）
    const handleBuyClick = async (productId) => {
        setLoading(true);
        try {
            const response = await fetch("https://sense-website-production.up.railway.app/api/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ productId }), // ✅ 選択した商品IDを送信
                credentials: "include",
            });
            const data = await response.json();
            console.log("[DEBUG] Stripe Response:", data);
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error("[ERROR] Checkout session URL not found", data);
            }
        } catch (error) {
            console.error("[ERROR] Error during checkout:", error);
        } finally {
            setLoading(false);
        }
    };

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
            transform: showSideMenu ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.5s ease-out",
        },
        loginButton: {
            backgroundColor: "#fff",
            color: "#000",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "20px", // ✅ アイテム購入ボタンとの間隔を調整
        },
        buyButton: {
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            fontSize: "16px",
            fontWeight: "bold",
            opacity: loading ? 0.7 : 1,
            marginTop: "10px", // ✅ ログインボタンの下に配置
            marginLeft: "10px",
        },
        ticketIcon: {
            color: "yellow",
            fontSize: "20px",
            marginRight: "8px",
            opacity: loading ? 0.7 : 1,
        },
        text: {
            color: "yellow",
            fontSize: "16px",
            fontWeight: "bold",
            opacity: loading ? 0.7 : 1,
        },
        loadingIcon: {
            color: "orange",
            fontSize: "7px",
            marginLeft: "8px",
        },
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    return (
        <>
            {/* 右上のハンバーガーメニューアイコン */}
            <button style={styles.hamburgerButton} onClick={() => setShowSideMenu(true)}>
                <GiHamburgerMenu size={24} />
            </button>

            {/* サイドメニュー用オーバーレイ */}
            {showSideMenu && (
                <div style={styles.sideMenuOverlay} onClick={() => setShowSideMenu(false)}>
                    <div style={styles.sideMenu} onClick={stopPropagation}>
                        {/* ✅ 追加：ログインボタン */}
                        <button style={styles.loginButton} onClick={() => navigate("/login")}>
                            ログイン
                        </button>

                        {/* ✅ 「120分を買う」ボタン */}
                        <button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_120MIN)} style={styles.buyButton} disabled={loading}>
                            <FaTicketAlt style={styles.ticketIcon} />
                            <span style={styles.text}>120分を買う</span>
                            {loading && <FaCircle style={styles.loadingIcon} />}
                        </button>

                        {/* ✅ 「1200分を買う」ボタン */}
                        <button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_1200MIN)} style={styles.buyButton} disabled={loading}>
                            <FaTicketAlt style={styles.ticketIcon} />
                            <span style={styles.text}>1200分を買う</span>
                            {loading && <FaCircle style={styles.loadingIcon} />}
                        </button>

                        {/* ✅ 「サブスクリプションに登録」ボタン */}
                        <button onClick={() => handleBuyClick(process.env.REACT_APP_STRIPE_PRODUCT_UNLIMITED)} style={styles.buyButton} disabled={loading}>
                            <FaTicketAlt style={styles.ticketIcon} />
                            <span style={styles.text}>サブスクリプションに登録</span>
                            {loading && <FaCircle style={styles.loadingIcon} />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default PurchaseMenu;
