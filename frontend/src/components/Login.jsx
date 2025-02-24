import React, { useState } from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { app } from "../firebaseConfig";
import { signInWithGoogle, signInWithApple } from "../firebaseAuth";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { syncUserData } from "../firebaseUserSync"; // Import function for syncing user data
import { useTranslation } from "react-i18next";

const auth = getAuth(app);

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setAlertMessage(t("Please enter your email and password."));
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      // Sign in with Email/Password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // If email verification is not complete, sign out and display an error
      if (!user.emailVerified) {
        await signOut(auth);
        setAlertMessage(
          t("Your email has not been verified. Please click the link in the email to verify your account.")
        );
        setShowAlert(true);
        return;
      }

      // After successful login, sync user data to Firestore
      // ※ Set the 3rd parameter (userIsUnlimited) and 4th parameter (currentCountdown) as needed
      await syncUserData(user, email, false, 0);

      // Navigate to the home screen
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      // Set error message based on error code
      switch (error.code) {
        case "auth/invalid-email":
          setAlertMessage(t("The email address is invalid."));
          break;
        case "auth/user-disabled":
          setAlertMessage(t("This account has been disabled."));
          break;
        case "auth/user-not-found":
          setAlertMessage(t("User not found."));
          break;
        case "auth/wrong-password":
          setAlertMessage(t("Incorrect password."));
          break;
        case "auth/too-many-requests":
          setAlertMessage(t("Too many attempts in a short period. Please wait and try again."));
          break;
        default:
          setAlertMessage(t("Login failed. Please try again."));
      }
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate("/"); // Navigate to home screen after successful Google sign-in
    } catch (error) {
      setAlertMessage(t("Google sign-in failed."));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      navigate("/"); // Navigate to home screen after successful Apple sign-in
    } catch (error) {
      setAlertMessage(t("Apple sign-in failed."));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setAlertMessage(t("Please enter your email address."));
      setShowAlert(true);
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAlertMessage(t("A password reset email has been sent. Please check your email."));
      setShowAlert(true);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      setAlertMessage(t("Failed to send password reset email."));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        color: "white",
      }}
    >
      <h1
        style={{
          fontSize: "40px",
          fontWeight: "700",
          color: "white",
          margin: 0,
          marginBottom: "20px",
        }}
      >
        {t("Log in")}
      </h1>
      <input
        type="email"
        placeholder={t("Email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: "300px",
          height: "40px",
          paddingLeft: "10px",
          borderRadius: "25px",
          border: "1px solid gray",
          marginBottom: "20px",
        }}
      />
      <input
        type="password"
        placeholder={t("Password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "300px",
          height: "40px",
          paddingLeft: "10px",
          borderRadius: "25px",
          border: "1px solid gray",
          marginBottom: "20px",
        }}
      />

      {/* Email login button */}
      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          background: "white",
          color: "black",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.5 : 1,
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        {t("Login")}
      </button>

      {/* Google sign-in */}
      <button
        onClick={handleGoogleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 20px",
          background: "white",
          color: "black",
          border: "1px solid #ccc",
          borderRadius: "5px",
          cursor: "pointer",
          width: "300px",
          marginBottom: "10px",
          fontWeight: "bold",
        }}
      >
        <FcGoogle style={{ marginRight: "10px", fontSize: "20px" }} />
        {t("Sign in with Google")}
      </button>

      {/* Apple sign-in */}
      <button
        onClick={handleAppleSignIn}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 20px",
          background: "black",
          color: "white",
          border: "1px solid white",
          borderRadius: "5px",
          cursor: "pointer",
          width: "300px",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        <FaApple style={{ marginRight: "10px", fontSize: "20px" }} />
        {t("Sign in with Apple")}
      </button>

      {/* Password reset email button */}
      <button
        onClick={handlePasswordReset}
        disabled={isLoading}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: isLoading ? "not-allowed" : "pointer",
          marginBottom: "20px",
          fontWeight: "bold",
        }}
      >
        {t("Forgot your password? Send a reset email.")}
      </button>

      <button
        onClick={() => navigate("/signup")}
        style={{
          color: "red",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("Don't have an account? Click here.")}
      </button>

      {showAlert && (
        <div style={{ color: "red", marginTop: "20px" }}>{alertMessage}</div>
      )}
    </div>
  );
};

export default Login;
