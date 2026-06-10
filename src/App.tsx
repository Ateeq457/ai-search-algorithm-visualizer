import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Target,
  Flag,
  Grid3X3,
  ChevronDown,
  Info,
  BarChart3,
  Gauge,
  Route,
  GitBranch,
  Timer,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Settings2,
  MousePointer2,
  Wand2,
  Activity,
  Brain,
} from 'lucide-react';
import {
  CellData,
  CellType,
  Algorithm,
  SearchSpeed,
  SearchStats,
  Position,
  ALGORITHM_INFO,
  AnimationState,
} from './types';
import {
  createEmptyGrid,
  generateRandomMaze,
  generateRecursiveMaze,
} from './utils/mazeGenerator';
import { executeSearch, Grid } from './utils/algorithms/searchAlgorithms';

const DEFAULT_ROWS = 21;
const DEFAULT_COLS = 49;

function createCell(row: number, col: number): CellData {
  return {
    row,
    col,
    type: CellType.EMPTY,
    isWall: false,
    isVisited: false,
    isExplored: false,
    isPath: false,
    isCurrent: false,
    distance: Infinity,
    heuristic: 0,
    totalCost: Infinity,
    previousCell: null,
    visitOrder: -1,
  };
}

// Color constants
const COLORS = {
  start: '#10b981',
  goal: '#ef4444',
  wall: '#0f172a',
  visited: '#3b82f6',
  visitedLight: 'rgba(59, 130, 246, 0.4)',
  path: '#f59e0b',
  pathGlow: 'rgba(245, 158, 11, 0.5)',
  current: '#06b6d4',
  currentGlow: 'rgba(6, 182, 212, 0.5)',
  empty: 'rgba(30, 41, 59, 0.4)',
  emptyHover: 'rgba(51, 65, 85, 0.5)',
  gridLine: 'rgba(255, 255, 255, 0.03)',
};

