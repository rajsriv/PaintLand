import { useState } from 'react';
import { Copy, Check, Download, Sparkles, X, RefreshCw } from 'lucide-react';
import { unK, K } from '../game/constants';

const PRESET_KINGDOMS = [
  {
    name: 'Harbor Haven',
    desc: 'Bustling coastal settlement with fishing docks and windmills',
    season: 0,
    code: 'PL2-0-0.0.1;1.0.1;-1.0.1;0.1.1;0.-1.1;1.1.1;-1.-1.1;1.-1.1;-1.1.1;2.0.1;0.2.1;-2.0.1;0.-2.1;2.1.3;1.2.3;2.2.4;3.2.4;2.3.4;0.0.5;1.1.5;-1.0.5;0.-1.3;-1.-1.2;-2.-1.2;-1.-2.2'
  },
  {
    name: 'Winter Castle',
    desc: 'Snowy fortress surrounded by mountain cliffs and pine forests',
    season: 2,
    code: 'PL2-2-0.0.5;1.0.5;0.1.5;1.1.5;0.-1.5;-1.0.5;-1.-1.5;2.0.2;2.1.2;2.-1.2;-2.0.2;-2.1.2;0.2.3;0.-2.3;1.2.1;-1.2.1;0.3.1;1.3.1'
  },
  {
    name: 'Autumn Farmlands',
    desc: 'Golden sprawling wheat fields with grain mills and rustic fences',
    season: 1,
    code: 'PL2-1-0.0.3;1.0.3;2.0.3;-1.0.3;-2.0.3;0.1.4;1.1.4;2.1.4;0.2.4;1.2.4;2.2.4;0.-1.4;1.-1.4;2.-1.4;0.-2.4;1.-2.4;2.-2.4;-1.1.5;-1.-1.5;-2.1.5'
  }
];

export default function KingdomModal({ isOpen, onClose, grid, seasonId, onImport, setSeasonId }) {
  const [copied, setCopied] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentCode =
    'PL2-' +
    seasonId +
    '-' +
    [...grid.entries()]
      .map(([k, v]) => {
        const [x, y] = unK(k);
        return `${x}.${y}.${v}`;
      })
      .join(';');

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Unable to copy automatically. Please select and copy manually.');
    }
  };

  const handleApply = (codeToLoad = importCode) => {
    const trimmed = codeToLoad.trim();
    const match = /^PL2-([0-3])-([-\d.;]*)$/.exec(trimmed);
    if (!match) {
      setError('Invalid Kingdom code format (expected PL2-<season>-<tiles>)');
      return;
    }
    setError('');
    const newSeason = parseInt(match[1], 10);
    const newGrid = new Map();
    match[2]
      .split(';')
      .filter(Boolean)
      .forEach((s) => {
        const [a, b, c] = s.split('.').map(Number);
        const baseType = c % 10;
        if (baseType > 0 && baseType < 6) newGrid.set(K(a, b), c);
      });

    setSeasonId(newSeason);
    onImport(newGrid);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles className="modal-icon" size={20} />
            <h2>Kingdom Codes & Presets</h2>
          </div>
          <button className="icon-btn close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Export Current Kingdom */}
          <div className="modal-section">
            <label className="section-label">Your Current Kingdom Code</label>
            <div className="code-input-wrapper">
              <input
                type="text"
                readOnly
                value={currentCode}
                className="code-input"
                onClick={(e) => e.target.select()}
              />
              <button className="copy-action-btn" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <p className="hint-text">Share this code with friends to let them view and continue your kingdom.</p>
          </div>

          {/* Import Kingdom */}
          <div className="modal-section">
            <label className="section-label">Import a Kingdom Code</label>
            <div className="code-input-wrapper">
              <input
                type="text"
                placeholder="Paste PL2-... code here"
                value={importCode}
                onChange={(e) => {
                  setImportCode(e.target.value);
                  setError('');
                }}
                className={`code-input ${error ? 'input-error' : ''}`}
              />
              <button
                className="btn-primary"
                onClick={() => handleApply()}
                disabled={!importCode.trim()}
              >
                <Download size={16} />
                <span>Load</span>
              </button>
            </div>
            {error && <span className="error-text">{error}</span>}
          </div>

          {/* Presets */}
          <div className="modal-section">
            <label className="section-label">Explore Preset Kingdoms</label>
            <div className="presets-grid">
              {PRESET_KINGDOMS.map((preset) => (
                <div key={preset.name} className="preset-card">
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    <p>{preset.desc}</p>
                  </div>
                  <button
                    className="btn-secondary small"
                    onClick={() => handleApply(preset.code)}
                  >
                    <RefreshCw size={14} />
                    <span>Load</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
