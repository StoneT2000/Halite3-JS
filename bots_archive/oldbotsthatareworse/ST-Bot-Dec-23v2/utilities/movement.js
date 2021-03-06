const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
const search = require('./search.js')
const logging = require('./../hlt/logging');
function canMove(gameMap, ship) {
  if (ship.haliteAmount >= Math.floor(gameMap.get(ship.position).haliteAmount * 0.1)) {
    return true;
  }
  return false;
}

//Returns all directions towards target, with a preference order. First element is most preferred
//Disregards whether or not path is blocked by own ship
//If attack is true the ship is allowed to collide with opponent

//viableDirections always returns an array sorted by priority the directions should be in order to reach targetPos and avoid or don't avoid enemies. All directions are present in the array.
//(0. ALWAYS avoid friendly collisions, this is satisfied by code in MyBot.js)
//1. ALLOW enemy collisions if avoid === false. If avoid === true (as needed by return ships), avoid collision

//How do we prioritize which directions to move?
//1. Find directions that go towards the target position. Add the still direction next as its better than moving away the target position
//2. Determine which of the directions are safe and put that in the array safeDirections
//3.1. If avoid is true, prioritize all absoluteSafeDirections in the order of which is closer to the target position.
//3.2. If avoid is false, allow collisions to occur in attempt to reach the targetPos
//4. If no absoluteSafeDirections available, prioritize safeDirections in order which they have less enemies directly near


function viableDirections(gameMap, ship, targetPos, avoid) {
  
  //Gets directions that move towards the target position
  let directions = gameMap.getUnsafeMoves(ship.position, targetPos);
  
  if (directions.length === 0){
    //If there are no directions to the targetPosition, set still as a direction
    directions = [new Direction(0, 0)];
  }
  else {
    //doing nothing is always an option and an better option than moving in a direction not towards target position
    directions.push(new Direction(0, 0));
  }
  let absoluteSafeDirections = []; //all absolute safe directions. It is absolutely safe if there isn't any enemy ship adjacent to the tile this ship reaches by taking that direction
  let safeDirections = []; //all safe directions that don't have an enemy directly on the tile this ship might move to.
  let attackDirections = []; //directions in which the ship can take to try and attack an enemy
  
  let allDirections = [Direction.Still, Direction.North, Direction.South, Direction.East, Direction.West ] //all directions the ship can take
    
  
  //go through directions and check surrounding squares to avoid
  
  //Goes through all directions and checks surrounding squares if there is an enemy on it to see which directions are absolutely safe and which are just safe only if we are trying to avoid enemies
  
  if (avoid === true){
    for (let i = 0; i < allDirections.length; i++) {
      //position in searched direction
      let possiblePosition = ship.position.directionalOffset(allDirections[i]);
      
      //Find all adjacent positions to the position in the searched direction
      let possiblePositionsNearby = search.circle(gameMap, possiblePosition, 1);
      
      let isThisAbsoluteSafe = true; //whether possiblePosition is absolutely safe
      let isThisSafe = true; //whether possiblePosition is safe
      let numEnemies = 0;
      for (let j = 0; j < possiblePositionsNearby.length; j++) {
        let possiblePositionNearbyTile = gameMap.get(possiblePositionsNearby[j]);
        let oship = possiblePositionNearbyTile.ship;
        if (oship !== null && oship.owner !== ship.owner) {
          //if there is a ship on the adjacent tile and the owner of the ship isn't the same owner as this ship (enemy)
          numEnemies += 1;
          //Set this direction as not safe.
          isThisAbsoluteSafe = false;
          if (j === 0) {
            //The way search.circle works is it performs a BFS search for the closest squares in radius 1 (although a little cheated as we use a sorted look up table). The first element of possiblePositions is then always the original square that was searched around.
            isThisSafe = false;
          }
        }
      }
      if (isThisAbsoluteSafe === true) {
        let distanceAway = gameMap.calculateDistance(possiblePosition,targetPos);
        //logging.info(`Ship-${ship.id} at ${ship.position} has absolute safe direction: ${allDirections[i]} ${distanceAway} away`);
        absoluteSafeDirections.push({dir:allDirections[i], dist:distanceAway, enemies: numEnemies});
      }
      if (isThisSafe === true) {
        safeDirections.push({dir:allDirections[i], dist:gameMap.calculateDistance(possiblePosition,targetPos), enemies: numEnemies})
      }
    }
    //Sort absolute safe directions by which is closer to target position
    let sortedAbsoluteSafeDirections = [];
    absoluteSafeDirections.sort(function(a,b){
      return a.dist - b.dist;
    });
    
  }
  
  //If trying to avoid enemy ships but there are no absolutely safe directions, then choose safe directions with least enemies around and out of those, find the closest to target
  if (avoid === true) {
    if (absoluteSafeDirections.length === 0) {
      if (safeDirections.length === 0) {
        //if there are 0 safe directions
        directions = [Direction.Still];
      }
      else {
        //If there are some safe directions, look through them
        let possibleSafeDirections = [];
        let leastEnemyCount = 1000;
        for (let j = 0; j < safeDirections.length; j++) {
          if (safeDirections[j].enemies < leastEnemyCount) {
            //reset that array as a direction with less enemies was found
            possibleSafeDirections = [safeDirections[j]];
          }
          else if (safeDirections[j].enemies === leastEnemyCount) {
            //Add safe direction that has the least enemies nearby
            possibleSafeDirections.push(safeDirections[j]);
          }
        }
        //sort the directions with the least enemies nearby by distance
        possibleSafeDirections.sort(function(a,b){
          return a.dist - b.dist;
        })
        directions = possibleSafeDirections.map(function(a){
          return a.dir;
        });
      }
    }
    else {
      directions = absoluteSafeDirections.map(function(a){
        return a.dir;
      });
    }
  }
  //By now, directions will include the safest directions possible that also are the closest to the targetPos
  //Add remaining directions to allow flexibility in movement in case of conflicts
  let diffDir = [];
  for (let i = 0; i < allDirections.length; i++) {
    let isItThere = false;
    for (let j = 0; j < directions.length; j++) {
      if (allDirections[i].equals(directions[j])){
        isItThere = true;
      }
    }
    if (isItThere === false) {
      diffDir.push(allDirections[i]);
    }
  }
  for (let i = 0; i < diffDir.length; i++){
    directions.push(diffDir[i])
  }
  //logging.info(`Ship-${ship.id} at ${ship.position} direction order: ${directions}`);
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
  let directions = viableDirections(gameMap, ship, dropoff.position, true);
  return directions;
}

