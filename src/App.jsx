import { useState, useRef, useEffect, useCallback } from 'react';
import HeaderBar from './components/HeaderBar';
import Toolbar from './components/Toolbar';
import CanvasStage from './components/CanvasStage';
import KingdomModal from './components/KingdomModal';
import { createStarterWorld, SEASONS } from './game/constants';
import { sound } from './game/sound';
import { getWindState, setWindOverride, getWindOverride } from './game/engine';
import './App.css';

export default function App() {
  const [grid, setGrid] = useState(() => createStarterWorld());
  const [activeTool, setActiveTool] = useState(1); // 1 = Land
  const [seasonId, setSeasonId] = useState(0); // 0 = Spring
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0); // 0: 0°, 1: 90°, 2: 180°, 3: 270°
  const [windState, setWindState] = useState(() => getWindState(performance.now()));
  const [stats, setStats] = useState({
    homes: 3,
    villagers: 6,
    message: 'Paint land, then build homes. Right-drag or use ✋ Move to pan; scroll to zoom.'
  });

  const camRef = useRef(null);

  // Periodically poll weather state every 1.2s for live badge
  useEffect(() => {
    const timer = setInterval(() => {
      setWindState(getWindState(performance.now()));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const handleCycleWind = useCallback(() => {
    const modes = [null, 'still', 'gentle', 'brisk', 'gale', 'tornado'];
    const curOverride = getWindOverride();
    const curIdx = modes.indexOf(curOverride);
    const nextMode = modes[(curIdx + 1) % modes.length];
    setWindOverride(nextMode);
    const updated = getWindState(performance.now());
    setWindState(updated);
    sound.play('click');
    setStats((prev) => ({
      ...prev,
      message:
        nextMode === null
          ? 'Weather set to Auto: cycling naturally based on rarities.'
          : nextMode === 'tornado'
          ? '🌪️ TORNADO WARNING! Strong whirlwind vortex unleashed!'
          : nextMode === 'still'
          ? '🍃 Total stillness settles over the woods.'
          : nextMode === 'gentle'
          ? '🌾 A soft, gentle breeze drifts across the meadow.'
          : nextMode === 'brisk'
          ? '💨 Brisk winds sweep through the realm!'
          : '⛈️ Strong gale gusts bending the forest trees!'
    }));
  }, []);

  // Record history snapshot before a new stroke
  const handleRecordHistory = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev, new Map(grid)];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]); // Clear redo stack on new action
  }, [grid]);

  // Undo
  const handleUndo = useCallback(() => {
    if (!history.length) return;
    const prevGrid = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, new Map(grid)]);
    setGrid(new Map(prevGrid));
    sound.play('undo');
  }, [history, grid]);

  // Redo
  const handleRedo = useCallback(() => {
    if (!redoStack.length) return;
    const nextGrid = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, new Map(grid)]);
    setGrid(new Map(nextGrid));
    sound.play('undo');
  }, [redoStack, grid]);

  // Clear
  const handleClear = useCallback(() => {
    handleRecordHistory();
    setGrid(new Map());
    sound.play('water');
  }, [handleRecordHistory]);

  // Randomize island terrain
  const handleRandomize = useCallback(() => {
    handleRecordHistory();
    const newWorld = createStarterWorld();
    setGrid(newWorld);
    sound.play('water');
    if (camRef.current?.centerHome) {
      camRef.current.centerHome();
      setZoomLevel(1);
    }
    setStats((prev) => ({
      ...prev,
      message: '✨ A new procedural archipelago has formed from the depths!'
    }));
  }, [handleRecordHistory]);

  // Center Home
  const handleHome = useCallback(() => {
    if (camRef.current?.centerHome) {
      camRef.current.centerHome();
      setZoomLevel(1);
    }
  }, []);

  // Rotation helpers (90° cardinal steps)
  const handleRotateLeft = useCallback(() => {
    if (camRef.current?.rotate) {
      camRef.current.rotate(-1);
    }
  }, []);

  const handleRotateRight = useCallback(() => {
    if (camRef.current?.rotate) {
      camRef.current.rotate(1);
    }
  }, []);

  // Zoom helpers
  const handleZoomIn = () => {
    if (camRef.current?.setZoom) {
      const next = (camRef.current.zoom || 1) * 1.15;
      camRef.current.setZoom(next);
      setZoomLevel(camRef.current.zoom);
    }
  };

  const handleZoomOut = () => {
    if (camRef.current?.setZoom) {
      const next = (camRef.current.zoom || 1) * 0.85;
      camRef.current.setZoom(next);
      setZoomLevel(camRef.current.zoom);
    }
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Season changer
  const handleChangeSeason = (newSeason) => {
    setSeasonId(newSeason);
    sound.setSeason(newSeason);
    sound.play('season');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      switch (e.key) {
        case '1':
          setActiveTool(1);
          break;
        case '2':
          setActiveTool(4);
          break;
        case '3':
          setActiveTool(5);
          break;
        case '4':
          setActiveTool(3);
          break;
        case '5':
          setActiveTool(2);
          break;
        case '6':
          setActiveTool(0);
          break;
        case ' ':
        case 'm':
        case 'M':
          setActiveTool((prev) => (prev === -1 ? 1 : -1));
          break;
        case 'q':
        case 'Q':
          handleRotateLeft();
          break;
        case 'e':
        case 'E':
          handleRotateRight();
          break;
        case 'h':
        case 'H':
          handleHome();
          break;
        case 'r':
        case 'R':
          handleRandomize();
          break;
        case 's':
        case 'S':
          handleToggleSound();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case 'Escape':
          setIsModalOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleHome, handleRandomize, handleRotateLeft, handleRotateRight]);

  const activeSeason = SEASONS[seasonId] || SEASONS[0];

  return (
    <div
      className="app-container"
      style={{
        '--sky-gradient-start': activeSeason.skyGradient[0],
        '--sky-gradient-end': activeSeason.skyGradient[1]
      }}
    >
      <HeaderBar
        homes={stats.homes}
        villagers={stats.villagers}
        message={stats.message}
        zoom={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        rotation={rotation}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        windState={windState}
        onCycleWind={handleCycleWind}
      />

      <CanvasStage
        grid={grid}
        setGrid={setGrid}
        activeTool={activeTool}
        seasonId={seasonId}
        onRecordHistory={handleRecordHistory}
        onUpdateStats={setStats}
        onZoomChange={setZoomLevel}
        onRotateChange={setRotation}
        camRef={camRef}
      />

      <Toolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        seasonId={seasonId}
        onChangeSeason={handleChangeSeason}
        onUndo={handleUndo}
        canUndo={history.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        onClear={handleClear}
        onRandomize={handleRandomize}
        onHome={handleHome}
        onOpenModal={() => setIsModalOpen(true)}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
      />

      <KingdomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        grid={grid}
        seasonId={seasonId}
        setSeasonId={setSeasonId}
        onImport={(importedGrid) => {
          handleRecordHistory();
          setGrid(importedGrid);
        }}
      />
    </div>
  );
}
