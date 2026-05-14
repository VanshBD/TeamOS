import React from 'react';

export const OrbitLoader = ({ size = 50, text = "", inline = false }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: inline ? 'row' : 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: inline ? '12px' : '20px',
      padding: inline ? '0' : '24px',
      width: '100%'
    }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {/* Core */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: size * 0.25, height: size * 0.25, borderRadius: '50%',
          background: '#a78bfa',
          boxShadow: '0 0 15px #a78bfa, 0 0 30px #7c3aed',
          animation: 'core-pulse 2s ease-in-out infinite'
        }} />
        {/* Ring 1 */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '2px solid rgba(167, 139, 250, 0.2)',
          borderTopColor: '#c4b5fd', borderBottomColor: '#8b5cf6',
          animation: 'orbit-spin 1.5s linear infinite'
        }} />
        {/* Ring 2 */}
        <div style={{
          position: 'absolute', inset: -Math.round(size * 0.2), borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          borderLeftColor: '#7c3aed', borderRightColor: '#6d28d9',
          animation: 'orbit-spin 2.5s linear infinite reverse'
        }} />
      </div>
      {text && (
        <p style={{
          fontSize: inline ? 13 : 15, 
          fontWeight: 700, 
          letterSpacing: '.06em', 
          margin: 0,
          background: 'linear-gradient(135deg, #e9d5ff, #c4b5fd, #a78bfa)',
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          animation: 'text-pulse 2s ease-in-out infinite',
          whiteSpace: 'nowrap'
        }}>
          {text}
        </p>
      )}
      <style>{`
        @keyframes orbit-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes core-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; box-shadow: 0 0 20px #c4b5fd, 0 0 40px #a78bfa; }
        }
        @keyframes text-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.5)); }
        }
      `}</style>
    </div>
  )
}

const PageLoader = ({ text = "Loading workspace…" }) => (
  <div style={{
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#080810",
    fontFamily: "Inter, sans-serif",
  }}>
    <OrbitLoader size={70} text={text} />
  </div>
);

export default PageLoader;
