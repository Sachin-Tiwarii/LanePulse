import { useEffect, useState } from "react";

import { LogOut, UserRound } from "lucide-react";

import App from "../App";

import Login from "./Login";

import { api } from "../services/api";

import "./Login.css";

function AuthGate() {
  const [user, setUser] = useState(null);

  const [checking, setChecking] = useState(true);

  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await api.getCurrentUser();

        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      await api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setLogoutLoading(false);
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

  return (
    <div className="authenticated-app">
      <div className="auth-user-toolbar">
        <div className="auth-user-info">
          <div className="auth-user-avatar">
            <UserRound size={17} />
          </div>

          <div>
            <strong>{user.name}</strong>

            <span>
              {user.isDemo ? "Demo Account" : "Authenticated User"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="auth-logout-button"
          onClick={handleLogout}
          disabled={logoutLoading}
        >
          <LogOut size={16} />

          {logoutLoading ? "Logging out..." : "Logout"}
        </button>
      </div>

      <App />
    </div>
  );
}

export default AuthGate;