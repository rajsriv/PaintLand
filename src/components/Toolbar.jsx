import { RotateCcw, RotateCw, Trash2, Home, Volume2, VolumeX, Share2, Dices } from 'lucide-react';
import { TOOLS, SEASONS } from '../game/constants';

export default function Toolbar({
  activeTool,
  onSelectTool,
  seasonId,
  onChangeSeason,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onClear,
  onRandomize,
  onHome,
  onOpenModal,
  isMuted,
  onToggleSound
}) {
  return (
    <div className="toolbar-root" role="toolbar" aria-label="Painting tools">
      {/* Tools Section */}
      <div className="toolbar-group">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.name} [${tool.key}] — ${tool.desc}`}
              aria-pressed={isActive}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-name">{tool.name}</span>
              <span className="shortcut-badge">{tool.key}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar-divider" />

      {/* Season Selector */}
      <div className="toolbar-group season-group">
        {SEASONS.map((season) => (
          <button
            key={season.id}
            className={`season-btn ${seasonId === season.id ? 'active' : ''}`}
            onClick={() => onChangeSeason(season.id)}
            title={`Switch to ${season.name} theme`}
          >
            <span>{season.icon}</span>
            <span className="season-name">{season.name}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Action Controls */}
      <div className="toolbar-group actions-group">
        <button
          className="icon-action-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo [Ctrl+Z]"
          aria-label="Undo"
        >
          <RotateCcw size={16} />
        </button>

        <button
          className="icon-action-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo [Ctrl+Y]"
          aria-label="Redo"
        >
          <RotateCw size={16} />
        </button>

        <button
          className="icon-action-btn"
          onClick={onHome}
          title="Center Camera [H]"
          aria-label="Home"
        >
          <Home size={16} />
        </button>

        <button
          className="icon-action-btn"
          onClick={onRandomize}
          title="Generate New Random Island [R]"
          aria-label="Randomize Island"
        >
          <Dices size={16} />
        </button>

        <button
          className="icon-action-btn"
          onClick={onClear}
          title="Clear Kingdom"
          aria-label="Clear"
        >
          <Trash2 size={16} />
        </button>

        <button
          className="icon-action-btn"
          onClick={onToggleSound}
          title={isMuted ? 'Unmute Sound [S]' : 'Mute Sound [S]'}
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <button
          className="btn-share"
          onClick={onOpenModal}
          title="Share & Load Kingdom Codes"
        >
          <Share2 size={15} />
          <span>Kingdom</span>
        </button>
      </div>
    </div>
  );
}