export default function App() {
  const [rows] = useState(DEFAULT_ROWS);
  const [cols] = useState(DEFAULT_COLS);
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLS));
  const [start, setStart] = useState<Position>({ row: 10, col: 10 });
  const [goal, setGoal] = useState<Position>({ row: 10, col: 39 });
  const [algorithm, setAlgorithm] = useState<Algorithm>(Algorithm.ASTAR);
  const [speed, setSpeed] = useState<SearchSpeed>(SearchSpeed.FAST);
  const [animation, setAnimation] = useState<AnimationState>({
    isRunning: false,
    isPaused: false,
    isComplete: false,
    speed: SearchSpeed.FAST,
    currentStep: 0,
    totalSteps: 0,
  });
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [drawMode, setDrawMode] = useState<'wall' | 'start' | 'goal'>('wall');
  const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [visitedCells, setVisitedCells] = useState<Set<string>>(new Set());
  const [pathCells, setPathCells] = useState<Set<string>>(new Set());
  const [currentCell, setCurrentCell] = useState<string | null>(null);

  const animationRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Initialize grid with start and goal
  useEffect(() => {
    const newGrid = createEmptyGrid(rows, cols);
    newGrid[start.row][start.col] = {
      ...createCell(start.row, start.col),
      type: CellType.START,
    };
    newGrid[goal.row][goal.col] = {
      ...createCell(goal.row, goal.col),
      type: CellType.GOAL,
    };
    setGrid(newGrid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset visual state
  const resetVisualization = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    abortRef.current = true;
    setVisitedCells(new Set());
    setPathCells(new Set());
    setCurrentCell(null);
    setStats(null);
    setAnimation({
      isRunning: false,
      isPaused: false,
      isComplete: false,
      speed,
      currentStep: 0,
      totalSteps: 0,
    });
  }, [speed]);

  // Full reset (clear walls too)
  const fullReset = useCallback(() => {
    resetVisualization();
    const newGrid = createEmptyGrid(rows, cols);
    newGrid[start.row][start.col] = {
      ...createCell(start.row, start.col),
      type: CellType.START,
    };
    newGrid[goal.row][goal.col] = {
      ...createCell(goal.row, goal.col),
      type: CellType.GOAL,
    };
    setGrid(newGrid);
  }, [rows, cols, start, goal, resetVisualization]);

  // Handle cell click
  const handleCellInteraction = useCallback(
    (row: number, col: number) => {
      if (animation.isRunning) return;

      const newGrid = grid.map(r => r.map(c => ({ ...c })));
      const cell = newGrid[row][col];

      if (drawMode === 'start') {
        if (cell.isWall) return;
        newGrid[start.row][start.col] = {
          ...createCell(start.row, start.col),
          type: CellType.EMPTY,
        };
        cell.type = CellType.START;
        cell.isWall = false;
        setStart({ row, col });
      } else if (drawMode === 'goal') {
        if (cell.isWall) return;
        newGrid[goal.row][goal.col] = {
          ...createCell(goal.row, goal.col),
          type: CellType.EMPTY,
        };
        cell.type = CellType.GOAL;
        cell.isWall = false;
        setGoal({ row, col });
      } else {
        if (cell.type === CellType.START || cell.type === CellType.GOAL) return;
        cell.isWall = !cell.isWall;
        cell.type = cell.isWall ? CellType.WALL : CellType.EMPTY;
      }

      setGrid(newGrid);
    },
    [animation.isRunning, drawMode, start, goal, grid]
  );

  // Mouse handlers for drawing
  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      setIsMouseDown(true);
      handleCellInteraction(row, col);
    },
    [handleCellInteraction]
  );

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      setHoveredCell({ row, col });
      if (isMouseDown && drawMode === 'wall' && !animation.isRunning) {
        const cell = grid[row][col];
        if (cell.type !== CellType.START && cell.type !== CellType.GOAL && !cell.isWall) {
          const newGrid = grid.map(r => r.map(c => ({ ...c })));
          newGrid[row][col].isWall = true;
          newGrid[row][col].type = CellType.WALL;
          setGrid(newGrid);
        }
      }
    },
    [isMouseDown, drawMode, animation.isRunning, grid]
  );

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  // Generate maze
  const generateMaze = useCallback(
    (type: 'random' | 'recursive') => {
      resetVisualization();
      let newGrid: Grid;
      
      switch (type) {
        case 'recursive':
          newGrid = generateRecursiveMaze(grid, start, goal);
          break;
        default:
          newGrid = generateRandomMaze(grid, start, goal, 0.25);
      }

      newGrid[start.row][start.col] = {
        ...createCell(start.row, start.col),
        type: CellType.START,
      };
      newGrid[goal.row][goal.col] = {
        ...createCell(goal.row, goal.col),
        type: CellType.GOAL,
      };

      setGrid(newGrid);
    },
    [grid, start, goal, resetVisualization]
  );

  // Run search algorithm with animation
  const runSearch = useCallback(() => {
    if (animation.isRunning && !animation.isPaused) {
      setAnimation(prev => ({ ...prev, isPaused: true }));
      return;
    }

    if (animation.isPaused) {
      setAnimation(prev => ({ ...prev, isPaused: false }));
      return;
    }

    abortRef.current = false;
    setVisitedCells(new Set());
    setPathCells(new Set());
    setCurrentCell(null);
    setStats(null);

    const startTime = performance.now();
    const result = executeSearch(algorithm, grid, start, goal);
    const endTime = performance.now();

    const totalSteps = result.visitedOrder.length + result.path.length;

    setAnimation({
      isRunning: true,
      isPaused: false,
      isComplete: false,
      speed,
      currentStep: 0,
      totalSteps,
    });

    let step = 0;
    const visited = result.visitedOrder;
    const path = result.path;
    let newVisited = new Set<string>();
    let newPath = new Set<string>();

    const animate = () => {
      if (abortRef.current) return;

      if (step < visited.length) {
        const cell = visited[step];
        const key = `${cell.row},${cell.col}`;
        newVisited = new Set([...newVisited, key]);
        setVisitedCells(new Set(newVisited));
        setCurrentCell(key);
        step++;
        setAnimation(prev => ({ ...prev, currentStep: step }));
        animationRef.current = setTimeout(animate, speed) as unknown as number;
      } else if (step < visited.length + path.length) {
        const pathIdx = step - visited.length;
        const cell = path[pathIdx];
        const key = `${cell.row},${cell.col}`;
        newPath = new Set([...newPath, key]);
        setPathCells(new Set(newPath));
        setCurrentCell(key);
        step++;
        setAnimation(prev => ({ ...prev, currentStep: step }));
        animationRef.current = setTimeout(animate, speed * 2) as unknown as number;
      } else {
        setCurrentCell(null);
        setAnimation(prev => ({
          ...prev,
          isRunning: false,
          isComplete: true,
          currentStep: totalSteps,
        }));
        setStats({
          nodesVisited: visited.length,
          nodesExplored: result.exploredOrder.length,
          pathLength: path.length,
          pathCost: result.pathCost,
          executionTime: endTime - startTime,
          algorithm,
          isPathFound: result.found,
        });
      }
    };

    animationRef.current = setTimeout(animate, speed) as unknown as number;
  }, [algorithm, grid, start, goal, speed, animation]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  // Get cell color based on state
  const getCellStyle = useCallback(
    (cell: CellData): React.CSSProperties => {
      const key = `${cell.row},${cell.col}`;
      const isStart = cell.row === start.row && cell.col === start.col;
      const isGoal = cell.row === goal.row && cell.col === goal.col;
      const isVisited = visitedCells.has(key);
      const isPath = pathCells.has(key);
      const isCurrent = currentCell === key;
      const isHovered = hoveredCell?.row === cell.row && hoveredCell?.col === cell.col;

      let backgroundColor = COLORS.empty;
      let boxShadow = 'none';
      let transform = 'scale(1)';
      let zIndex = 0;

      if (isStart) {
        backgroundColor = COLORS.start;
        boxShadow = `0 0 16px ${COLORS.start}80, 0 0 4px ${COLORS.start}40`;
        transform = 'scale(1.05)';
        zIndex = 10;
      } else if (isGoal) {
        backgroundColor = COLORS.goal;
        boxShadow = `0 0 16px ${COLORS.goal}80, 0 0 4px ${COLORS.goal}40`;
        transform = 'scale(1.05)';
        zIndex = 10;
      } else if (isPath) {
        backgroundColor = COLORS.path;
        boxShadow = `0 0 12px ${COLORS.pathGlow}, 0 0 4px ${COLORS.pathGlow}`;
        zIndex = 5;
      } else if (isCurrent) {
        backgroundColor = COLORS.current;
        boxShadow = `0 0 16px ${COLORS.currentGlow}, 0 0 4px ${COLORS.currentGlow}`;
        transform = 'scale(1.15)';
        zIndex = 8;
      } else if (isVisited) {
        backgroundColor = COLORS.visitedLight;
        boxShadow = `0 0 6px rgba(59, 130, 246, 0.2)`;
      } else if (cell.isWall) {
        backgroundColor = COLORS.wall;
        boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.5)';
      } else if (isHovered && drawMode === 'wall' && !animation.isRunning) {
        backgroundColor = COLORS.emptyHover;
      }

      return {
        backgroundColor,
        boxShadow,
        transform,
        zIndex,
        transition: 'all 150ms ease-out',
        borderRadius: '3px',
      };
    },
    [start, goal, visitedCells, pathCells, currentCell, hoveredCell, drawMode, animation.isRunning]
  );

  // Progress percentage
  const progress = animation.totalSteps > 0 ? (animation.currentStep / animation.totalSteps) * 100 : 0;

  // Wall count
  const wallCount = useMemo(() => grid.flat().filter(c => c.isWall).length, [grid]);

  // Algorithm color
  const getAlgorithmColor = (alg: Algorithm) => {
    const colors: Record<Algorithm, string> = {
      [Algorithm.BFS]: '#3b82f6',
      [Algorithm.DFS]: '#8b5cf6',
      [Algorithm.ASTAR]: '#f59e0b',
      [Algorithm.DIJKSTRA]: '#10b981',
      [Algorithm.GREEDY]: '#ec4899',
    };
    return colors[alg];
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', animationDelay: '2s' }} />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', boxShadow: '0 8px 24px rgba(59,130,246,0.25)' }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0a0e1a]"
                style={{ animation: animation.isRunning ? 'pulse 1s infinite' : 'none' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight"
                style={{ background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI Search Visualizer
              </h1>
              <p className="text-[11px] text-white/35 font-medium tracking-wide uppercase">
                Intelligent Pathfinding Simulation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Algorithm badge */}
            <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getAlgorithmColor(algorithm) }} />
              <span className="text-xs font-semibold text-white/80">
                {ALGORITHM_INFO[algorithm].name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: ALGORITHM_INFO[algorithm].type === 'Informed' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                  color: ALGORITHM_INFO[algorithm].type === 'Informed' ? '#c4b5fd' : '#93c5fd',
                  border: `1px solid ${ALGORITHM_INFO[algorithm].type === 'Informed' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`,
                }}>
                {ALGORITHM_INFO[algorithm].type}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl"
              style={{
                background: animation.isRunning ? 'rgba(245,158,11,0.08)' : animation.isComplete ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${animation.isRunning ? 'rgba(245,158,11,0.15)' : animation.isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <Activity className="w-3.5 h-3.5"
                style={{ color: animation.isRunning ? '#f59e0b' : animation.isComplete ? '#10b981' : 'rgba(255,255,255,0.4)' }} />
              <span className="text-xs font-semibold"
                style={{ color: animation.isRunning ? '#fcd34d' : animation.isComplete ? '#6ee7b7' : 'rgba(255,255,255,0.6)' }}>
                {animation.isRunning ? (animation.isPaused ? 'Paused' : 'Searching...') : animation.isComplete ? 'Complete' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1920px] mx-auto p-5 flex flex-col xl:flex-row gap-5">
        {/* Left Panel - Controls */}
        <aside className="xl:w-[280px] flex flex-col gap-4 shrink-0">
          {/* Algorithm Selection */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.1)' }}>
                <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Algorithm</h3>
            </div>
            
            <div className="space-y-1.5">
              {Object.values(Algorithm).map((alg) => {
                const isActive = algorithm === alg;
                const algColor = getAlgorithmColor(alg);
                return (
                  <button
                    key={alg}
                    onClick={() => {
                      if (!animation.isRunning) {
                        setAlgorithm(alg);
                        resetVisualization();
                      }
                    }}
                    disabled={animation.isRunning}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: isActive ? `${algColor}12` : 'transparent',
                      border: `1px solid ${isActive ? `${algColor}30` : 'transparent'}`,
                      opacity: animation.isRunning ? 0.5 : 1,
                      cursor: animation.isRunning ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        background: isActive ? `${algColor}25` : 'rgba(255,255,255,0.04)',
                        color: isActive ? algColor : 'rgba(255,255,255,0.35)',
                      }}>
                      {alg === 'bfs' ? 'B' : alg === 'dfs' ? 'D' : alg === 'astar' ? 'A' : alg === 'dijkstra' ? 'Dj' : 'G'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate"
                        style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                        {ALGORITHM_INFO[alg].name}
                      </div>
                      <div className="text-[10px] mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {ALGORITHM_INFO[alg].type} • {ALGORITHM_INFO[alg].optimal ? 'Optimal' : 'Fast'}
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: algColor }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Draw Mode */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.1)' }}>
                <MousePointer2 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Draw Mode</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: 'wall' as const, icon: Grid3X3, label: 'Wall', color: '#64748b' },
                { mode: 'start' as const, icon: Flag, label: 'Start', color: '#10b981' },
                { mode: 'goal' as const, icon: Target, label: 'Goal', color: '#ef4444' },
              ].map(({ mode, icon: Icon, label, color }) => {
                const isActive = drawMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => !animation.isRunning && setDrawMode(mode)}
                    disabled={animation.isRunning}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
                    style={{
                      background: isActive ? `${color}15` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? `${color}35` : 'rgba(255,255,255,0.05)'}`,
                      opacity: animation.isRunning ? 0.5 : 1,
                      cursor: animation.isRunning ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? color : 'rgba(255,255,255,0.35)' }} />
                    <span className="text-[10px] font-semibold"
                      style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Maze Generator */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Maze</h3>
            </div>
            
            <div className="space-y-2">
              {[
                { type: 'random' as const, label: 'Random Maze', desc: 'Scattered walls' },
                { type: 'recursive' as const, label: 'Recursive Division', desc: 'Structured corridors' },
              ].map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => !animation.isRunning && generateMaze(type)}
                  disabled={animation.isRunning}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    opacity: animation.isRunning ? 0.5 : 1,
                    cursor: animation.isRunning ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white/75">{label}</div>
                    <div className="text-[10px] text-white/35">{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(6,182,212,0.1)' }}>
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Speed</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { s: SearchSpeed.SLOW, label: '0.5×' },
                { s: SearchSpeed.MEDIUM, label: '1×' },
                { s: SearchSpeed.FAST, label: '2×' },
                { s: SearchSpeed.INSTANT, label: '5×' },
              ].map(({ s, label }) => {
                const isActive = speed === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className="px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                    style={{
                      background: isActive ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#67e8f9' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${isActive ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center - Grid Area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runSearch}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg text-white"
              style={{
                background: animation.isRunning && !animation.isPaused
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : animation.isPaused
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                boxShadow: animation.isRunning && !animation.isPaused
                  ? '0 8px 24px rgba(245,158,11,0.25)'
                  : animation.isPaused
                  ? '0 8px 24px rgba(16,185,129,0.25)'
                  : '0 8px 24px rgba(59,130,246,0.25)',
              }}>
              {animation.isRunning && !animation.isPaused ? (
                <><Pause className="w-4 h-4" /> Pause</>
              ) : animation.isPaused ? (
                <><Play className="w-4 h-4" /> Resume</>
              ) : (
                <><Zap className="w-4 h-4" /> Start Search</>
              )}
            </button>

            <button
              onClick={resetVisualization}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
              <RotateCcw className="w-4 h-4" /> Reset
            </button>

            <button
              onClick={fullReset}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.12)', color: '#fca5a5' }}>
              <XCircle className="w-4 h-4" /> Clear All
            </button>

            {/* Legend */}
            <div className="hidden lg:flex items-center gap-5 ml-auto text-[11px] font-medium"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              {[
                { color: COLORS.start, label: 'Start' },
                { color: COLORS.goal, label: 'Goal' },
                { color: '#1e293b', label: 'Wall', border: true },
                { color: COLORS.visitedLight, label: 'Visited' },
                { color: COLORS.path, label: 'Path' },
              ].map(({ color, label, border }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded"
                    style={{
                      backgroundColor: color,
                      border: border ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {animation.isRunning && (
            <div className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(to right, #3b82f6, #06b6d4)',
                  boxShadow: '0 0 12px rgba(59,130,246,0.4)',
                }}
              />
            </div>
          )}

          {/* Grid Container */}
          <div className="rounded-2xl p-3 backdrop-blur-sm overflow-auto"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              ref={gridRef}
              className="grid gap-[2px] mx-auto select-none"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                maxWidth: '100%',
                aspectRatio: `${cols} / ${rows}`,
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setIsMouseDown(false);
                setHoveredCell(null);
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {grid.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const isStart = cell.row === start.row && cell.col === start.col;
                  const isGoal = cell.row === goal.row && cell.col === goal.col;
                  return (
                    <div
                      key={`${rowIdx}-${colIdx}`}
                      className="aspect-square cursor-pointer"
                      style={getCellStyle(cell)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(rowIdx, colIdx);
                      }}
                      onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                    >
                      {isStart && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flag className="w-3 h-3 text-white drop-shadow-lg" />
                        </div>
                      )}
                      {isGoal && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Target className="w-3 h-3 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cell Info Bar */}
          <div className="flex items-center gap-6 px-4 py-2.5 rounded-xl text-xs"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
            {hoveredCell ? (
              <>
                <span>
                  <span className="text-white/25">Position:</span>{' '}
                  <span className="text-white/60 font-mono">({hoveredCell.row}, {hoveredCell.col})</span>
                </span>
                <span>
                  <span className="text-white/25">Type:</span>{' '}
                  <span className="text-white/60 font-semibold">
                    {grid[hoveredCell.row]?.[hoveredCell.col]?.isWall
                      ? 'Wall'
                      : grid[hoveredCell.row]?.[hoveredCell.col]?.type === CellType.START
                      ? 'Start Node'
                      : grid[hoveredCell.row]?.[hoveredCell.col]?.type === CellType.GOAL
                      ? 'Goal Node'
                      : 'Empty'}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-white/25">Hover over cells for details</span>
            )}
            <span className="ml-auto">
              <span className="text-white/25">Grid:</span>{' '}
              <span className="text-white/50 font-mono">{rows}×{cols}</span>
            </span>
          </div>
        </div>

        {/* Right Panel - Info & Stats */}
        <aside className="xl:w-[280px] flex flex-col gap-4 shrink-0">
          {/* Algorithm Info */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setShowAlgorithmInfo(!showAlgorithmInfo)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-white/90 tracking-tight">Algorithm Info</h3>
              </div>
              <ChevronDown
                className="w-4 h-4 transition-transform duration-200"
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  transform: showAlgorithmInfo ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </button>
            
            {showAlgorithmInfo && (
              <div className="mt-4 space-y-3">
                <p className="text-[11px] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {ALGORITHM_INFO[algorithm].description}
                </p>
                <div className="space-y-0">
                  {[
                    { label: 'Type', value: ALGORITHM_INFO[algorithm].type, isTag: true },
                    { label: 'Optimal', value: ALGORITHM_INFO[algorithm].optimal ? 'Yes' : 'No', isBool: true, positive: ALGORITHM_INFO[algorithm].optimal },
                    { label: 'Complete', value: ALGORITHM_INFO[algorithm].complete ? 'Yes' : 'No', isBool: true, positive: ALGORITHM_INFO[algorithm].complete },
                    { label: 'Time', value: ALGORITHM_INFO[algorithm].timeComplexity, isCode: true },
                    { label: 'Space', value: ALGORITHM_INFO[algorithm].spaceComplexity, isCode: true },
                  ].map(({ label, value, isTag, isBool, positive, isCode }) => (
                    <div key={label} className="flex justify-between items-center py-2.5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                      {isTag ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: ALGORITHM_INFO[algorithm].type === 'Informed' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                            color: ALGORITHM_INFO[algorithm].type === 'Informed' ? '#c4b5fd' : '#93c5fd',
                          }}>
                          {value}
                        </span>
                      ) : isBool ? (
                        <span className="text-[11px] font-semibold"
                          style={{ color: positive ? '#34d399' : '#fb7185' }}>
                          {value}
                        </span>
                      ) : isCode ? (
                        <span className="text-[11px] font-mono" style={{ color: '#67e8f9' }}>
                          {value}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/70">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.1)' }}>
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Statistics</h3>
            </div>
            
            <div className="space-y-2">
              {[
                { icon: Layers, label: 'Nodes Visited', value: stats?.nodesVisited ?? '—', color: '#3b82f6', suffix: '' },
                { icon: Route, label: 'Path Length', value: stats?.pathLength ?? '—', color: '#f59e0b', suffix: ' nodes' },
                { icon: Zap, label: 'Path Cost', value: stats?.pathCost ?? '—', color: '#06b6d4', suffix: '' },
                { icon: Timer, label: 'Time', value: stats?.executionTime ? `${stats.executionTime.toFixed(2)}` : '—', color: '#a855f7', suffix: ' ms' },
              ].map(({ icon: Icon, label, value, color, suffix }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}12` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white/85">{value}</span>
                    <span className="text-[10px] ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Result Badge */}
            {stats && (
              <div className="mt-3 p-3 rounded-xl"
                style={{
                  background: stats.isPathFound ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${stats.isPathFound ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}>
                <div className="flex items-center gap-2">
                  {stats.isPathFound ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-xs font-bold"
                    style={{ color: stats.isPathFound ? '#6ee7b7' : '#fda4af' }}>
                    {stats.isPathFound ? 'Path Found Successfully!' : 'No Path Exists'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grid Info */}
          <div className="rounded-2xl p-5 backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(249,115,22,0.1)' }}>
                <Settings2 className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <h3 className="text-sm font-bold text-white/90 tracking-tight">Grid Info</h3>
            </div>
            
            <div className="space-y-0">
              {[
                { label: 'Dimensions', value: `${rows} × ${cols}` },
                { label: 'Total Cells', value: `${rows * cols}` },
                { label: 'Walls', value: `${wallCount}` },
                { label: 'Traversable', value: `${rows * cols - wallCount}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(6,182,212,0.06))',
              border: '1px solid rgba(59,130,246,0.12)',
            }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)' }}>
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold tracking-tight"
                style={{ color: '#93c5fd' }}>Quick Tips</h3>
            </div>
            <ul className="space-y-2">
              {[
                'Click and drag to draw walls',
                'Switch draw mode to move start/goal',
                'Generate mazes to test algorithms',
                'Compare speed: A* vs BFS vs Dijkstra',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]"
                  style={{ color: 'rgba(147,197,253,0.5)' }}>
                  <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'rgba(59,130,246,0.5)' }} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-6 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-[1920px] mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-[11px]"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          <span className="font-medium">AI Search Visualizer v1.0</span>
          <div className="flex items-center gap-4">
            <span>BFS</span>
            <span>•</span>
            <span>DFS</span>
            <span>•</span>
            <span>A*</span>
            <span>•</span>
            <span>Dijkstra</span>
            <span>•</span>
            <span>Greedy Best First</span>
          </div>
          <span>Educational AI Pathfinding Platform</span>
        </div>
      </footer>
    </div>
  );
}
