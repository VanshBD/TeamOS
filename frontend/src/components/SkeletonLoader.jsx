import React from "react";

export const Skeleton = ({ width, height, borderRadius = 4, style = {}, className = "" }) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ width, height, borderRadius, ...style }}
  >
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .skeleton-shimmer {
        background: linear-gradient(90deg,
          rgba(255,255,255,.03) 25%,
          rgba(109,40,217,.12) 50%,
          rgba(255,255,255,.03) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
        flex-shrink: 0;
      }
    `}</style>
  </div>
);

export const UserListItemSkeleton = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", width: "100%", boxSizing: "border-box" }}>
    <Skeleton width={38} height={38} borderRadius="50%" />
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <Skeleton width="50%" height={12} />
      <Skeleton width="30%" height={10} />
    </div>
  </div>
);

export const ProfileStatsSkeleton = () => (
  <div style={{ display: "flex", justifyContent: "center", gap: 32, padding: "20px 0" }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Skeleton width={24} height={20} />
        <Skeleton width={50} height={12} />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ count = 4, type = "user" }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {Array.from({ length: count }).map((_, i) => (
        type === "user" ? <UserListItemSkeleton key={i} /> : <Skeleton key={i} width="100%" height={40} style={{ margin: "4px 0" }} />
      ))}
    </div>
  );
};
