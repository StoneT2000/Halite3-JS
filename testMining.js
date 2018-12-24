const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
const search = require('./search.js')
const logging = require('./../hlt/logging')
const movement = require('./movement.js')

let extractPercent = 0.25//1/hlt.constants.EXTRACT_RATIO;
let moveCostPercent = 0.1//1/hlt.constants.MOVE_COST_RATIO;

//Evaluate each position for how most halite that can be gained subtracting the distance costs to find halite rate. As at each position a ship can mine for any amount of turns leading to different halite rates, the halite rate analyzed by going to that position is the highest rate.
function findNextMiningPosition(gameMap, player, ship, range) {
  let omp = ship.position; //optimal mining position
  let possiblePositions = search.circle(gameMap, ship.position, range);
  //logging.info(`Ship-${ship.id}: searching for new position within ${possiblePositions[0]}`);
  let maxHaliteRate = -1000;
  let mineTurns = 0;
  let totalTurnsSpent = 0;
  for (let i = 0; i < possiblePositions.length; i++) {
    
    //Possible position to check
    let pos = possiblePositions[i]
    //logging.info(`Ship-${ship.id}: checking ${pos}`);
    let gameTile = gameMap.get(pos);
    
    //Only check position if it is unoccupied and doesn't have a structure
    let thatShip = gameTile.ship
    if (thatShip === null || (thatShip.id === ship.id)){
      if (!gameTile.hasStructure){
        //Find nearest dropoff and the distance to it
        let nearestDropoffAndDist = search.findNearestDropoff(gameMap, player, pos, true);
        let nearestDropoff = nearestDropoffAndDist.nearest;
        let distanceToDropoff = nearestDropoffAndDist.distance; //Number of turns it takes to return back to dropoff
        let distanceToPos = gameMap.calculateDistance(ship.position, pos); //Number of turns it takes to reach new position
        let totalHaliteMoveCost = 0;
        totalHaliteMoveCost += costToMoveThere(gameMap, ship, pos); //Add the cost of going from currentPos to possible Mining position
        let localMaxHaliteRate = -1000;
        let turnsSpent = distanceToPos + distanceToDropoff;
        let localTurnsSpent = 0;

        //Amount of halite ship has in cargo at pos
        let haliteCargoThere = ship.haliteAmount;
        haliteCargoThere -= totalHaliteMoveCost; //ship loses halite trying to move there as defined by costToMoveThere
        if (haliteCargoThere < 0) {
          haliteCargoThere = 0;
        }

        //max look ahead by 10 turns of mining? to find halite rates.
        //We stop the for loop when the halite collected is past the return minimum requirement, which is hlt.constants.MAX_HALITE / 1.02 = 1000/1.02

        let forcedPosition = false;

        //Only consider positions of which there is sufficient halite

        for (let k = 1; k < 10; k++) {
          //halite collected, without considering overflow
          let haliteCollected = halitePotential(gameMap, pos, k);
          let newHaliteInCargo = haliteCollected + haliteCargoThere;
          //If halite cargo overflows, then true halite collected is different as not all halite can be kept
          if (haliteCargoThere + haliteCollected >= 1000) {
            haliteCollected = 1000 - haliteCargoThere;
            newHaliteInCargo = 1000;
          }

          let haliteLeft = gameMap.get(pos).haliteAmount - haliteCollected;
          let costToGoBack = costToMoveThere(gameMap, ship, nearestDropoff.position, haliteLeft);

          totalHaliteMoveCostNow = costToGoBack + totalHaliteMoveCost;
          netHaliteCollected = haliteCollected - totalHaliteMoveCostNow;

          //we measure rate by how much cargo is in there, not by the addition made in k turns
          haliteRate = (newHaliteInCargo - costToGoBack)/(turnsSpent + k);
          
          //haliteRate = (netHaliteCollected)/(turnsSpent + k);
          
          //logging.info(`Ship-${ship.id}: collect: ${haliteCollected} net-collected: ${netHaliteCollected}, left: ${haliteLeft}, totalmovecost: ${totalHaliteMoveCostNow}, turns: ${(turnsSpent+k)}`);
          if (haliteRate > maxHaliteRate) {
            maxHaliteRate = haliteRate;
            omp = pos;
            mineTurns = k;
            totalTurnsSpent = turnsSpent + k;
          }
          if (haliteRate > localMaxHaliteRate) {
            localMaxHaliteRate = haliteRate;
            localTurnsSpent = turnsSpent + k;

          }
          if (haliteCargoThere + haliteCollected >= 1000/1.02) {
            //logging.info(`Ship-${ship.id}: Overfilled`)

            //If it takes one turn to fill ship at its current position, then take that turn, always more optimal
            if (k === 1 && i === 0) {
              maxHaliteRate = haliteRate;
              omp = pos;
              mineTurns = k;
              totalTurnsSpent = turnsSpent + k;
              forcedPosition = true;
            }
            break;
          }
        }
        if (forcedPosition === true) {
          break;
        }
        //logging.info(`Ship-${ship.id}: Rate: ${localMaxHaliteRate} when mine at ${pos} taking up ${localTurnsSpent}`);

      }

    }
  }
  logging.info(`Ship-${ship.id}: Rate: ${maxHaliteRate} when mining at ${omp} for ${mineTurns} turns taking up ${totalTurnsSpent} turns to get back`);
  return omp;
  
}

