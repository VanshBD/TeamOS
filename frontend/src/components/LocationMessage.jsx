import { useState, useEffect, useRef } from "react";
import { useChatContext } from "stream-chat-react";
import { Navigation2Icon, MapPinIcon, ExternalLinkIcon } from "lucide-react";

// OpenStreetMap static tile — no API key needed
const mapUrl = (lat, lng, zoom = 15) =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=300x160&markers=${lat},${lng},red-pushpin`;

// Fallback: use a simple tile URL approach
const tileUrl = (lat, lng, zoom = 15) => {
  // Use openstreetmap tile server directly as an img src
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};

const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

/* ── Current Location Card ──────────────────────────────── */
export const CurrentLocationCard = ({ attachment, isOwnMessage }) => {
  const lat = attachment.latitude;
  const lng = attachment.longitude;
  const [imgError, setImgError] = useState(false);

  if (!lat || !lng) return null;

  const tile = tileUrl(lat, lng, 15);
  const link = mapsLink(lat, lng);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`loc-card ${isOwnMessage ? "loc-card--own" : ""}`}
    >
      {/* Map preview */}
      <div className="loc-card__map">
        {!imgError ? (
          <img
            src={tile}
            alt="Map"
            className="loc-card__map-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="loc-card__map-fallback">
            <MapPinIcon className="w-8 h-8 text-red-400" />
          </div>
        )}
        {/* Pin overlay */}
        <div className="loc-card__pin">
          <div className="loc-card__pin-dot" />
          <div className="loc-card__pin-shadow" />
        </div>
        {/* Gradient overlay at bottom */}
        <div className="loc-card__map-gradient" />
      </div>

      {/* Info row */}
      <div className="loc-card__info">
        <div className="loc-card__info-left">
          <MapPinIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div>
            <p className="loc-card__title">Current Location</p>
            <p className="loc-card__coords">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
        </div>
        <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>
    </a>
  );
};

/* ── Live Location Card ─────────────────────────────────── */
export const LiveLocationCard = ({ attachment, message, isOwnMessage }) => {
  const { client } = useChatContext();

  // Coords come from the attachment initially, then from message.live_lat/live_lng updates
  const [lat, setLat] = useState(
    message.live_lat ?? attachment.latitude
  );
  const [lng, setLng] = useState(
    message.live_lng ?? attachment.longitude
  );
  const [lastUpdate, setLastUpdate] = useState(
    message.live_updated_at ?? attachment.started_at ?? Date.now()
  );
  const [imgError, setImgError] = useState(false);
  const [expired, setExpired] = useState(false);

  const startedAt = attachment.started_at || Date.now();
  const durationMs = attachment.duration_ms || 5 * 60 * 1000;
  const endsAt = startedAt + durationMs;

  // Check expiry every 10s
  useEffect(() => {
    const check = () => setExpired(Date.now() >= endsAt);
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [endsAt]);

  // Listen for message.updated — Stream pushes this via WebSocket when partialUpdateMessage is called
  useEffect(() => {
    if (!client || expired) return;
    const handler = (event) => {
      const updated = event.message;
      if (!updated || updated.id !== message.id) return;
      // Coords stored as top-level custom fields on the message
      if (updated.live_lat != null && updated.live_lng != null) {
        setLat(updated.live_lat);
        setLng(updated.live_lng);
        setLastUpdate(updated.live_updated_at ?? Date.now());
        setImgError(false); // force map tile reload
      }
    };
    client.on("message.updated", handler);
    return () => client.off("message.updated", handler);
  }, [client, message.id, expired]);

  if (!lat || !lng) return null;

  const tile = tileUrl(lat, lng, 15);
  const link = mapsLink(lat, lng);
  const senderName = message.user?.name || message.user?.id || "User";
  const senderImg = message.user?.image;

  // Compute "updated X ago" reactively
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const secAgo = Math.floor((now - lastUpdate) / 1000);
  const updateLabel = secAgo < 10
    ? "Updated just now"
    : secAgo < 60
      ? `Updated ${secAgo}s ago`
      : `Updated ${Math.floor(secAgo / 60)}m ago`;

  // Remaining time
  const remainMs = Math.max(0, endsAt - now);
  const remainMin = Math.ceil(remainMs / 60000);
  const remainLabel = remainMin >= 60
    ? `${Math.floor(remainMin / 60)}h ${remainMin % 60}m left`
    : `${remainMin}m left`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`loc-card loc-card--live ${isOwnMessage ? "loc-card--own" : ""} ${expired ? "loc-card--expired" : ""}`}
    >
      {/* Map */}
      <div className="loc-card__map">
        {!imgError ? (
          <img
            src={tile}
            alt="Live map"
            className="loc-card__map-img"
            onError={() => setImgError(true)}
            key={`${lat}-${lng}`} // re-render on coord change
          />
        ) : (
          <div className="loc-card__map-fallback">
            <Navigation2Icon className="w-8 h-8 text-blue-400" />
          </div>
        )}

        {/* Moving avatar pin */}
        <div className="loc-card__avatar-pin">
          {senderImg ? (
            <img src={senderImg} alt={senderName} className="loc-card__avatar-img" />
          ) : (
            <div className="loc-card__avatar-placeholder">
              {senderName[0].toUpperCase()}
            </div>
          )}
          {!expired && <div className="loc-card__avatar-pulse" />}
        </div>

        <div className="loc-card__map-gradient" />

        {/* Live badge */}
        {!expired && (
          <div className="loc-card__live-badge">
            <span className="loc-card__live-dot" />
            LIVE
          </div>
        )}
        {expired && (
          <div className="loc-card__expired-badge">Ended</div>
        )}
      </div>

      {/* Info */}
      <div className="loc-card__info">
        <div className="loc-card__info-left">
          <Navigation2Icon className={`w-4 h-4 flex-shrink-0 ${expired ? "text-gray-400" : "text-blue-500"}`} />
          <div>
            <p className="loc-card__title">
              {expired ? "Live Location Ended" : `${senderName}'s Live Location`}
            </p>
            <p className="loc-card__coords">
              {expired
                ? "This location is no longer being shared"
                : updateLabel
              }
            </p>
            {!expired && (
              <p className="loc-card__remain">{remainLabel}</p>
            )}
          </div>
        </div>
        <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>
    </a>
  );
};