//Whether or not its worth it for ship to attack another ship
//Other ship must have more halite than us by a good deal
//There must be friendlies nearby (to pick up the collision aftermath)
//Search in radius of possible collision location (other ship location), if there are at least 2 friends and and they outnumber enemy, go for it
function worthAttacking(gameMap, ship, oship) {
  let possibleCollisonPos = oship.position;
  
  //attempt to detect where collision will occur;
  //Usually, the first direction is where it will occur. The times when this won't happen is when there are collisions with friendly ships detected, of which this will be off a little.
  let collisionDirections = gameMap.getUnsafeMoves(ship.position, oship.position);
  if (collisionDirections.length > 0) {
    possibleCollisonPos = ship.position.directionalOffset(collisionDirections[0]);
  }

  if(1.5 * ship.haliteAmount < oship.haliteAmount) {
    let shipsNearby = search.numShipsInRadius(gameMap, ship.owner, possibleCollisonPos, 2);
    let friendlyNearby = shipsNearby.friendly;
    if (friendlyNearby >= 2 && friendlyNearby > shipsNearby.enemy){
      logging.info(`Ship-${ship.id} is going to try to collide with at least 2 other friends nearby f:${shipsNearby.friendly}, e:${shipsNearby.enemy} at ${possibleCollisonPos}`)
      return true;
    }
  }
  return false;
  
}

module.exports = {
  canMove,
  viableDirections,
  finalMove,
  moveAwayFromSelf,
  worthAttacking
}