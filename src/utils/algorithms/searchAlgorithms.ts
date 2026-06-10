import { CellData, Algorithm, Position } from '../../types';

export type Grid = CellData[][];

// Helper to create a deep copy of the grid
export function cloneGrid(grid: Grid): Grid {
  return grid.map(row => row.map(cell => ({ ...cell, previousCell: null })));
}

// Get neighbors (up, down, left, right)
export function getNeighbors(grid: Grid, row: number, col: number): CellData[] {
  const neighbors: CellData[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const rows = grid.length;
  const cols = grid[0].length;

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
      const neighbor = grid[newRow][newCol];
      if (!neighbor.isWall) {
        neighbors.push(neighbor);
      }
    }
  }
  return neighbors;
}

// Manhattan distance heuristic
export function manhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}

// Euclidean distance heuristic
export function euclideanDistance(pos1: Position, pos2: Position): number {
  return Math.sqrt(Math.pow(pos1.row - pos2.row, 2) + Math.pow(pos1.col - pos2.col, 2));
}

// Reconstruct path from goal to start
export function reconstructPath(goal: CellData): CellData[] {
  const path: CellData[] = [];
  let current: CellData | null = goal;
  while (current) {
    path.unshift(current);
    current = current.previousCell;
  }
  return path;
}

// Priority Queue implementation for algorithms
class PriorityQueue {
  private heap: { cell: CellData; priority: number }[] = [];

  enqueue(cell: CellData, priority: number) {
    this.heap.push({ cell, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): CellData | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return min.cell;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[parentIdx].priority <= this.heap[idx].priority) break;
      [this.heap[parentIdx], this.heap[idx]] = [this.heap[idx], this.heap[parentIdx]];
      idx = parentIdx;
    }
  }

  private sinkDown(idx: number) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[smallest], this.heap[idx]] = [this.heap[idx], this.heap[smallest]];
      idx = smallest;
    }
  }
}

export interface SearchResult {
  visitedOrder: CellData[];
  exploredOrder: CellData[];
  path: CellData[];
  pathCost: number;
  found: boolean;
}

// BFS Algorithm
export function bfs(grid: Grid, start: Position, goal: Position): SearchResult {
  const clonedGrid = cloneGrid(grid);
  const startCell = clonedGrid[start.row][start.col];
  const goalCell = clonedGrid[goal.row][goal.col];
  
  const queue: CellData[] = [startCell];
  const visited: Set<string> = new Set();
  const visitedOrder: CellData[] = [];
  const exploredOrder: CellData[] = [];
  
  visited.add(`${startCell.row},${startCell.col}`);
  startCell.distance = 0;
  let visitCount = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    current.isVisited = true;
    current.visitOrder = visitCount++;
    visitedOrder.push(current);
    exploredOrder.push(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = reconstructPath(current);
      return { visitedOrder, exploredOrder, path, pathCost: current.distance, found: true };
    }

    const neighbors = getNeighbors(clonedGrid, current.row, current.col);
    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        neighbor.previousCell = current;
        neighbor.distance = current.distance + 1;
        queue.push(neighbor);
      }
    }
  }

  return { visitedOrder, exploredOrder, path: [], pathCost: 0, found: false };
}

