function AI(grid) {
  this.grid = grid;
}

// performs a search and returns the best move
AI.prototype.getMove = function() {
  var move = Math.floor(Math.random() * 4);
  console.log('we gonna move ' + move);
  return move;
}