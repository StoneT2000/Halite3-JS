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
  let leastTurnsSpent = 1000;
  let leastMineTurns = 0; //not needed
  let useForcedPosition = false;
  let forcedPosition = ship.position;
  
  let maxPotential = -1000;
  
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
        let costToMoveToNewPos = costToMoveThere(gameMap, ship.position, pos); //Add the cost of going from currentPos to possible Mining position
        let localMaxHaliteRate = -1000;
        let turnsSpent = distanceToPos + distanceToDropoff;
        let localTurnsSpent = 0;

        //Amount of halite ship has in cargo at pos
        let haliteCargoThere = ship.haliteAmount;
        haliteCargoThere -= costToMoveToNewPos; //ship loses halite trying to move there as defined by costToMoveThere
        if (haliteCargoThere <= 0) {
          haliteCargoThere = 0;
          turnsSpent += 1;
        }

          //max look ahead by 10 turns of mining? to find halite rates.
          //We stop the for loop when the halite collected is past the return minimum requirement, which is hlt.constants.MAX_HALITE / 1.02 = 1000/1.02

          

          //Only consider positions of which there is sufficient halite

          for (let k = 1; k < 8; k++) {
            //halite collected, without considering overflow
            let haliteCollected = halitePotential(gameMap, pos, k);
            let newHaliteInCargo = haliteCollected + haliteCargoThere;
            //If halite cargo overflows, then true halite collected is different as not all halite can be kept
            if (haliteCargoThere + haliteCollected >= 1000) {
              haliteCollected = 1000 - haliteCargoThere;
              newHaliteInCargo = 1000;
            }

            let haliteLeft = gameMap.get(pos).haliteAmount - haliteCollected;
            let costToGoBack = costToMoveThere(gameMap, pos, nearestDropoff.position, haliteLeft);
            
            //totalHaliteMoveCostNow = costToGoBack + costToMoveToNewPos;
            //netHaliteCollected = haliteCollected - totalHaliteMoveCostNow;
            
            let netHalite = haliteCollected - costToGoBack - costToMoveToNewPos;
            let haliteRate = (netHalite)/(turnsSpent + k);
            if (netHalite > maxPotential) {
              maxPotential = netHalite;
              omp = pos;
              mineTurns = k;
              totalTurnsSpent = turnsSpent + k;
            }
            
            
            //we measure rate by how much cargo is in there, not by the addition made in k turns
            
            //rate is measured by how much is collected, subtracted by the cost it took to get there and move back
            /*
            haliteRate = (haliteCollected - costToGoBack - costToMoveToNewPos)/(turnsSpent + k);

            //haliteRate = (netHaliteCollected)/(turnsSpent + k);

            //logging.info(`Ship-${ship.id}: collect: ${haliteCollected} has halite there: ${haliteCargoThere}, left: ${haliteLeft}, Cost to go back: ${costToGoBack}, mines for ${k} turns; total turns: ${(turnsSpent+k)} at ${pos}, rate: ${haliteRate}`);
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
            if (haliteCargoThere >= 500 && haliteCargoThere + haliteCollected >= 1000/1.02) {
              //if ship can fill enough to return, we find best position by the one that results in the ship coming back earliest
              //logging.info(`Ships-${ship.id}: Mine ${k} turns total turns: ${turnsSpent+k} at ${pos}`)
              if (turnsSpent + k < leastTurnsSpent) {
                forcedPosition = pos;
                maxHaliteRate = haliteRate; //no longer necessarily a max
                leastTurnsSpent = totalTurnsSpent;
                useForcedPosition = true;
                leastMineTurns = k;
              }
            }
            */
          }
          //logging.info(`Ship-${ship.id}: Rate: ${localMaxHaliteRate} when mine at ${pos} taking up ${localTurnsSpent}`);
        
      }

    }
  }
  
  if (useForcedPosition === true) {
    logging.info(`Ship-${ship.id}: Rate: ${maxHaliteRate} when mining at ${forcedPosition} for ${leastMineTurns} turns taking up the least ${leastTurnsSpent} turns to get back`);
    return forcedPosition;
  }
  logging.info(`Ship-${ship.id}: Rate: ${maxHaliteRate} when mining at ${omp} for ${mineTurns} turns taking up ${totalTurnsSpent} turns to get back`);
  return omp;
  
}


