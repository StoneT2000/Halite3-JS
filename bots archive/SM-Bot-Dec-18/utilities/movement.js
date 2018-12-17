const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
const search = require('./search.js')
function canMove(gameMap, ship) {
  if (ship.haliteAmount >= gameMap.get(ship.position).haliteAmount * 0.1) {
    return true;
  }
  return false;
}

//Returns all directions towards target, with a preference order. First element is most preferred
//Disregards whether or not path is blocked by own ship
function viableDirections(gameMap, ship, targetPos) {
  let directions = gameMap.getUnsafeMoves(ship.position, targetPos);
  if (directions.length === 0){
    directions = [new Direction(0, 0)];
  }
  directions.push(new Direction(0, 0));
  let others = Direction.getAllCardinals();
  for (let i = 0; i < others.length ; i++) {
    directions.push(others[i]);
  }
  return directions;
}

//move away from self
function moveAwayFromSelf(gameMap, ship) {
  let possiblePositions = search.circle(gameMap, ship.position, 1);
  let directions = [];
  for (let i = 0; i <possiblePositions.length; i++) {
    let possibleTile = gameMap.get(possiblePositions[i]);
    if (!possibleTile.isOccupied && !possibleTile.hasStructure) {
      //getUnsafeMoves should return direct move to adjacent tile, and theres only one direction.
      directions.push(gameMap.getUnsafeMoves(ship.position, possiblePositions[i])[0]);
    }
  }
  //can be optimized
  //Add directions that aren't there
  let allDir = Direction.getAllCardinals();
  let diffDir = [];
  for (let i = 0; i < allDir.length; i++) {
    let isItThere = false;
    for (let j = 0; j < directions.length; j++) {
      if (allDir[i].equals(directions[j])){
        isItThere = true;
      }
    }
    if (isItThere === false) {
      diffDir.push(allDir[i]);
    }
  }
  for (let i = 0; i < diffDir.length; i++) {
    directions.push(diffDir[i]);
  }
  return directions;
}

//END Game movement
//Take a look at viable directions
//Go to favorite one
//WE will process these later
function finalMove(gameMap, ship, dropoff) {
  let directions = viableDirections(gameMap, ship, dropoff.position);
  for (let i = 0; i < directions.length; i++) {}
  return directions;
}
module.exports = {
  canMove,
  viableDirections,
  finalMove,
  moveAwayFromSelf,
}