//Returns the amount of halite needed for the ship using unsafeDirections to navigate to reach the targetPos with consideration of which direction is cheaper
function costToMoveThere(gameMap, ship, targetPos, haliteBelow){
  //logging.info(`Ship-${ship.id}:Calculating totalhalitecost`);
  let currentPosition = ship.position;
  
  //If ship is on target position, no halite cost to move there
  if (currentPosition.equals(targetPos)){
    return 0;
  }
  
  let totalHaliteCost = Math.floor(gameMap.get(ship.position).haliteAmount * moveCostPercent);
  
  //use the argument haliteBelow to predict future costs. Supposing that the halite below is going to be different than what it is now due to mining
  if (haliteBelow) {
    //logging.info(`Ship-${ship.id} halitebelow given`);
    totalHaliteCost = Math.floor(haliteBelow * moveCostPercent);
  }
  
  

  //while the current ghost position isn't the target, find the next move the ship would take and add to cost
  //!currentPosition.equals(targetPos)
  let k = 0;
  while (!currentPosition.equals(targetPos)) {
    //We ignore enemy ships when calculating this
    let directionsToThere = gameMap.getUnsafeMoves(currentPosition, targetPos);
    if (directionsToThere.length >=2 ) {
      let halite1 = (gameMap.get(currentPosition.directionalOffset(directionsToThere[0]))).haliteAmount;
      let halite2 = (gameMap.get(currentPosition.directionalOffset(directionsToThere[1]))).haliteAmount;
      if (halite2 < halite1) {
        directionsToThere[0] = directionsToThere[1];
      }
    }
    //for some reason using viableDirections with avoiding set to false results in crashes, communication failed. I'm thinking its an infinite while loop but it if it was, the log below would constantly be logging but it isn't.
    //let directionsToThere = movement.viableDirections(gameMap, ship, targetPos, false)
    //logging.info(`${ship.id}: ${directionsToThere}`)
    if (k !== 0) {
      totalHaliteCost += Math.floor(gameMap.get(currentPosition).haliteAmount * moveCostPercent);
    }
    currentPosition = gameMap.normalize(currentPosition.directionalOffset(directionsToThere[0]));
    k++;
    
    //logging.info(`Ship-${ship.id}: Directions: ${directionsToThere}`);
  }
  return totalHaliteCost;
  
  
}

//Determine halitePotential gained in these turns at this position
function halitePotential(gameMap, position, turns, haliteBelow) {
  let haliteHere = gameMap.get(position).haliteAmount;
  if (haliteBelow) {
    haliteHere = haliteBelow;
  }
  if (haliteBelow <= 0) {
    return gameMap.get(position).haliteAmount;
  }
  if (turns === 0) {
    return gameMap.get(position).haliteAmount - haliteHere;
  }
  return halitePotential(gameMap, position, turns-1, haliteHere - Math.ceil(haliteHere*0.25));
}

//Find amount of halite in surrounding area

function totalHaliteInRadius(gameMap, position, radius) {
  let positions = search.circle(gameMap, position, radius);
  let totalHalite = 0;
  for (let i = 0; i < positions.length; i++) {
    totalHalite += gameMap.get(positions[i]).haliteAmount;
  }
  return totalHalite;
}


module.exports = {
  extractPercent,
  moveCostPercent,
  totalHaliteInRadius,
  costToMoveThere,
  findNextMiningPosition,
  halitePotential,
}