//In the next 6 turns, find most optimal place to go
function nonextMiningPosition(gameMap, player, ship, range){
  let omp = ship.position; //optimal mining position
  let possiblePositions = search.circle(gameMap, ship.position, range);
  let shipShouldReturn = false;
  let numTurns = range * 2 + 2; //number of turns we predict ahead
  let currentHaliteCollected = halitePotential(gameMap, ship.position, numTurns);
  let currentCargo = ship.haliteAmount;
  //find number of turns to overflow instead to calculate rate?

  if (currentCargo + currentHaliteCollected >= 1000) {
    numTurns = turnsToOverfill(gameMap, ship.haliteAmount, ship.position, gameMap.get(ship.position).haliteAmount, 0);
    //logging.info(`Ship-${ship.id}: overfills in ${numTurns} turns after collecting ${currentHaliteCollected} halite adding to ${currentCargo} amount of halite`);
    currentHaliteCollected = 1000 - currentCargo;
    currentCargo = 1000;
    
    
  }
  else {
    currentCargo += currentHaliteCollected;
  }
  let nearestDropoffAndDist = search.findNearestDropoff(gameMap, player, ship.position, true);
  let nearestDropoff = nearestDropoffAndDist.nearest;
  let distanceToDropoff = nearestDropoffAndDist.distance;
  let maxHaliteRate = currentCargo/(numTurns+distanceToDropoff)
  //logging.info(`Ship-${ship.id}: costToPos:0, collects: ${currentHaliteCollected} at ${ship.position} in ${numTurns} turns of mining`);
  logging.info(`Ship-${ship.id}: costToPos:${0}, collects: ${currentCargo} at ${omp} in ${numTurns} turns of mining; rate: ${maxHaliteRate}`);
  
  
  for (let i = 0; i < possiblePositions.length; i++) {
    let pos = possiblePositions[i]
    let gameTile = gameMap.get(pos);
    if (!gameTile.isOccupied && !gameTile.hasStructure){
      
      
      
      let distanceToPos = gameMap.calculateDistance(ship.position, pos); //Number of turns it takes to reach new position
      let turnsSpent = numTurns;
      
      //mine 8 - distanceToPos * 2 turns, * 2 to account for the fact bot has to come back as well. We essentially compare mining farther with mining at original spot
      let turnsMining = (numTurns - distanceToPos * 2);
      let haliteRate = -1000;
      
      
      //let nearestDropoffAndDist2 = search.findNearestDropoff(gameMap, player, ship.position, true);
      //let nearestDropoff2 = nearestDropoffAndDist.nearest;
      //let distanceToDropoff2 = nearestDropoffAndDist.distance;
      
      let costToPos = costToMoveThere(gameMap, ship.position, pos);
      let haliteCargo = ship.haliteAmount;
      let haliteCargoThere = haliteCargo - costToPos;
      
      let haliteCollectedThere = halitePotential(gameMap, pos, turnsMining);
      
      if (haliteCargoThere + haliteCollectedThere >= 1000) {
        let realMiningTurns = turnsToOverfill(gameMap, haliteCargoThere, pos, gameMap.get(pos).haliteAmount, 0);
        
        logging.info(`Ship-${ship.id} will over fill in ${realMiningTurns} turns when allowed to mine for ${turnsMining} turns`);
        turnsMining = realMiningTurns;
        haliteCollectedThere = 1000 - haliteCargoThere;
        haliteCargoThere = 1000;
      }
      else {
        haliteCargoThere = haliteCargoThere + haliteCollectedThere;
      }
      //HaliteCargoThere is the current halite cargo after mining
      let haliteLeftThere = gameMap.get(pos).haliteAmount - haliteCollectedThere;
      let costBackToOriginalPos = costToMoveThere(gameMap, ship.position, pos, haliteLeftThere);
      
      let netHalite = haliteCollectedThere - costBackToOriginalPos - costToPos;
      
      haliteRate = (haliteCargoThere - costBackToOriginalPos) / (turnsMining + distanceToPos*2 + distanceToDropoff);
      
      if(haliteRate > maxHaliteRate) {
        maxHaliteRate = haliteRate;
        omp = pos;
        logging.info(`Best choice so far: Ship-${ship.id}:`);
      }
      logging.info(`Ship-${ship.id}: costToPos:${costToPos}, new cargo: ${haliteCargoThere - costBackToOriginalPos} at ${pos} in ${turnsMining} turns of mining; rate: ${haliteRate}`);
      /*
      for (let k = 0; k <= 5; k++) {
        
        let haliteRate = -1000;
        
        let haliteCollectedHere = halitePotential(gameMap, pos, k);
        let haliteCargo = ship.haliteAmount;
        if (haliteCargo + haliteCollectedHere >= 1000) {
          haliteCollectedHere = 1000 - haliteCargo;
          haliteCargo = 1000;
        }
        else {
          haliteCargo = haliteCargo + haliteCollectedHere;
        }
        
        let haliteLeft = gameMap.get(ship.position).haliteAmount - haliteCollectedHere; //halite left on current tile
        let costToPos = costToMoveThere(gameMap, ship, pos, haliteLeft);
        let haliteCargoThere = haliteCargo - costToPos;
        
        let haliteCollectedThere = halitePotential(gameMap, pos, 5-k);
        
        if (haliteCargo + haliteCollectedThere >= 1000) {
          haliteCollectedThere = 1000 - haliteCargo;
          haliteCargo = 1000;
        }
        else {
          haliteCargo = haliteCargo + haliteCollectedThere;
        }
        //by now, haliteCargo is the amount of halite in cargo there at position pos
        let haliteLeftThere = gameMap.get(pos).haliteAmount - haliteCollectedThere;
        let costToDropoff = costToMoveThere(gameMap, ship, nearestDropoff.position, haliteLeftThere)
        
        let netHalite = (haliteCargo - costToDropoff); //amount of halite that would be delivered
        haliteRate = netHalite/ (turnsSpent + 5);
        if(haliteRate > maxHaliteRate) {
          maxHaliteRate = haliteRate;
          omp = pos;
        }
      }
      */
      
      
    }
  
  }
  if (shipShouldReturn === true) {
    //return {status: 'return'};
  }
  
  return omp;
  //return {status: 'mine', position: omp};
}

