const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
const search = require('./search.js')
const logging = require('./../hlt/logging')

let extractPercent = 0.25//1/hlt.constants.EXTRACT_RATIO;
let moveCostPercent = 0.1//1/hlt.constants.MOVE_COST_RATIO;
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
  findOptimalMiningPosition,
  totalHaliteInRadius,
}