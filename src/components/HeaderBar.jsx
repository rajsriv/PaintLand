import { ZoomIn, ZoomOut, MessageSquare, Users, Home, RotateCcw, RotateCw, Compass } from 'lucide-react';

export default function HeaderBar({
  homes,
  villagers,
  message,
  zoom,
  onZoomIn,
  onZoomOut,
  rotation = 0,
  onRotateLeft,
  onRotateRight,
  windState,
  onCycleWind
}) {
  return (
    <header className="header-root">
      {/* Brand */}
      <div className="brand-group">
        <span className="brand-icon">🏝️</span>
        <div className="brand-text">
          <h1 className="brand-title">Paintland</h1>
          <span className="brand-subtitle">Sandbox Realm</span>
        </div>
      </div>

      {/* Living Realm Stats */}
      <div className="stats-group">
        <div className="stat-pill" title={`${homes} homes established`}>
          <Home size={14} className="stat-icon" />
          <span className="stat-value">{homes}</span>
          <span className="stat-label">{homes === 1 ? 'home' : 'homes'}</span>
        </div>

        <div className="stat-pill" title={`${villagers} villagers living happily`}>
          <Users size={14} className="stat-icon" />
          <span className="stat-value">{villagers}</span>
          <span className="stat-label">{villagers === 1 ? 'villager' : 'villagers'}</span>
        </div>

        {/* Live Weather / Wind Event */}
        {windState && (
          <button
            className={`stat-pill wind-pill ${windState.isTornado ? 'tornado-active' : ''}`}
            onClick={onCycleWind}
            title={`Weather: ${windState.name} (${windState.weight ? Math.round(windState.weight * 100) + '% rarity' : 'Custom'}). Click to switch / test Tornado!`}
            aria-label="Change weather state"
          >
            <span className="stat-icon">{windState.icon}</span>
            <span className="stat-value">{windState.name}</span>
            {windState.isTornado && <span className="tornado-badge">VORTEX</span>}
          </button>
        )}

        {/* Live Banter */}
        <div className="chatter-pill" title="Villager banter">
          <MessageSquare size={14} className="chatter-icon" />
          <span className="chatter-text">{message}</span>
        </div>
      </div>

      {/* View & Camera Controls (Rotation + Zoom) */}
      <div className="view-controls-group">
        {/* Cardinal 90-degree stepped camera rotation */}
        <div className="rotate-group">
          <button
            className="icon-action-btn small"
            onClick={onRotateLeft}
            title="Rotate Left 90° [Q]"
            aria-label="Rotate camera left 90 degrees"
          >
            <RotateCcw size={14} />
          </button>
          <div className="rotate-badge" title={`Camera orientation: ${rotation * 90}°`}>
            <Compass
              size={14}
              className="compass-icon"
              style={{
                transform: `rotate(${-rotation * 90}deg)`,
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            <span className="rotate-text">{rotation * 90}°</span>
          </div>
          <button
            className="icon-action-btn small"
            onClick={onRotateRight}
            title="Rotate Right 90° [E]"
            aria-label="Rotate camera right 90 degrees"
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-group">
          <button
            className="icon-action-btn small"
            onClick={onZoomOut}
            title="Zoom out [-]"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button
            className="icon-action-btn small"
            onClick={onZoomIn}
            title="Zoom in [+]"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