function nextMiningPosition(gameMap, player, ship, range){
  let omp = ship.position;
  let possiblePositions = search.circle(gameMap, ship.position, range);
  let haliteHere = gameMap.get(ship.position).haliteAmount;
  if (haliteHere === 0) {
    haliteHere = 0.0001;
  }
  let highestRatio = -1;
  
  let origNearestDropoffAndDist = search.findNearestDropoff(gameMap, player, ship.position, true);
  let origCostBackToDropoff = costToMoveThere(gameMap, ship.position, origNearestDropoffAndDist.nearest.position);
  //haliteHere -= origCostBackToDropoff;
  
  for (let i = 0; i < possiblePositions.length; i++) {
    let pos = possiblePositions[i]
    let gameTile = gameMap.get(pos);
    let distanceToPos = gameMap.calculateDistance(ship.position, pos);
    if (!gameTile.isOccupied && !gameTile.hasStructure){
      let nearestDropoffAndDist = search.findNearestDropoff(gameMap, player, pos, true);
      let nearestDropoff = nearestDropoffAndDist.nearest;
      let distanceToDropoff = nearestDropoffAndDist.distance;
      let costToPos = costToMoveThere(gameMap, ship.position, pos);
      let costBackToDropoff = costToMoveThere(gameMap, pos, nearestDropoff.position);
      
      
      
      let haliteThere = gameMap.get(pos).haliteAmount;
      let ratio = haliteThere/ ((distanceToPos+1) * haliteHere);
      //logging.info(`Ship-${ship.id} halite at ${pos}: ${haliteThere}, haliteHere:${haliteHere}, ratio: ${ratio}`);
      haliteThere -= costToPos;
      //haliteThere -= costBackToDropoff;
      if (haliteThere > ((distanceToPos+1) * haliteHere)) {
        
        if (ratio > highestRatio){
          highestRatio = ratio;
          omp = pos;
        }
      }
    }
  }
  //logging.info(`Ship-${ship.id} halite at ${omp}: ${gameMap.get(omp).haliteAmount} is ${gameMap.calculateDistance(ship.position, omp)} away, haliteHere:${haliteHere}`);
  return omp;
}

//Finds halite rate
function haliteRate(gameMap, position, ship, haliteBelow){
  
}

function turnsToOverfill(gameMap, currentHalite, pos, haliteBelow, turnNum) {
  let startingHalite = gameMap.get(pos);
  if (haliteBelow) {
    startingHalite = haliteBelow;
  }
  if (startingHalite === 0) {
    return false;
  }
  let turnCount = turnNum += 1;
  let extracted = Math.ceil(startingHalite * extractPercent);
  if (currentHalite + extracted >= 1000) {
    return turnCount;
  }
  return turnsToOverfill(gameMap, currentHalite+extracted, pos, startingHalite - extracted, turnCount);
}

//Returns the amount of halite needed for the ship using unsafeDirections to navigate to reach the targetPos with consideration of which direction is cheaper
function costToMoveThere(gameMap, startPos, targetPos, haliteBelow){
  //logging.info(`Ship-${ship.id}:Calculating totalhalitecost`);
  let currentPosition = startPos;
  
  //If ship is on target position, no halite cost to move there
  if (currentPosition.equals(targetPos)){
    return 0;
  }
  
  let totalHaliteCost = Math.floor(gameMap.get(currentPosition).haliteAmount * moveCostPercent);
  
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
  nextMiningPosition,
}