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
function findOptimalMiningPosition(gameMap, ship, range, kTurns) {
  
  let omp = ship.position;
  
  let haliteHere = gameMap.get(ship.position).haliteAmount;
  
  //kTurns = Number of turns to look ahead by to perform calcs
  
  let haliteMoveCost = haliteHere * moveCostPercent;
  let newHalitePotential = -haliteMoveCost;
  let currentHalitePotential = halitePotential(gameMap, ship.position, kTurns);
  if (currentHalitePotential > 1000 - ship.haliteAmount) {
    currentHalitePotential = 1000 - ship.haliteAmount
  }
  let id = ship.id;
  let possibleDestinations = search.circle(gameMap, ship.position, range);
  /*
  let possibleDestinations1 = possibleDestinations.slice(1, 5);
  let possibleDestinations2 = possibleDestinations.slice(5, 13);
  let possibleDestinations3 = possibleDestinations.slice(13, 29);
  */
  let bestNewHaliteDestination = ship.position;
  for (let i = 0; i < possibleDestinations.length; i++) {
    let newTile = gameMap.get(possibleDestinations[i]);
    let turnOffset = 2;
    if (i === 0) {
      turnOffset = 0;
    }
    else if (i <= 4){
      turnOffset = 2;
    }
    else if (i <= 12) {
      turnOffset = 4;
    }
    else if (i <= 28) {
      turnOffset = 6;
    }
    else if (i <= 60) {
      turnOffset = 8;
    }
    else if (i <= 124) {
      turnOffset = 10;
    }
    else {
      turnOffset = 10;
    }
    if (!newTile.isOccupied && !newTile.hasStructure){
      //unoccupiedPositions.push(possibleDestinations[i]);

      let thisHaliteExtracted = halitePotential(gameMap, possibleDestinations[i], kTurns - turnOffset);
      if (thisHaliteExtracted > 1000 - ship.haliteAmount) {
        thisHaliteExtracted = 1000 - ship.haliteAmount
      }
      
      let thisHaliteStart = newTile.haliteAmount;
      let thisHalitePotential = -haliteMoveCost + thisHaliteExtracted - (thisHaliteStart - thisHaliteExtracted) * extractPercent;

      //Move cost from current position, and move cost after extracting for kTurns-2 (2 due to moving)

      if (thisHalitePotential > newHalitePotential) {
        newHalitePotential = thisHalitePotential;
        bestNewHaliteDestination = possibleDestinations[i];
      }
    }
  }
  
  /*
  if (range >= 1){
    for (let i = 0; i < possibleDestinations1.length; i++) {
      let newTile = gameMap.get(possibleDestinations1[i]);
      if (!newTile.isOccupied && !newTile.hasStructure){
        //unoccupiedPositions.push(possibleDestinations[i]);

        let thisHaliteExtracted = halitePotential(gameMap, possibleDestinations1[i], kTurns - 2);
        let thisHaliteStart = newTile.haliteAmount;
        let thisHalitePotential = -haliteMoveCost + thisHaliteExtracted - (thisHaliteStart - thisHaliteExtracted) * extractPercent;

        //Move cost from current position, and move cost after extracting for kTurns-2 (2 due to moving)

        if (thisHalitePotential > newHalitePotential) {
          newHalitePotential = thisHalitePotential;
          bestNewHaliteDestination = possibleDestinations1[i];
        }
      }
    }
  }
  if (range >=2){
    for (let i = 0; i < possibleDestinations2.length; i++) {
      let newTile = gameMap.get(possibleDestinations2[i]);
      if (!newTile.isOccupied && !newTile.hasStructure){
        //unoccupiedPositions.push(possibleDestinations[i]);

        let thisHaliteExtracted = halitePotential(gameMap, possibleDestinations2[i], kTurns - 4);
        let thisHaliteStart = newTile.haliteAmount;
        let thisHalitePotential = -haliteMoveCost + thisHaliteExtracted - (thisHaliteStart - thisHaliteExtracted) * extractPercent; //not accurate, we omit the cost to move over the tile we don't mine

        //Move cost from current position, and move cost after extracting for kTurns-2 (2 due to moving)

        if (thisHalitePotential > newHalitePotential) {
          newHalitePotential = thisHalitePotential;
          bestNewHaliteDestination = possibleDestinations2[i];
          logging.info(`Ship-${id} is mining farther at ${bestNewHaliteDestination}`);
        }
      }
    }
  }
  if (range >=3){
    for (let i = 0; i < possibleDestinations3.length; i++) {
      let newTile = gameMap.get(possibleDestinations3[i]);
      if (!newTile.isOccupied && !newTile.hasStructure){
        //unoccupiedPositions.push(possibleDestinations[i]);

        let thisHaliteExtracted = halitePotential(gameMap, possibleDestinations3[i], kTurns - 6);
        let thisHaliteStart = newTile.haliteAmount;
        let thisHalitePotential = -haliteMoveCost + thisHaliteExtracted - (thisHaliteStart - thisHaliteExtracted) * extractPercent; //not accurate, we omit the cost to move over the tile we don't mine

        //Move cost from current position, and move cost after extracting for kTurns-2 (2 due to moving)

        if (thisHalitePotential > newHalitePotential) {
          newHalitePotential = thisHalitePotential;
          bestNewHaliteDestination = possibleDestinations3[i];
          //logging.info(`Ship-${id} is mining farther at ${bestNewHaliteDestination}`);
        }
      }
    }
  }
  */
  //Keep mining original place if better
  if (newHalitePotential < currentHalitePotential) {
    omp = ship.position;
  }
  //No halite anywhere within 1 unit? Expand search
  else if ((currentHalitePotential === 0 && newHalitePotential === 0) || (currentHalitePotential + newHalitePotential <= 20)) {
    //the additional or was added without huge reason, fix it later
    let possibleDestinationsExpanded = search.circle(gameMap, ship.position, 8);
    let haliteThere = 0;
    //This code can be reduced, consider only searching the latter part of the possible destinations as the former part is already checked to = 0;
    for (let i = 0; i < possibleDestinationsExpanded.length; i++) {
      let newTile = gameMap.get(possibleDestinationsExpanded[i]);
      if (!newTile.isOccupied){
        if (haliteThere < newTile.haliteAmount) {
          haliteThere = newTile.haliteAmount;
          bestNewHaliteDestination = possibleDestinationsExpanded[i]
        }
      }
    }
    //If no halite nearby
    if (haliteThere === 0){
      bestNewHaliteDestination = possibleDestinationsExpanded[Math.floor(Math.random()*(possibleDestinationsExpanded.length - 1)) + 1];
    }
    omp = bestNewHaliteDestination;
  }
  //New tile has more potential, move there;
  else if (newHalitePotential > currentHalitePotential){
    omp = bestNewHaliteDestination;
  }
  
  return omp;
  
};