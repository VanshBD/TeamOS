import "../styles/auth.css";
import { SignInButton } from "@clerk/clerk-react";

const AuthPage = () => {
  return (
    <div className="auth-container">
      {/* ── Left: hero content ── */}
      <div className="auth-left">
        <div className="auth-hero">
          <div className="brand-container">
            <img src="/logo-2.png" alt="TeamOS" className="brand-logo" />
            <span className="brand-name">TeamOS</span>
          </div>

          <h1 className="hero-title">Where Work<br />Happens ✨</h1>

          <p className="hero-subtitle">
            Connect with your team instantly through secure, real-time messaging.
            Experience seamless collaboration with powerful features designed for modern teams.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Real-time messaging &amp; channels</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎥</span>
              <span>Video calls &amp; meetings</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Polls, reactions &amp; file sharing</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Secure &amp; private</span>
            </div>
          </div>

          <SignInButton mode="modal">
            <button className="cta-button">
              Get Started with TeamOS
              <span className="button-arrow">→</span>
            </button>
          </SignInButton>
        </div>
      </div>

      {/* ── Right: illustration ── */}
      <div className="auth-right">
        <div className="auth-image-container">
          <img src="/auth-i.png" alt="TeamOS workspace preview" className="auth-image" />
          <div className="image-overlay" />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
