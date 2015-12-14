function Grid(size, previousState) {
  this.size = size;
  this.cells = previousState ? this.fromState(previousState) : this.empty();
  this.playerTurn = true;
  this.startTiles = 2;
}

// Build a grid of the specified size
Grid.prototype.empty = function () {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }

  return cells;
};

Grid.prototype.fromState = function (state) {
  var cells = [];

  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var tile = state[x][y];
      //console.log('tile from x ' + x + ' y ' + y + 'tile: ' + tile);
      /*if (tile){
        tile = tile.serialize();
        console.log(tile.position);
          var out = '';
            for (var i in tile) {
                out += i + ": " + tile[i] + "\n";
            }
            console.log(out);
      }*/
      row.push(tile ? new Tile({x: tile.x, y: tile.y}, tile.value) : null);
    }
  }

  return cells;
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      cells.push({ x: x, y: y });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
  }

  return {
    size: this.size,
    cells: cellState
  };
};

// Save all tile positions and remove merger info
Grid.prototype.prepareTiles = function () {
  this.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
Grid.prototype.moveTile = function (tile, cell) {
  this.cells[tile.x][tile.y] = null;
  this.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Build a list of positions to traverse in the right order
Grid.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) {
    traversals.x = traversals.x.reverse();
  }
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

Grid.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.withinBounds(cell) && this.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

// Set up the initial tiles to start the game with
Grid.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
Grid.prototype.addRandomTile = function () {
  if (this.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.randomAvailableCell(), value);

    this.insertTile(tile);
  }
};

Grid.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

// Get the vector representing the chosen direction
Grid.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

Grid.prototype.computerMove = function() {
  this.addRandomTile();
  this.playerTurn = true;
}

// Move tiles on the grid in the specified direction
Grid.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var score      = 0;
  var won        = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.insertTile(merged);
          self.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          self.playerTurn = false;
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  return {moved: moved, score: score, won: won};
};

Grid.prototype.clone = function() {
  //return new Grid(this.size, this.cells);

  newGrid = new Grid(this.size);

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      if (tile = this.cells[x][y]){
        newGrid.insertTile(tile.clone());
      }
    }
  }

  return newGrid;
};

Grid.prototype.maxValue = function() {
  var max = 0;

  this.eachCell(function (x, y, tile) {
    if (tile.value) {
      if (tile.value > max) {
        max = tile.value;
      }
    }
  });

  return max;
}


Grid.prototype.evalHeuristics = function () {
  var max = 0;
  var secondMax = 0;
  var sum = 0;
  var monotonicCount = 0;
  var monoBonusCount = 0;
  var cell;
  var rows = [];
  var columns = [];
  var maxPos;

  for (var x=0; x<4; x++) {
    rows[x] = [];
    for (var y=0; y<4; y++) {
      if (x == 0) columns[y] = [];
      cell = { x: x, y: y };
      if (this.cellOccupied(cell)) {
        var value = this.cellContent(cell).value;
        sum += value;
        rows[x].push(value);
        columns[y].push(value);

        if (value > secondMax){
          secondMax = value > max ? max : value;
        }
        if (value > max) {
          maxPos = {x: x, y: y};
          max = value;
        }
      }
    }
  }

  for (x=0; x<4; x++) {
    if (/*columns[x].length > 0 && */(columns[x].every(function(e, i, a) { if (i) return e >= a[i-1]; else return true; }) || columns[x].every(function(e, i, a) { if (i) return e <= a[i-1]; else return true; }))){
      monotonicCount++;
      if (maxPos.y == x) {
        monoBonusCount++;
      }
    }
    if (/*rows[x].length > 0 && */(rows[x].every(function(e, i, a) { if (i) return e >= a[i-1]; else return true; }) || rows[x].every(function(e, i, a) { if (i) return e <= a[i-1]; else return true; }))){
      monotonicCount++;
      if (maxPos.x == x) {
        monoBonusCount++;
      }
    }
  }


  var countAvail = 0;
  var countEdge = 0;
  var countCorner = 0;
  var countNearMax = 0;
  var nearMaxThreshold = secondMax;
  var edgeThreshold = secondMax / 2;
  var cornerThreshold = max;

  this.eachCell(function (x, y, tile) {
    if (!tile) {
      countAvail++;
    } else if (x == 0 || x == 3 || y == 0 || y == 3){
      if (tile.value >= edgeThreshold) {
        countEdge++;
      }
      if (tile.value >= nearMaxThreshold && Math.abs(maxPos.x - x) + Math.abs(maxPos.y - y) == 1){
        countNearMax++;
      }
      if ((x == 0 && y == 0) || (x == 0 && y == 3) || (x == 3 && y == 0) || (x == 3 && y == 3)) {
        if (tile.value >= cornerThreshold) {
          countCorner++;
        }
      }
    }
  });

  return {countAvail: countAvail, 
          countEdge: countEdge, 
          countCorner: countCorner, 
          max: max, 
          monotonicCount: monotonicCount, 
          avg: sum / (16 - countAvail),
          monoBonusCount: monoBonusCount,
          countNearMax: countNearMax
        };
};