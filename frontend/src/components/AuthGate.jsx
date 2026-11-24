import { useEffect, useState } from "react";

import App from "../App";
import Login from "./Login";
import { api } from "../services/api";

import "./Login.css";

function AuthGate() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Apply the saved theme on the login screen too
  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("lp-theme") || "dark";
  }, []);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await api.getCurrentUser();
        if (active) setUser(response.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setChecking(false);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  if (checking) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-icon">
          <span className="auth-loading-pulse" />
        </div>
        <h2>LanePulse</h2>
        <p>Verifying your session...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <App user={user} onLogout={handleLogout} />;
}

export default AuthGate;