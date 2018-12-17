const hlt = require('./hlt');
const { Direction, Position } = require('./hlt/positionals');
const logging = require('./hlt/logging');
const mining = require('./miningOld.js')
//const manhattanDeltas = require('./manhattanDeltas.js')
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
const game = new hlt.Game();
//target destinations holds ship ids as keys with position object as values
let idealDropOffLocs = {};
let ships = {};
game.initialize().then(async () => {
  // At this point "game" variable is populated with initial map data.
  // This is a good place to do computationally expensive start-up pre-processing.
  // As soon as you call "ready" function below, the 2 second per turn timer will start.
  await game.ready('OldBot');
  
  //Search for dense clusters of halite
  
  
  logging.info(`My Player ID is ${game.myId}.`);
  let extractPercent = 1/hlt.constants.EXTRACT_RATIO;
  let moveCostPercent = 1/hlt.constants.MOVE_COST_RATIO;

  while (true) {
    let start = new Date().getTime();
    
    await game.updateFrame();

    const { gameMap, me } = game;

    const commandQueue = [];
    
    for (const ship of me.getShips()) {
      let id = ship.id;
      
      //Initialize ship into the ships object if needed
      if (ships[id] === undefined) {
        ships[id] = {};
        if (ships[id].targetDestination === undefined) {
        //logging.info(`Nulling: ${ship.id}`);
          ships[id].targetDestination = null;
        }
        if (ships[id].distanceLeftToDestination === undefined) {
          ships[id].distanceLeftToDestination = 0;
        }
        //MODES:
        //mine = mining
        //search = not mining, just moving to find halite sources and move out of the way
        ships[id].mode = 'mine';
      }
      //If destination reached, set ships[id].targetDestination to null
      //logging.info(`${ship.position} = ${ships[id].targetDestination}`);
      if (ships[id].targetDestination !== null && (ship.position).equals(ships[id].targetDestination)){
        //logging.info(`Reset target dest: ${ship.id}`);
        ships[id].targetDestination = null;
      }
      
      
      ships[id].aboutToMove = false;
      //Normal game
      
      //SHIP always has a target destination that must be set. Ship will always move safely towards target destination if possible. Add strats for sinking later
      
      //Potential halite to be earned this turn if still
      let haliteHere = gameMap.get(ship.position).haliteAmount;
      let halitePotential = haliteHere * extractPercent;
      let haliteMoveCost = haliteHere * moveCostPercent;
      
      //List of unoccupied positions, usually the ones right next to ship.
      let unoccupiedPositions = [];
      let newHalitePotential = -haliteMoveCost;
      let destination = ship.position;
      let currentHalitePotential = halitePotential + (haliteHere - halitePotential) * extractPercent;

      if (game.turnNumber < 0.92 * hlt.constants.MAX_TURNS) {
      
        //CODE for what to do when halite is near full
        if (ship.haliteAmount > hlt.constants.MAX_HALITE / 1.1) {
          //change /2 to like /1.2
          //with enough halite, send ship to nearest drop off point safely. 
          
          //If target dest. not set, set it
          if (ships[id].targetDestination === null) {
          //replace with find nearest thing
            const dropOffDestination = me.shipyard.position;
            ships[id].targetDestination = dropOffDestination;
          }
        }
        
        //This is mining mode
        //New tile we move to depends on how much halite it has compared to current potential, and its distance to shipyard
        //Determining where to go needs a function that finds the optimal tile to move that generates the most halite per turn considering distance and halite
        else {
          if (ships[id].targetDestination === null) {
            
          }
          
          //Halite potential if move is made. Essentially, first move we lose halite
          
          
          //potential in 2 turns
          
          //Method 1:
          //Look at direct unoccupied neighbor tiles that don't have structure (duh, no halite)
          //If halite generated at neighbor tile in 2 turns > currentHalitePotential, move there
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
          //ships[id].distanceLeftToDestination = 1;
          
          
        }
        
        //If ship has a target, prepare to move to it
        if (canMove(gameMap, ship)){
          if (ships[id].targetDestination !== null) {
            logging.info(`Ship-ID: ${id} | Destination: ${ships[id].targetDestination}`)
            //FINALIZE MOVEMENTS
            let safeMove = gameMap.naiveNavigate(ship, ships[id].targetDestination);
            //logging.info(`ID:${id} at ${ship.position} safeMove: ${safeMove}`);
            if (safeMove === Direction.Still && (ships[id].mode !== 'mine' || gameMap.get(ship.position).haliteAmount === 0)){
              //If ship isn't mining or there is 0 halite, force ship to move away to an unoccupied position
              //logging.info(`ID: ${id} at ${ship.position} can move to: ${unoccupiedPositions}`);
              if (unoccupiedPositions.length){
                safeMove = gameMap.naiveNavigate(ship, unoccupiedPositions[Math.floor(unoccupiedPositions.length * Math.random())]);
              }
            }
            commandQueue.push(ship.move(safeMove));

          }
          else {
            logging.info(`Ship-ID: ${id} | Destination: ${ships[id].targetDestination}`)
          }
        }
        else {
          logging.info(`ship: ${id} couldn't move`)
        }
        
        
        
      }
      else {
        
        if (ships[id].targetDestination === null || ships[id].mode !== 'dropOffHalite') {
          
          //This keeps getting calculate for some reason
          logging.info(`Calculating nearest dropoff for ship: ${id}`);
          let posAndDist = positionAndDistOfNearestDropoff(gameMap, me, ship.position);
          ships[id].targetDestination = posAndDist.position;
          ships[id].distanceLeftToDestination = posAndDist.distance;
          ships[id].mode = 'dropOffHalite';
        }
        else {
          logging.info(`Ship-ID: ${id} | Pos: ${ship.position} Destination: ${ships[id].targetDestination} Distance To: ${ships[id].distanceLeftToDestination}`);
          //FINALIZE MOVEMENTS
          //Allow unsafe move if one away from dropoff
          //Final movements, allow synchronous moving
          //Essentially, if you try to move to a occupied square but that turtle is going to move away, u can move there
        }
        ships[id].distanceLeftToDestination = positionAndDistOfNearestDropoff(gameMap, me, ship.position).distance;
        if (canMove(gameMap, ship)){
          if (ships[id].distanceLeftToDestination === 1) {
            const finalDirections = gameMap.getUnsafeMoves(ship.position, ships[id].targetDestination);
            commandQueue.push(ship.move(finalDirections[0]));
            //ships[id].distanceLeftToDestination -= 1;
          }
          else {
            const safeMove = gameMap.naiveNavigate(ship, ships[id].targetDestination);
            if (safeMove === Direction.still) {
              ships[id].aboutToMove = false;
              idleShips.push(ship);
            }
            else {

              //Say that this ship is succesfully about to move somewhere, then define its old spot as unoccupied
              commandQueue.push(ship.move(safeMove));
              ships[id].aboutToMove = true;
              //gameMap.get(ship.position).ship = null;
              //ships[id].distanceLeftToDestination -= 1;
            }
            
          }
        }
        

      }

    }

    if (game.turnNumber < 0.75 * hlt.constants.MAX_TURNS &&
      me.haliteAmount >= hlt.constants.SHIP_COST &&
      !gameMap.get(me.shipyard).isOccupied) {
      let positionsToCheck = circle(gameMap, me.shipyard.position, 1);
      let open = 5;
      for (let i = 0; i < positionsToCheck.length; i++) {
        if(gameMap.get(positionsToCheck[i]).isOccupied) {
          open -=1;
        }
      }
      logging.info(`Open spots: ${open}`);
      if (open >= 2) {
        //>=2 because one spot is the spawn point, one is an exit point.
        commandQueue.push(me.shipyard.spawn());
      }
    }
    
    
    //FINAL TURNS CODE
    if (game.turnNumber > 0.8 * hlt.constants.MAX_TURNS) {
      //gameMap.calculateDistance(ship.position, )
      
    }

    await game.endTurn(commandQueue);
    
    
    let end = new Date().getTime();
    let time = end - start;
    logging.info(`Turn took: ${time} ms`);
  }
});

