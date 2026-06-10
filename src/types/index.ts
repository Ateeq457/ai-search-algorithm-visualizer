export interface Position {
  row: number;
  col: number;
}

export enum CellType {
  EMPTY = 'empty',
  WALL = 'wall',
  START = 'start',
  GOAL = 'goal',
  VISITED = 'visited',
  EXPLORED = 'explored',
  PATH = 'path',
  CURRENT = 'current',
}

export enum Algorithm {
  BFS = 'bfs',
  DFS = 'dfs',
  ASTAR = 'astar',
  DIJKSTRA = 'dijkstra',
  GREEDY = 'greedy',
}

export enum MazeType {
  NONE = 'none',
  RANDOM = 'random',
  RECURSIVE = 'recursive',
  PRIMS = 'prims',
}

export enum SearchSpeed {
  SLOW = 80,
  MEDIUM = 40,
  FAST = 15,
  INSTANT = 2,
}

export interface CellData {
  row: number;
  col: number;
  type: CellType;
  isWall: boolean;
  isVisited: boolean;
  isExplored: boolean;
  isPath: boolean;
  isCurrent: boolean;
  distance: number;
  heuristic: number;
  totalCost: number;
  previousCell: CellData | null;
  visitOrder: number;
}

export interface SearchStats {
  nodesVisited: number;
  nodesExplored: number;
  pathLength: number;
  pathCost: number;
  executionTime: number;
  algorithm: Algorithm;
  isPathFound: boolean;
}

export interface GridConfig {
  rows: number;
  cols: number;
  start: Position;
  goal: Position;
}

export interface AnimationState {
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  speed: SearchSpeed;
  currentStep: number;
  totalSteps: number;
}

export const ALGORITHM_INFO: Record<Algorithm, { name: string; description: string; type: string; optimal: boolean; complete: boolean; timeComplexity: string; spaceComplexity: string }> = {
  [Algorithm.BFS]: {
    name: 'Breadth First Search',
    description: 'Explores nodes level by level using a queue. Guarantees the shortest path in unweighted graphs.',
    type: 'Uninformed',
    optimal: true,
    complete: true,
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
  },
  [Algorithm.DFS]: {
    name: 'Depth First Search',
    description: 'Explores as far as possible along each branch before backtracking. Uses a stack.',
    type: 'Uninformed',
    optimal: false,
    complete: true,
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
  },
  [Algorithm.ASTAR]: {
    name: 'A* Search',
    description: 'Uses heuristics to find the optimal path efficiently. Combines actual cost and estimated cost.',
    type: 'Informed',
    optimal: true,
    complete: true,
    timeComplexity: 'O(E)',
    spaceComplexity: 'O(V)',
  },
  [Algorithm.DIJKSTRA]: {
    name: "Dijkstra's Algorithm",
    description: 'Finds shortest paths from source to all nodes. Guarantees optimal solution.',
    type: 'Uninformed',
    optimal: true,
    complete: true,
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
  },
  [Algorithm.GREEDY]: {
    name: 'Greedy Best First',
    description: 'Always expands the node closest to the goal according to the heuristic. Fast but not always optimal.',
    type: 'Informed',
    optimal: false,
    complete: false,
    timeComplexity: 'O(E)',
    spaceComplexity: 'O(V)',
  },
};
