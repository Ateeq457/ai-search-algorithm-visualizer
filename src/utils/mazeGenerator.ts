import { CellData, CellType, Position } from '../types';

export type Grid = CellData[][];

export function createEmptyGrid(rows: number, cols: number): Grid {
  const grid: Grid = [];
  for (let row = 0; row < rows; row++) {
    const currentRow: CellData[] = [];
    for (let col = 0; col < cols; col++) {
      currentRow.push({
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
      });
    }
    grid.push(currentRow);
  }
  return grid;
}

// Random maze generation (simple random walls)
export function generateRandomMaze(grid: Grid, start: Position, goal: Position, density: number = 0.3): Grid {
  const newGrid = createEmptyGrid(grid.length, grid[0].length);
  
  for (let row = 0; row < newGrid.length; row++) {
    for (let col = 0; col < newGrid[0].length; col++) {
      if (
        (row === start.row && col === start.col) ||
        (row === goal.row && col === goal.col)
      ) {
        continue;
      }
      if (Math.random() < density) {
        newGrid[row][col].isWall = true;
        newGrid[row][col].type = CellType.WALL;
      }
    }
  }
  
  return newGrid;
}

// Recursive Division Maze Generation
export function generateRecursiveMaze(grid: Grid, start: Position, goal: Position): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = createEmptyGrid(rows, cols);
  
  // Fill borders
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        newGrid[row][col].isWall = true;
        newGrid[row][col].type = CellType.WALL;
      }
    }
  }

  function divide(minRow: number, maxRow: number, minCol: number, maxCol: number) {
    if (maxRow - minRow < 2 || maxCol - minCol < 2) return;

    const horizontal = (maxRow - minRow) > (maxCol - minCol);

    if (horizontal) {
      const wallRow = minRow + 1 + Math.floor(Math.random() * (maxRow - minRow - 1));
      const passageCol = minCol + Math.floor(Math.random() * (maxCol - minCol + 1));

      for (let col = minCol; col <= maxCol; col++) {
        if (col === passageCol) continue;
        if (
          (wallRow === start.row && col === start.col) ||
          (wallRow === goal.row && col === goal.col)
        ) continue;
        newGrid[wallRow][col].isWall = true;
        newGrid[wallRow][col].type = CellType.WALL;
      }

      divide(minRow, wallRow - 1, minCol, maxCol);
      divide(wallRow + 1, maxRow, minCol, maxCol);
    } else {
      const wallCol = minCol + 1 + Math.floor(Math.random() * (maxCol - minCol - 1));
      const passageRow = minRow + Math.floor(Math.random() * (maxRow - minRow + 1));

      for (let row = minRow; row <= maxRow; row++) {
        if (row === passageRow) continue;
        if (
          (row === start.row && wallCol === start.col) ||
          (row === goal.row && wallCol === goal.col)
        ) continue;
        newGrid[row][wallCol].isWall = true;
        newGrid[row][wallCol].type = CellType.WALL;
      }

      divide(minRow, maxRow, minCol, wallCol - 1);
      divide(minRow, maxRow, wallCol + 1, maxCol);
    }
  }

  divide(1, rows - 2, 1, cols - 2);
  return newGrid;
}

// Prim's Algorithm Maze Generation
export function generatePrimsMaze(grid: Grid, start: Position, goal: Position): Grid {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = createEmptyGrid(rows, cols);
  
  // Start with all walls
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      newGrid[row][col].isWall = true;
      newGrid[row][col].type = CellType.WALL;
    }
  }

  const walls: Position[] = [];
  const startCell = { row: 1, col: 1 };
  newGrid[startCell.row][startCell.col].isWall = false;
  newGrid[startCell.row][startCell.col].type = CellType.EMPTY;

  // Add neighboring walls
  const addWalls = (pos: Position) => {
    const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];
    for (const [dr, dc] of directions) {
      const newRow = pos.row + dr;
      const newCol = pos.col + dc;
      if (newRow > 0 && newRow < rows - 1 && newCol > 0 && newCol < cols - 1) {
        if (newGrid[newRow][newCol].isWall) {
          walls.push({ row: pos.row + dr / 2, col: pos.col + dc / 2 });
        }
      }
    }
  };

  addWalls(startCell);

  while (walls.length > 0) {
    const randomIdx = Math.floor(Math.random() * walls.length);
    const wall = walls[randomIdx];
    walls.splice(randomIdx, 1);

    // Simplified: just carve passages
    if (wall.row > 0 && wall.row < rows - 1 && wall.col > 0 && wall.col < cols - 1) {
      newGrid[wall.row][wall.col].isWall = false;
      newGrid[wall.row][wall.col].type = CellType.EMPTY;
    }
  }

  // Ensure start and goal are not walls
  newGrid[start.row][start.col].isWall = false;
  newGrid[start.row][start.col].type = CellType.START;
  newGrid[goal.row][goal.col].isWall = false;
  newGrid[goal.row][goal.col].type = CellType.GOAL;

  return newGrid;
}
