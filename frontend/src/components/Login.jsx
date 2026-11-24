
import { useState } from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { api } from "../services/api";

import "./Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.login({
        email,
        password,
      });

      onLogin(response.user);
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setDemoLoading(true);

    try {
      const response = await api.demoLogin();

      onLogin(response.user);
    } catch (err) {
      setError(
        err.message || "Unable to start demo session."
      );
    } finally {
      setDemoLoading(false);
    }
  };

  const isLoading = loading || demoLoading;

  return (
    <main className="login-page">
      <div className="login-background">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
        <div className="login-grid" />
      </div>

      <section className="login-container">
        <div className="login-brand">
          <div className="login-brand-icon">
            <img
              src="/logo.png"
              alt="LanePulse Logo"
            />
          </div>

          <div>
            <h1>LanePulse</h1>
            <p>Green Corridor AI</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-heading">
            <div className="login-heading-icon">
              <LockKeyhole size={21} />
            </div>

            <span className="login-access-label">
              SECURE ACCESS
            </span>

            <h2>Welcome back</h2>

            <p>
              Sign in to access the LanePulse command
              dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-email">
                Email address
              </label>

              <div className="login-input-wrapper">
                <Mail size={18} />

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="login-input-wrapper">
                <LockKeyhole size={18} />

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={isLoading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Login to Dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span />
            <p>OR</p>
            <span />
          </div>

          <button
            type="button"
            className="demo-login-button"
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            {demoLoading ? (
              <>
                <span className="login-spinner" />
                Starting demo...
              </>
            ) : (
              <>
                <Zap size={19} />
                Continue as Demo User
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <p className="demo-description">
            Explore all LanePulse features without entering
            personal credentials.
          </p>
        </div>

        <div className="login-footer">
          <div>
            <ShieldCheck size={15} />
            <span>Secure authentication</span>
          </div>

          <span className="login-footer-dot">•</span>

          <span>LanePulse Project Demo</span>
        </div>
      </section>
    </main>
  );
}

export default Login;
