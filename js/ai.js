function AI(grid){//, randArr) {
  this.grid = grid;
  //this.randArr = randArr;
}

AI.prototype.eval = function() {
  var heuristics = this.grid.evalHeuristics();
  var maxTile  = heuristics['max'];
  var monotonicCount = heuristics['monotonicCount'];
  var avg = heuristics['avg'];
  //var edgeThreshold = maxTile / 4;
  //var cornerThreshold = maxTile;

  //var edgeThreshold = 200;
  //var heuristics = this.grid.evalHeuristics(edgeThreshold, cornerThreshold);
  var numAvailableCells = heuristics['countAvail'];
  var edgeScore = heuristics['countEdge'];
  var cornerScore = heuristics['countCorner'];
  var monoBonusCount = heuristics['monoBonusCount'];
  var countNearMax = heuristics['countNearMax'];

  //            [max, freeCells, edgeCells, cornerCells, monotonic, avgtile, monobonus, nearmax]
  var weights = [  2.5,        4,         1,           4,       3.5,      0,        2,       4];

  //for (var i = 0; i < weights.length; i++){
  //  weights[i] *= this.randArr[i];
  //}
  return  weights[0] * Math.log(maxTile) + 
          weights[1] * Math.log(numAvailableCells + 1) + 
          weights[2] * edgeScore + 
          weights[3] * cornerScore + 
          weights[4] * monotonicCount +  
          weights[5] * Math.log(avg); +
          weights[6] * monoBonusCount + 
          weights[7] * countNearMax
}

AI.prototype.minimaxSearch = function(depth, alpha, beta){
  var bestMove = -1;
  var bestScore, newAI;
  if (this.grid.playerTurn){
    bestScore = alpha;
    for (var dir in [0,1,2,3]){
      var newGrid = this.grid.clone();
      if (newGrid.move(dir).moved) {
        newAI = new AI(newGrid);//, this.randArr);

        if (depth == 0){
          result = {move: dir, score: newAI.eval()};
        } else{
          result = newAI.minimaxSearch(depth-1, bestScore, beta);
        }

        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = dir;
        } else if (bestMove == -1 && result.score == bestScore){
          bestMove = dir;
        }
        if (bestScore >= beta) {
          return {move: bestMove, score: beta};
        }
      }
    }
    // Punishment for no possible moves, a loss
    if (bestMove == -1) bestScore = 0;
  } else {
    bestScore = beta;
    var newGrid, newTile, weight;
    var availableCells = this.grid.availableCells();
    var numAvailableCells = availableCells.length;

    for (var i in availableCells) {
      newTile = new Tile(availableCells[i], tile)
      newGrid = this.grid.clone();
      newGrid.insertTile(newTile);
      newGrid.playerTurn = true;
      newAI = new AI(newGrid);//, this.randArr);
      result = newAI.minimaxSearch(depth, alpha, bestScore);

      if (result.score < bestScore){
        bestScore = result.score;
      }
      if (bestScore <= alpha) {
        return {move: null, score: alpha}
      }
    }
  }
  return {move: bestMove, score: bestScore}
}

AI.prototype.expectimaxSearch = function(depth){
  var bestMove = -1;
  var bestScore = 0;
  var newAI;
  if (this.grid.playerTurn){
    for (var dir in [0,1,2,3]){
      var newGrid = this.grid.clone();
      if (newGrid.move(dir).moved) {
        newAI = new AI(newGrid);//, this.randArr);

        if (depth == 0){
          result = {move: dir, score: newAI.eval()};
        } else{
          result = newAI.expectimaxSearch(depth-1);
        }

        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = dir;
        }/* else if (result.score == bestScore && bestMove == -1){
          bestMove = (Math.random() > 0.5 ? dir : bestMove);
        }*/
      }
    }
    // No possible moves
    if (bestMove == -1) bestScore = this.eval();
  } else {
    var newGrid, newTile;
    var weight = 1;
    var scoreSum = 0;
    var availableCells = this.grid.availableCells();

    for (var i in availableCells) {
      newTile = new Tile(availableCells[i], 2)
      newGrid = this.grid.clone();
      newGrid.insertTile(newTile);
      newGrid.playerTurn = true;
      newAI = new AI(newGrid);//, this.randArr);
      result = newAI.expectimaxSearch(depth);

      scoreSum += result.score;
    }
    bestScore = scoreSum / availableCells.length;
  }

  return {move: bestMove, score: bestScore}
}

AI.prototype.iterativeDeepening = function(minimax){
  var startTime = (new Date()).getTime();
  var depth = 0;
  var timeout = 150;
  var result;

  do {
    newResult = minimax ? this.minimaxSearch(depth, Number.MIN_VALUE, Number.MAX_VALUE) : this.expectimaxSearch(depth);
    if (newResult != -1) result = newResult;
    depth++;
  } while ((new Date()).getTime() - startTime < timeout );
  //console.log('depth: ' + --depth);

  return result;
}

AI.prototype.getMove = function() {
  //var move = Math.floor(Math.random() * 4);
  var result = this.iterativeDeepening(false);
  //var result = this.minimaxSearch(3, Number.MIN_VALUE, Number.MAX_VALUE);
  //console.log('we gonna move ' + result.move);
  return result.move;
}
