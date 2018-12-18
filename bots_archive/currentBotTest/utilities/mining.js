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
  let id = ship.id;
  let possibleDestinations = search.circle(gameMap, ship.position, 3);
  let possibleDestinations1 = possibleDestinations.slice(1, 5);
  let possibleDestinations2 = possibleDestinations.slice(5, 13);
  let possibleDestinations3 = possibleDestinations.slice(13, 29);
  let bestNewHaliteDestination = ship.position;
  
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
//Determine halitePotential gained in these turns at this position
function halitePotential(gameMap, position, turns) {
  let haliteHere = gameMap.get(position).haliteAmount;
  return ((1 - (Math.pow(0.75, turns))) / (1 - 0.75))*extractPercent*haliteHere;
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