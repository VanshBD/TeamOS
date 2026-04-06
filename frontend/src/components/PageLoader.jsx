const PageLoader = () => (
  <div style={{
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#080810", gap: "18px",
    fontFamily: "Inter, sans-serif",
  }}>
    {/* Logo with spinning ring */}
    <div style={{ position: "relative", width: 72, height: 72 }}>
      {/* Outer spin ring */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "2px solid transparent",
        borderTopColor: "#9333ea", borderRightColor: "#6d28d9",
        animation: "spin .9s linear infinite",
      }} />
      {/* Inner spin ring */}
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%",
        border: "2px solid transparent",
        borderTopColor: "#3b82f6", borderLeftColor: "#2563eb",
        animation: "spin 1.3s linear infinite reverse",
      }} />
      {/* Logo image centered */}
      <div style={{
        position: "absolute", inset: 10, borderRadius: "50%",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(109,40,217,.15)",
        boxShadow: "0 0 20px rgba(109,40,217,.4)",
      }}>
        <img
          src="/logo-2.png"
          alt="TeamOS"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      </div>
    </div>

    <div style={{ textAlign: "center" }}>
      <p style={{
        fontSize: 15, fontWeight: 700, letterSpacing: ".06em",
        background: "linear-gradient(135deg, #c4b5fd, #a78bfa, #818cf8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", margin: 0,
      }}>
        TeamOS
      </p>
      <p style={{ fontSize: 12, color: "rgba(160,158,192,.5)", margin: "5px 0 0" }}>
        Loading workspace…
      </p>
    </div>

    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export default PageLoader;
