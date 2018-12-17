const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
const search = require('./search.js')


let extractPercent = 0.25//1/hlt.constants.EXTRACT_RATIO;
let moveCostPercent = 0.1//1/hlt.constants.MOVE_COST_RATIO;
function findOptimalMiningPosition(gameMap, ship) {
  
  let omp = ship.position;
  
  let haliteHere = gameMap.get(ship.position).haliteAmount;
  let halitePotential = haliteHere * extractPercent;
  let haliteMoveCost = haliteHere * moveCostPercent;
  let newHalitePotential = -haliteMoveCost;
  let currentHalitePotential = halitePotential + (haliteHere - halitePotential) * extractPercent;
  let id = ship.id;
  let possibleDestinations = search.circle(gameMap, ship.position, 1);
  let bestNewHaliteDestination = ship.position;
  for (let i = 0; i < possibleDestinations.length; i++) {
    let newTile = gameMap.get(possibleDestinations[i]);
    if (!newTile.isOccupied && !newTile.hasStructure){
      //unoccupiedPositions.push(possibleDestinations[i]);
      let thisHalitePotential = -haliteMoveCost + newTile.haliteAmount * extractPercent;
      if (thisHalitePotential > newHalitePotential) {
        newHalitePotential = thisHalitePotential;
        bestNewHaliteDestination = possibleDestinations[i];
      }
    }
  }
  //Keep mining original place if better
  if (newHalitePotential < currentHalitePotential) {
    omp = ship.position;
  }
  //No halite anywhere near? Expand search
  else if (currentHalitePotential === 0 && newHalitePotential === 0) {
    let possibleDestinationsExpanded = search.circle(gameMap, ship.position, 3);
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
      bestNewHaliteDestination = possibleDestinationsExpanded[Math.floor(Math.random()*3) + 1];
    }
    omp = bestNewHaliteDestination;
  }
  //New tile has more potential, move there;
  else if (newHalitePotential >= currentHalitePotential){
    omp = bestNewHaliteDestination;
  }
  
  return omp;
  
};
module.exports = {
  extractPercent,
  moveCostPercent,
  findOptimalMiningPosition,
}