//Finds nearest dropoff position or shipyard position
function positionAndDistOfNearestDropoff(gameMap, player, sourcePos) {
  
  let dist = gameMap.calculateDistance(sourcePos, player.shipyard.position);
  let dropoffs = player.getDropoffs();
  let targetPos = player.shipyard.position;
  for (dropoff in dropoffs) {
    let newdist = gameMap.calculateDistance(sourcePos, dropoff.position);
    if (newdist < dist) {
      targetPos = dropoff.position;
    }
  }
  return {position:targetPos, distance:dist};
}
function canMove(gameMap, ship) {
  if (ship.haliteAmount >= gameMap.get(ship.position).haliteAmount * 0.1) {
    return true;
  } 
  return false;
}
function syncNavigate(gameMap, ship, destination) {
  //Prefer to go to direction where there are no ships
  let dirs = gameMap.getUnsafeMoves(ship.position, destination);
  let targetDir = Direction.still;
  for (const dir in dirs) {
    const targetPos = ship.position.directionalOffset(direction);
    
    if (!gameMap.get(targetPos).isOccupied) {
      return dir;  
    }
  }
  return Direction.still;
}
//returns array of Positions within manhattan radius
function circle(gameMap, source, radius) {
  let positions = [];
  let deltas = manhattanDeltas[radius];
  for (let i = 0; i < deltas.length; i++) {
    positions.push(gameMap.normalize(new Position(source.x + deltas[i][0], source.y + deltas[i][1])))
  }
  return positions;
}