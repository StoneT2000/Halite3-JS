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
//2. PURPOSELY attack enemies if attack === true

//How do we prioritize which directions to move?
//1. Find directions that go towards the target position. Add the still direction next as its better than moving away the target position
//2. Determine which of the directions are safe and put that in the array safeDirections
//3.1. If avoid is true, prioritize all safeDirections in the order of which is closer to the target position.
//3.2. If avoid is false, allow collisions to occur in attempt to reach the targetPos


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
  let safeDirections = []; //all safe directions
  let priorirtyTargetDirections = [];
  
  let adjacentPositions = search.circle(gameMap, ship.position, 1); //adjacent Positions the ship can move to
    
  
  //go through directions and check surrounding squares to avoid
  //TODO: go through all cardinals and check which ones are safe

  for (let i = 0; i < adjacentPositions.length; i++) {
    let adjacentTile = gameMap.get(adjacentPositions[i]);
    let oship = adjacentTile.ship;
    if (oship !== null && oship.owner !== ship.owner) {
      if (true) {
        //If not a worth while attack
        if(!worthAttacking(gameMap, ship, oship)){
        }
        else {
          logging.info(`Ship-${ship.id} can chase/attack enemy at ${adjacentPositions[i]} as ${oship.haliteAmount} > 2*${ship.haliteAmount}`)
          safePosition = false; //still not safe

          //Find all moves that will allow ship to collide or move towards possible collision
          //repetitive, these directions are calculated in worthAttackign function
          let newTargetDirections = gameMap.getUnsafeMoves(ship.position, oship.position);
          for (let k = 0; k < newTargetDirections.length; k++) {
            priorirtyTargetDirections.push(newTargetDirections[k])
          }
          //prioritize this unsafe direction as we want the ship to collide
        }
      }
    }
  }

    for (let i = 0; i < directions.length; i++){
      let potentialPos = ship.position.directionalOffset(directions[i]);
      //logging.info(`Ship-${ship.id} at ${ship.position} think about ${potentialPos}`);
      let surroundingPositions = search.circle(gameMap, potentialPos, 1);
      let safePosition = true;
      for (let j = 0; j < surroundingPositions.length; j++) {
        let tile = gameMap.get(surroundingPositions[j]);
        let oship = tile.ship;
        /*
        if (oship !== null) {
          logging.info(`Ship-${ship.id} at ${ship.position} saw ship at ${surroundingPositions[j]}`);
        }
        */
        if (oship !== null && oship.owner !== ship.owner) {
          if (true) {
            //If not a worth while attack
            if(!worthAttacking(gameMap, ship, oship)){
              safePosition = false;
            }
            else {
              logging.info(`Ship-${ship.id} can chase/attack enemy at ${surroundingPositions[j]} as ${oship.haliteAmount} > 2*${ship.haliteAmount}`)
              safePosition = false; //still not safe
              
              //Find all moves that will allow ship to collide or move towards possible collision
              //repetitive, these directions are calculated in worthAttackign function
              let newTargetDirections = gameMap.getUnsafeMoves(ship.position, oship.position);
              for (let k = 0; k < newTargetDirections.length; k++) {
                priorirtyTargetDirections.push(newTargetDirections[k])
              }
              //prioritize this unsafe direction as we want the ship to collide
            }
          }
          else {
            safePosition = false;
          }
          //logging.info(`Ship-${ship.id} at ${ship.position} thought about ${potentialPos} but there's enemy`);
          break;
        }
      }
      if (safePosition) {
        safeDirections.push(directions[i]);
      }
    }
    directions = [];
    for (let k = 0; k < priorirtyTargetDirections.length; k++) {
      directions.push(priorirtyTargetDirections[k]);
    }
    for (let k = 0; k < safeDirections.length; k++) {
      directions.push(safeDirections[k]);
    }

    //logging.info(`Ship-${ship.id} at ${ship.position} has these safe ${directions}`);

  
  //if after all of this checking, there aren't any safe directions or prioritized directions put into the directions array
  //Then PANIC and determine safety by 1 degree lower, find directions to tiles that aren't occupied by a different ship and are have the least number of ships adjacent. These are the more preferred directions
  let unoccupiedDirections = []
  if (directions.length === 0) {
    
    let nsp = search.numShipsInRadius(gameMap, ship.owner, ship.position, 1);
    unoccupiedDirections.push({dir:Direction.Still, enemy:nsp.enemy});
    //We can optimize this as we already searched around the ship position in the first block of code if one of the unsafe directions that goes to the target is direction.still
    let possibleDirections = Direction.getAllCardinals();
   
    //let adjacentPositions = search.circle(gameMap, ship.position, 1);
    for (let i = 0; i < possibleDirections.length; i++) {
      let possiblePos = ship.position.directionalOffset(possibleDirections[i]);
      let possibleTile = gameMap.get(possiblePos);
      let nearbyShipsFound = search.numShipsInRadius(gameMap, ship.owner, possiblePos, 1);
      if (possibleTile.ship === null){
        unoccupiedDirections.push({dir:possibleDirections[i], enemy:nearbyShipsFound.enemy});
      }
    }
    //sort unoccupied directions by least number of enemies
    unoccupiedDirections.sort(function(a,b) {
      return a.enemy-b.enemy;
    });
    logging.info(`Ship-${ship.id} best dirs: ${unoccupiedDirections[0].dir}`);
    
  }
  for (let i = 0; i< unoccupiedDirections.length; i++) {
    directions.push(unoccupiedDirections[i].dir)
  }

  
  //Add remaining directions
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
  for (let i = 0; i < diffDir.length; i++){
    directions.push(diffDir[i])
  }
  //logging.info(`Ship-${ship.id} at ${ship.position} directionr order: ${directions}`);
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
      logging.info(`Ship-${ship.id} is going to try to collide with at least 2 other friends nearby f:${shipsNearby.friendly}, e:${shipsNearby.enemy}`)
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
}