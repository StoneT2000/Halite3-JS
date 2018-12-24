const hlt = require('./../hlt');
const { Direction, Position } = require('./../hlt/positionals');

//Deltas ordered like a BFS search for deltas.
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
     ],
  4: [[0,0], 
      [1,0], [0, -1], [-1, 0], [0, 1], 
      [2, 0], [1, -1], [0, -2], [-1, -1], [-2, 0], [-1, 1], [0, 2], [1, 1],
      [3, 0], [2, -1], [1, -2], [0, -3], [-1, -2], [-2, -1], [-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1],
      [4, 0], [3, -1], [2, -2], [1, -3], [0, -4], [-1, -3], [-2, -2], [-3, -1], [-4, 0], [-3, 1], [-2, 2], [-1, 3], [0, 4], [1, 3], [2, 2], [3, 1]
  ],
  5:  [[0,0], 
      [1,0], [0, -1], [-1, 0], [0, 1], 
      [2, 0], [1, -1], [0, -2], [-1, -1], [-2, 0], [-1, 1], [0, 2], [1, 1],
      [3, 0], [2, -1], [1, -2], [0, -3], [-1, -2], [-2, -1], [-3, 0], [-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1],
      [4, 0], [3, -1], [2, -2], [1, -3], [0, -4], [-1, -3], [-2, -2], [-3, -1], [-4, 0], [-3, 1], [-2, 2], [-1, 3], [0, 4], [1, 3], [2, 2], [3, 1],
      [5, 0], [4, -1], [3, -2], [2, -3], [1, -4], [0, -5], [-1, -4], [-2, -3], [-3, -2], [-4, -1], [-5, 0], [-4, 1], [-3, 2], [-2, 3], [-1, 4], [0, 5], [1, 4], [2, 3], [3, 2], [4, 1],
  ],
  6:  [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1]],
  7:  [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1]],
  8: [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1],[8,0],[7,-1],[6,-2],[5,-3],[4,-4],[3,-5],[2,-6],[1,-7],[0,-8],[-1,-7],[-2,-6],[-3,-5],[-4,-4],[-5,-3],[-6,-2],[-7,-1],[-8,0],[-7,1],[-6,2],[-5,3],[-4,4],[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5],[4,4],[5,3],[6,2],[7,1]],
  9: [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1],[8,0],[7,-1],[6,-2],[5,-3],[4,-4],[3,-5],[2,-6],[1,-7],[0,-8],[-1,-7],[-2,-6],[-3,-5],[-4,-4],[-5,-3],[-6,-2],[-7,-1],[-8,0],[-7,1],[-6,2],[-5,3],[-4,4],[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5],[4,4],[5,3],[6,2],[7,1],[9,0],[8,-1],[7,-2],[6,-3],[5,-4],[4,-5],[3,-6],[2,-7],[1,-8],[0,-9],[-1,-8],[-2,-7],[-3,-6],[-4,-5],[-5,-4],[-6,-3],[-7,-2],[-8,-1],[-9,0],[-8,1],[-7,2],[-6,3],[-5,4],[-4,5],[-3,6],[-2,7],[-1,8],[0,9],[1,8],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[8,1]],
  10: [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1],[8,0],[7,-1],[6,-2],[5,-3],[4,-4],[3,-5],[2,-6],[1,-7],[0,-8],[-1,-7],[-2,-6],[-3,-5],[-4,-4],[-5,-3],[-6,-2],[-7,-1],[-8,0],[-7,1],[-6,2],[-5,3],[-4,4],[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5],[4,4],[5,3],[6,2],[7,1],[9,0],[8,-1],[7,-2],[6,-3],[5,-4],[4,-5],[3,-6],[2,-7],[1,-8],[0,-9],[-1,-8],[-2,-7],[-3,-6],[-4,-5],[-5,-4],[-6,-3],[-7,-2],[-8,-1],[-9,0],[-8,1],[-7,2],[-6,3],[-5,4],[-4,5],[-3,6],[-2,7],[-1,8],[0,9],[1,8],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[8,1],[10,0],[9,-1],[8,-2],[7,-3],[6,-4],[5,-5],[4,-6],[3,-7],[2,-8],[1,-9],[0,-10],[-1,-9],[-2,-8],[-3,-7],[-4,-6],[-5,-5],[-6,-4],[-7,-3],[-8,-2],[-9,-1],[-10,0],[-9,1],[-8,2],[-7,3],[-6,4],[-5,5],[-4,6],[-3,7],[-2,8],[-1,9],[0,10],[1,9],[2,8],[3,7],[4,6],[5,5],[6,4],[7,3],[8,2],[9,1]],
  11: [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1],[8,0],[7,-1],[6,-2],[5,-3],[4,-4],[3,-5],[2,-6],[1,-7],[0,-8],[-1,-7],[-2,-6],[-3,-5],[-4,-4],[-5,-3],[-6,-2],[-7,-1],[-8,0],[-7,1],[-6,2],[-5,3],[-4,4],[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5],[4,4],[5,3],[6,2],[7,1],[9,0],[8,-1],[7,-2],[6,-3],[5,-4],[4,-5],[3,-6],[2,-7],[1,-8],[0,-9],[-1,-8],[-2,-7],[-3,-6],[-4,-5],[-5,-4],[-6,-3],[-7,-2],[-8,-1],[-9,0],[-8,1],[-7,2],[-6,3],[-5,4],[-4,5],[-3,6],[-2,7],[-1,8],[0,9],[1,8],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[8,1],[10,0],[9,-1],[8,-2],[7,-3],[6,-4],[5,-5],[4,-6],[3,-7],[2,-8],[1,-9],[0,-10],[-1,-9],[-2,-8],[-3,-7],[-4,-6],[-5,-5],[-6,-4],[-7,-3],[-8,-2],[-9,-1],[-10,0],[-9,1],[-8,2],[-7,3],[-6,4],[-5,5],[-4,6],[-3,7],[-2,8],[-1,9],[0,10],[1,9],[2,8],[3,7],[4,6],[5,5],[6,4],[7,3],[8,2],[9,1],[11,0],[10,-1],[9,-2],[8,-3],[7,-4],[6,-5],[5,-6],[4,-7],[3,-8],[2,-9],[1,-10],[0,-11],[-1,-10],[-2,-9],[-3,-8],[-4,-7],[-5,-6],[-6,-5],[-7,-4],[-8,-3],[-9,-2],[-10,-1],[-11,0],[-10,1],[-9,2],[-8,3],[-7,4],[-6,5],[-5,6],[-4,7],[-3,8],[-2,9],[-1,10],[0,11],[1,10],[2,9],[3,8],[4,7],[5,6],[6,5],[7,4],[8,3],[9,2],[10,1]],
  12: [[0,0],[1,0],[0,-1],[-1,0],[0,1],[2,0],[1,-1],[0,-2],[-1,-1],[-2,0],[-1,1],[0,2],[1,1],[3,0],[2,-1],[1,-2],[0,-3],[-1,-2],[-2,-1],[-3,0],[-2,1],[-1,2],[0,3],[1,2],[2,1],[4,0],[3,-1],[2,-2],[1,-3],[0,-4],[-1,-3],[-2,-2],[-3,-1],[-4,0],[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1],[5,0],[4,-1],[3,-2],[2,-3],[1,-4],[0,-5],[-1,-4],[-2,-3],[-3,-2],[-4,-1],[-5,0],[-4,1],[-3,2],[-2,3],[-1,4],[0,5],[1,4],[2,3],[3,2],[4,1],[6,0],[5,-1],[4,-2],[3,-3],[2,-4],[1,-5],[0,-6],[-1,-5],[-2,-4],[-3,-3],[-4,-2],[-5,-1],[-6,0],[-5,1],[-4,2],[-3,3],[-2,4],[-1,5],[0,6],[1,5],[2,4],[3,3],[4,2],[5,1],[7,0],[6,-1],[5,-2],[4,-3],[3,-4],[2,-5],[1,-6],[0,-7],[-1,-6],[-2,-5],[-3,-4],[-4,-3],[-5,-2],[-6,-1],[-7,0],[-6,1],[-5,2],[-4,3],[-3,4],[-2,5],[-1,6],[0,7],[1,6],[2,5],[3,4],[4,3],[5,2],[6,1],[8,0],[7,-1],[6,-2],[5,-3],[4,-4],[3,-5],[2,-6],[1,-7],[0,-8],[-1,-7],[-2,-6],[-3,-5],[-4,-4],[-5,-3],[-6,-2],[-7,-1],[-8,0],[-7,1],[-6,2],[-5,3],[-4,4],[-3,5],[-2,6],[-1,7],[0,8],[1,7],[2,6],[3,5],[4,4],[5,3],[6,2],[7,1],[9,0],[8,-1],[7,-2],[6,-3],[5,-4],[4,-5],[3,-6],[2,-7],[1,-8],[0,-9],[-1,-8],[-2,-7],[-3,-6],[-4,-5],[-5,-4],[-6,-3],[-7,-2],[-8,-1],[-9,0],[-8,1],[-7,2],[-6,3],[-5,4],[-4,5],[-3,6],[-2,7],[-1,8],[0,9],[1,8],[2,7],[3,6],[4,5],[5,4],[6,3],[7,2],[8,1],[10,0],[9,-1],[8,-2],[7,-3],[6,-4],[5,-5],[4,-6],[3,-7],[2,-8],[1,-9],[0,-10],[-1,-9],[-2,-8],[-3,-7],[-4,-6],[-5,-5],[-6,-4],[-7,-3],[-8,-2],[-9,-1],[-10,0],[-9,1],[-8,2],[-7,3],[-6,4],[-5,5],[-4,6],[-3,7],[-2,8],[-1,9],[0,10],[1,9],[2,8],[3,7],[4,6],[5,5],[6,4],[7,3],[8,2],[9,1],[11,0],[10,-1],[9,-2],[8,-3],[7,-4],[6,-5],[5,-6],[4,-7],[3,-8],[2,-9],[1,-10],[0,-11],[-1,-10],[-2,-9],[-3,-8],[-4,-7],[-5,-6],[-6,-5],[-7,-4],[-8,-3],[-9,-2],[-10,-1],[-11,0],[-10,1],[-9,2],[-8,3],[-7,4],[-6,5],[-5,6],[-4,7],[-3,8],[-2,9],[-1,10],[0,11],[1,10],[2,9],[3,8],[4,7],[5,6],[6,5],[7,4],[8,3],[9,2],[10,1],[12,0],[11,-1],[10,-2],[9,-3],[8,-4],[7,-5],[6,-6],[5,-7],[4,-8],[3,-9],[2,-10],[1,-11],[0,-12],[-1,-11],[-2,-10],[-3,-9],[-4,-8],[-5,-7],[-6,-6],[-7,-5],[-8,-4],[-9,-3],[-10,-2],[-11,-1],[-12,0],[-11,1],[-10,2],[-9,3],[-8,4],[-7,5],[-6,6],[-5,7],[-4,8],[-3,9],[-2,10],[-1,11],[0,12],[1,11],[2,10],[3,9],[4,8],[5,7],[6,6],[7,5],[8,4],[9,3],[10,2],[11,1]]
  
};
function calculateManhattanDeltas(dist) {
  var manD = [[0,0]];
  for (let k = 0; k <= dist; k++){
    for (let i = k; i >= 1; i--) {
     manD.push([i, -k + i]);
    }
    for (let i = 0; i >= -k + 1; i--) {
     manD.push([i, -k - i]);
    }
    for (let i = -k; i <= -1; i++) {
     manD.push([i, k + i]);
    }
    for (let i = 0; i <= k - 1; i++) {
     manD.push([i, k - i]);
    }
  }
  return manD;
}
function circle(gameMap, source, radius) {
  let positions = [];
  let deltas = manhattanDeltas[radius];
  for (let i = 0; i < deltas.length; i++) {
    positions.push(gameMap.normalize(new Position(source.x + deltas[i][0], source.y + deltas[i][1])))
  }
  return positions;
}
function findNearestDropoff(gameMap, player, sourcePos, distance) {
  
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
      dist = newdist;
      nearestStructure = dropoff;
    }
  }
  if (distance) {
    return {nearest: nearestStructure, distance: dist};
  }
  return nearestStructure;
}
function numShipsInRadius(gameMap, owner, position, radius) {
  let positions = circle(gameMap, position, radius);
  let totalShips = 0;
  let friendly = 0;
  let enemy = 0;
  for (let i = 0; i < positions.length; i++) {
    let tile = gameMap.get(positions[i]);
    if (tile.ship !== null) {
      if (tile.ship.owner === owner) {
        friendly += 1;
      }
      else {
        enemy += 1;
      }
    }
  }
  totalships = friendly + enemy;
  return {total:totalships, friendly: friendly, enemy: enemy}
}

function totalHaliteOnMap(gameMap) {
  let totalHalite = 0;
  for (let i = 0; i < gameMap.width; i++) {
    for (let j = 0; j < gameMap.height; j++) {
      totalHalite += gameMap.get(new Position(i,j)).haliteAmount;
    }
  }
  return totalHalite;
}
module.exports = {
  manhattanDeltas,
  circle,
  findNearestDropoff,
  numShipsInRadius,
  totalHaliteOnMap,
};