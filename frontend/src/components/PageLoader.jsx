const PageLoader = () => (
  <div style={{
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#080810", gap: "20px",
    fontFamily: "Inter, sans-serif",
  }}>
    {/* Animated logo ring */}
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "2px solid transparent",
        borderTopColor: "#9333ea", borderRightColor: "#6d28d9",
        animation: "spin .8s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: 6, borderRadius: "50%",
        border: "2px solid transparent",
        borderTopColor: "#2563eb", borderLeftColor: "#3b82f6",
        animation: "spin 1.2s linear infinite reverse",
      }} />
      <div style={{
        position: "absolute", inset: 14, borderRadius: "50%",
        background: "linear-gradient(135deg, #6d28d9, #2563eb)",
        boxShadow: "0 0 20px rgba(109,40,217,.5)",
      }} />
    </div>

    <div style={{ textAlign: "center" }}>
      <p style={{
        fontSize: 14, fontWeight: 600, letterSpacing: ".1em",
        textTransform: "uppercase",
        background: "linear-gradient(135deg, #9333ea, #2563eb)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", margin: 0,
      }}>
        TeamOS
      </p>
      <p style={{ fontSize: 12, color: "rgba(160,158,192,.6)", margin: "4px 0 0" }}>
        Loading workspace…
      </p>
    </div>

    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export default PageLoader;
