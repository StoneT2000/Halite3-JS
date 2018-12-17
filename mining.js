const hlt = require('./hlt');
const { Direction, Position } = require('./hlt/positionals');
const manhattanDeltas = {
  0: [[0,0]],
  1: [[0,0], [1,0], [0, -1], [-1, 0], [0, 1]],
  2: [[0,0], 
      [1,0], [0, -1], [-1, 0], [0, 1], 
      [2, 0], [1, -1], [0, -2], [-1, -1], [-2, 0], [-1, 1], [0, 2], [1, 1]],
  3: [[0,0], 
      [1,0], [0, -1], [-1, 0], [0, 1], 
      [2, 0], [1, -1], [0, -2], [-1, -1], [-2, 0], [-1, 1], [0, 2], [1, 1],
      [3, 0], [2, -1], [1, -2], [0, -3], [-1, -2], [-2, -1], [-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]
     ]
  
}
function circle(gameMap, source, radius) {
  let positions = [];
  let deltas = manhattanDeltas[radius];
  for (let i = 0; i < deltas.length; i++) {
    positions.push(gameMap.normalize(new Position(source.x + deltas[i][0], source.y + deltas[i][1])))
  }
  return positions;
}
let extractPercent = 1/hlt.constants.EXTRACT_RATIO;
let moveCostPercent = 1/hlt.constants.MOVE_COST_RATIO;
function miningDirection(gameMap, ship){
  let haliteHere = gameMap.get(ship.position).haliteAmount;
  let halitePotential = haliteHere * extractPercent;
  let haliteMoveCost = haliteHere * moveCostPercent;

  //List of unoccupied positions, usually the ones right next to ship.
  let unoccupiedPositions = [];
  let newHalitePotential = -haliteMoveCost;
  let destination = ship.position;
  let currentHalitePotential = halitePotential + (haliteHere - halitePotential) * extractPercent;
  let id = ship.id;
  let possibleDestinations = circle(gameMap, ship.position, 1);
          
          for (let i = 0; i < possibleDestinations.length; i++) {
            let newPos = gameMap.get(possibleDestinations[i]);
            if (!newPos.isOccupied && !newPos.hasStructure){
              unoccupiedPositions.push(possibleDestinations[i]);
              let thisHalitePotential = -haliteMoveCost + newPos.haliteAmount * extractPercent;
              if (thisHalitePotential > newHalitePotential) {
                newHalitePotential = thisHalitePotential;
                destination = possibleDestinations[i];
              }
            }
          }
          //If current spot is more worth it, stay and mine
          if (newHalitePotential < currentHalitePotential) {
            destination = ship.position;
            ships[id].mode = 'mine';
          }
          else if (currentHalitePotential === 0 && newHalitePotential === 0) {
            //This means no halite in surroundings
            let possibleDestinationsExpanded = circle(gameMap, ship.position, 3);
            let haliteThere = 0;
            //This code can be reduced, consider only searching the latter part of the possible destinations as the former part is already checked to = 0;
            for (let i = 0; i < possibleDestinationsExpanded.length; i++) {
              let newPos = gameMap.get(possibleDestinationsExpanded[i]);
              if (!newPos.isOccupied){
                if (haliteThere < newPos.haliteAmount) {
                  haliteThere = newPos.haliteAmount;
                  destination = possibleDestinationsExpanded[i]
                }
              }
            }
            //FOR NOW if halitthere === 0 still, jsut move randomly
            if (haliteThere === 0) {
              logging.info(`ID: ${id} at ${ship.position} can move to: ${unoccupiedPositions}`);
              if (unoccupiedPositions.length > 0){
                destination = unoccupiedPositions[Math.floor(unoccupiedPositions.length * Math.random())];
              }
            }
            
            ships[id].mode = 'search';
          }
          else if (newHalitePotential > 0){
            //Ship mode is search if the halitepotential is greater than the current spot
            ships[id].mode = 'search';
          }
          
          //const direction = Direction.getAllCardinals()[Math.floor(4 * Math.random())];
          //const destination = ship.position.directionalOffset(direction);
          ships[id].targetDestination = destination;
  return destination;
}
module.exports = {
  //returns target location
  miningDirection,
  extractPercent,
  moveCostPercent
  
  
}