// DFS Algorithm
export function dfs(grid: Grid, start: Position, goal: Position): SearchResult {
  const clonedGrid = cloneGrid(grid);
  const startCell = clonedGrid[start.row][start.col];
  const goalCell = clonedGrid[goal.row][goal.col];
  
  const stack: CellData[] = [startCell];
  const visited: Set<string> = new Set();
  const visitedOrder: CellData[] = [];
  const exploredOrder: CellData[] = [];
  let visitCount = 0;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = `${current.row},${current.col}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    current.isVisited = true;
    current.visitOrder = visitCount++;
    visitedOrder.push(current);
    exploredOrder.push(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = reconstructPath(current);
      return { visitedOrder, exploredOrder, path, pathCost: current.distance, found: true };
    }

    const neighbors = getNeighbors(clonedGrid, current.row, current.col);
    for (const neighbor of neighbors) {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(nKey)) {
        neighbor.previousCell = current;
        neighbor.distance = current.distance + 1;
        stack.push(neighbor);
      }
    }
  }

  return { visitedOrder, exploredOrder, path: [], pathCost: 0, found: false };
}

// A* Algorithm
export function astar(grid: Grid, start: Position, goal: Position): SearchResult {
  const clonedGrid = cloneGrid(grid);
  const startCell = clonedGrid[start.row][start.col];
  const goalCell = clonedGrid[goal.row][goal.col];
  
  const openSet = new PriorityQueue();
  const closedSet: Set<string> = new Set();
  const visitedOrder: CellData[] = [];
  const exploredOrder: CellData[] = [];
  let visitCount = 0;

  startCell.distance = 0;
  startCell.heuristic = manhattanDistance(start, goal);
  startCell.totalCost = startCell.heuristic;
  openSet.enqueue(startCell, startCell.totalCost);

  while (openSet.size > 0) {
    const current = openSet.dequeue()!;
    const key = `${current.row},${current.col}`;

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    current.isVisited = true;
    current.visitOrder = visitCount++;
    visitedOrder.push(current);
    exploredOrder.push(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = reconstructPath(current);
      return { visitedOrder, exploredOrder, path, pathCost: current.distance, found: true };
    }

    const neighbors = getNeighbors(clonedGrid, current.row, current.col);
    for (const neighbor of neighbors) {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (closedSet.has(nKey)) continue;

      const tentativeG = current.distance + 1;
      if (tentativeG < neighbor.distance) {
        neighbor.previousCell = current;
        neighbor.distance = tentativeG;
        neighbor.heuristic = manhattanDistance({ row: neighbor.row, col: neighbor.col }, goal);
        neighbor.totalCost = neighbor.distance + neighbor.heuristic;
        openSet.enqueue(neighbor, neighbor.totalCost);
      }
    }
  }

  return { visitedOrder, exploredOrder, path: [], pathCost: 0, found: false };
}

// Dijkstra Algorithm
export function dijkstra(grid: Grid, start: Position, goal: Position): SearchResult {
  const clonedGrid = cloneGrid(grid);
  const startCell = clonedGrid[start.row][start.col];
  const goalCell = clonedGrid[goal.row][goal.col];
  
  const openSet = new PriorityQueue();
  const closedSet: Set<string> = new Set();
  const visitedOrder: CellData[] = [];
  const exploredOrder: CellData[] = [];
  let visitCount = 0;

  startCell.distance = 0;
  startCell.totalCost = 0;
  openSet.enqueue(startCell, 0);

  while (openSet.size > 0) {
    const current = openSet.dequeue()!;
    const key = `${current.row},${current.col}`;

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    current.isVisited = true;
    current.visitOrder = visitCount++;
    visitedOrder.push(current);
    exploredOrder.push(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = reconstructPath(current);
      return { visitedOrder, exploredOrder, path, pathCost: current.distance, found: true };
    }

    const neighbors = getNeighbors(clonedGrid, current.row, current.col);
    for (const neighbor of neighbors) {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (closedSet.has(nKey)) continue;

      const tentativeDistance = current.distance + 1;
      if (tentativeDistance < neighbor.distance) {
        neighbor.previousCell = current;
        neighbor.distance = tentativeDistance;
        neighbor.totalCost = tentativeDistance;
        openSet.enqueue(neighbor, neighbor.totalCost);
      }
    }
  }

  return { visitedOrder, exploredOrder, path: [], pathCost: 0, found: false };
}

// Greedy Best First Search
export function greedyBestFirst(grid: Grid, start: Position, goal: Position): SearchResult {
  const clonedGrid = cloneGrid(grid);
  const startCell = clonedGrid[start.row][start.col];
  const goalCell = clonedGrid[goal.row][goal.col];
  
  const openSet = new PriorityQueue();
  const closedSet: Set<string> = new Set();
  const visitedOrder: CellData[] = [];
  const exploredOrder: CellData[] = [];
  let visitCount = 0;

  startCell.heuristic = manhattanDistance(start, goal);
  startCell.totalCost = startCell.heuristic;
  openSet.enqueue(startCell, startCell.totalCost);

  while (openSet.size > 0) {
    const current = openSet.dequeue()!;
    const key = `${current.row},${current.col}`;

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    current.isVisited = true;
    current.visitOrder = visitCount++;
    visitedOrder.push(current);
    exploredOrder.push(current);

    if (current.row === goalCell.row && current.col === goalCell.col) {
      const path = reconstructPath(current);
      return { visitedOrder, exploredOrder, path, pathCost: current.distance, found: true };
    }

    const neighbors = getNeighbors(clonedGrid, current.row, current.col);
    for (const neighbor of neighbors) {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (closedSet.has(nKey)) continue;

      neighbor.previousCell = current;
      neighbor.distance = current.distance + 1;
      neighbor.heuristic = manhattanDistance({ row: neighbor.row, col: neighbor.col }, goal);
      neighbor.totalCost = neighbor.heuristic;
      openSet.enqueue(neighbor, neighbor.totalCost);
    }
  }

  return { visitedOrder, exploredOrder, path: [], pathCost: 0, found: false };
}

// Main search function that delegates to the appropriate algorithm
export function executeSearch(algorithm: Algorithm, grid: Grid, start: Position, goal: Position): SearchResult {
  switch (algorithm) {
    case Algorithm.BFS:
      return bfs(grid, start, goal);
    case Algorithm.DFS:
      return dfs(grid, start, goal);
    case Algorithm.ASTAR:
      return astar(grid, start, goal);
    case Algorithm.DIJKSTRA:
      return dijkstra(grid, start, goal);
    case Algorithm.GREEDY:
      return greedyBestFirst(grid, start, goal);
    default:
      return bfs(grid, start, goal);
  }
}
