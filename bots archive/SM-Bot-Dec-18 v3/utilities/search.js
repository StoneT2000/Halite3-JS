const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');
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
  
};
function circle(gameMap, source, radius) {
  let positions = [];
  let deltas = manhattanDeltas[radius];
  for (let i = 0; i < deltas.length; i++) {
    positions.push(gameMap.normalize(new Position(source.x + deltas[i][0], source.y + deltas[i][1])))
  }
  return positions;
}
function findNearestDropoff(gameMap, player, sourcePos) {
  
  let nearestStructure = player.shipyard;
  let dist = gameMap.calculateDistance(sourcePos, player.shipyard.position);
  let dropoffs = player.getDropoffs();
  //let targetDropId = player.shipyard.id;
  //let targetPos = player.shipyard.position;
  for (const dropoff of dropoffs) {
    let newdist = gameMap.calculateDistance(sourcePos, dropoff.position);
    if (newdist < dist) {
      //targetPos = dropoff.position;
      //targetDropId = dropoff.id;
      nearestStructure = dropoff;
    }
  }
  return nearestStructure;
}
module.exports = {
  manhattanDeltas,
  circle,
  findNearestDropoff,
};