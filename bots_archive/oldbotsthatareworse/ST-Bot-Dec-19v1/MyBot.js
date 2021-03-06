const hlt = require('./hlt');
const {Direction, Position} = require('./hlt/positionals');
const logging = require('./hlt/logging');
const commands = require('./hlt/commands');
//const util = require('./utilities');
const movement = require('./utilities/movement.js');
const mining = require('./utilities/mining.js');
const search = require('./utilities/search.js');
const game = new hlt.Game();



let meta = 'normal';

let ships = {};
game.initialize().then(async () => {
  // At this point "game" variable is populated with initial map data.
  // This is a good place to do computationally expensive start-up pre-processing.
  // As soon as you call "ready" function below, the 2 second per turn timer will start.
  await game.ready('ST-Bot-Dec-19v1');

  logging.info(`My Player ID is ${game.myId}.`);
  
  const {gameMap, me} = game;
  
  let mapSize = gameMap.width * gameMap.height;
  let numShips = 0;
  let numDropoffs = 1;
  let maxDropoffs = 1;
  let averageHalite = 0;
  let idealDropOffLocs = [];
  let attackMode = true; //allow semi-intentional collisions with opponent
  let numPlayers = 0;
  for (let key of game.players){
    numPlayers += 1;
  }
  logging.info(`There are ${numPlayers} players`);
  if (numPlayers === 4){
    attackMode = true;
    logging.info(`Ships can atttack`)
  }
  else {
    logging.info(`Ships can attack`)
  }
  for (let i = 0; i < gameMap.width; i++) {
    for (let j = 0; j < gameMap.width; j++) {
      averageHalite += gameMap.get(new Position(i,j)).haliteAmount;
    }
  }
  averageHalite = averageHalite / mapSize;
  logging.info(`Average Halite: ${averageHalite}`);
  for (let i = 0; i < gameMap.width; i++) {
    for (let j = 0; j < gameMap.width; j++) {
      let thisAmount = gameMap.get(new Position(i,j)).haliteAmount;
      if (thisAmount > averageHalite * 2 || thisAmount > 600) {
        idealDropOffLocs.push(new Position(i,j));
        //logging.info(`ideal Loc: (${i},${j})`);
      }
    }
  }
  
  //How far ship is willing to look for potential mining spots. early game, its 1, we want more ships early on
  //later set it to two
  
  //short range is good if the halite is well evened out
  //long range is good if there are deep clusters far away and no good halite nearby.
  let shipMineRange = 1;
  
  let shipNumFutureTurnsToCalc = 4;
  
  
  //global meta for how far ships should look for mining. Probably should do this on a case by case basis though.
  let mineRangeMeta = 'short';
  
  //If there's not enough in proximity
  let initialHaliteInProximity = mining.totalHaliteInRadius(gameMap, me.shipyard.position, 3);
  if (initialHaliteInProximity <= 1000) {
    logging.info(`LONG RANGE MINING`)
    mineRangeMeta = 'long';
  }
  else {
    logging.info(`SHORT RANGE MINING`)
    mineRangeMeta = 'short';
  }
  logging.info(`Map Size: ${mapSize}`);
  if (mapSize > 2500) {
    maxDropoffs = 3;
  }
  else if (mapSize > 1600) {
    maxDropoffs = 2;
  }
  while (true) {
    let start = new Date().getTime();
    let shipCommands = {};
    let shipDirections = {};
    let shipDesiredPositions = {};
    
    
    
    await game.updateFrame();

    
   
    const commandQueue = [];

    //DETERMINE STRATEGIES:
    //let ext = mining.extractPercent;
    //logging.info(`Extract Percent: ${ext}`);
    if (game.turnNumber >= 0.93 * hlt.constants.MAX_TURNS) {
       meta = 'final';
    }
    
    //Long range mining if the clusters are sparse
    if (game.turnNumber <= 0.3 * hlt.constants.MAX_TURNS) {
      if (mineRangeMeta === 'short'){
        shipMineRange = 1;
        shipNumFutureTurnsToCalc = 4;
      }
      else if (mineRangeMeta === 'long'){
        shipMineRange = 3;
        shipNumFutureTurnsToCalc = 8; //shoudl equal range*2 + 2
      }

    }
    else {
      shipMineRange = 2;
      shipNumFutureTurnsToCalc = 6;
    }
    
    //tempId is assigned to about to be made ships
    let tempId = -10;
    let localHaliteCount = me.haliteAmount;
    if ((game.turnNumber < 0.55 * hlt.constants.MAX_TURNS && numShips <= Math.sqrt(mapSize)) &&
      me.haliteAmount >= hlt.constants.SHIP_COST && !gameMap.get(me.shipyard).isOccupied ) {
      let positionsToCheck = search.circle(gameMap, me.shipyard.position, 1);
      let open = 5;
      for (let i = 0; i < positionsToCheck.length; i++) {
        if(gameMap.get(positionsToCheck[i]).isOccupied) {
          open -=1;
        }
      }
      //logging.info(`Open spots: ${open}`);
      if (open >= 2) {
        //>=2 because one spot is the spawn point, one is an exit point.
        commandQueue.push(me.shipyard.spawn());
        localHaliteCount -= 1000;
        shipDesiredPositions[tempId] = [me.shipyard.position];
        tempId -= 1;
      }
    }
    numShips = 0;
    
    //Some unit preprocession stuff
    for (const ship of me.getShips()){
      let id = ship.id;
      
      //make sure variables are defined
      if (ships[id] === undefined) {
        ships[id] = {};
        if (ships[id].targetDestination === undefined) {
          ships[id].targetDestination = null;
        }
        if (ships[id].distanceLeftToDestination === undefined) {
          ships[id].distanceLeftToDestination = 0;
        }
        ships[id].mode = 'mine';
        ships[id].targetDropoffId = -1;
      }
      
      
      //First set the desired positions of units who can't move cuz they have no halite or something
      if (movement.canMove(gameMap, ship)) {
        //If unit is currently returning, 
      }
      else {
        let directions = [Direction.Still];
        shipDirections[id] = directions;
        shipDesiredPositions[id] = [];
        for (let j = 0; j < directions.length; j++) {
          shipDesiredPositions[id].push(gameMap.normalize(ship.position.directionalOffset(directions[j])));
        }

      }
    }
    let prioritizedShips = [];
    for (const ship of me.getShips()){
      let id = ship.id
      if (ships[id].mode === 'return') {
        prioritizedShips.unshift(ship);
      }
      else {
        prioritizedShips.push(ship);
      }
    }
    //Decide on movement
    //Should be decided in order of priority
    for (const ship of prioritizedShips) {
      numShips += 1;
      let id = ship.id;

      
      
      if (ships[id].targetDestination !== null) {
        if (ships[id].targetDestination.equals(ship.position)) {
          ships[id].mode = 'none';
          ships[id].targetDestination = null;
          //logging.info(`Ship-${id} reached dest: has no mode`);
        }
      }
      
      let oldMode = ships[id].mode;
      //DETERMINE SHIP MODE:
      
      //Returning mode if there is enough halite store.
      if (ship.haliteAmount >= hlt.constants.MAX_HALITE / 1.02 || ships[id].mode === 'return') {
        ships[id].mode = 'return';
      }
      
      else if (gameMap.get(ship.position).haliteAmount < hlt.constants.MAX_HALITE / 10){
        ships[id].mode = 'mine';
      }
      
      else if (gameMap.get(ship.position).hasStructure) {
        ships[id].mode = 'leaveAnywhere'; //force unit to leave to allow others in
      }
      else if (numDropoffs < maxDropoffs && localHaliteCount >= hlt.constants.DROPOFF_COST) {
        //code needs lot of betterment
        let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
        let dist = gameMap.calculateDistance(ship.position, nearestDropoff.position);
        let distShipyard = gameMap.calculateDistance(ship.position, me.shipyard.position);
        //let dropoffPotential = 
        if (dist >= 2 * 6){
          for (let p = 0; p < idealDropOffLocs.length; p++){
            if (ship.position.equals(idealDropOffLocs[p])) {
              let haliteInRadius9 = mining.totalHaliteInRadius(gameMap, ship.position, 6); //possibly expensive
              if (haliteInRadius9 >= 18000) {
                ships[id].mode = 'buildDropoff';
                localHaliteCount -= 4000;
              }

            }
          }
          
          //ships[id].mode = 'buildDropoff';
          
        }
      }
      else {
        ships[id].mode ='mine';
      }
      
      //Determine if ship needs a new target destination
      let needsNewTarget = false;
      
      if (ships[id].mode !== oldMode || ships[id].targetDestination === null || ships[id].mode === 'none') {
        needsNewTarget = true;
      }
      
      let directions = [Direction.Still];
      
      let shipCanMove = movement.canMove(gameMap, ship);
      //If ship can't move, it will stay still and gather halite
      if (meta === 'normal'){
        if (shipCanMove) {
          switch(ships[id].mode) {
            case 'return':
              //not optimized
              if (needsNewTarget){
                let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
                ships[id].targetDestination = nearestDropoff.position;
              }
              
              //Last two arguments of below are true, false = avoid and dont attack
              directions = movement.viableDirections(gameMap, ship, ships[id].targetDestination, true, false);
              break;
              /*
            case 'search':
              if (needsNewTarget){
                let newMiningDestination = mining.findOptimalMiningPosition(gameMap, ship, shipMineRange, shipNumFutureTurnsToCalc);
                ships[id].targetDestination = newMiningDestination;
              }
              directions = movement.viableDirections(gameMap, ship, newMiningDestination);
              break;
              */
            case 'mine':
              //Every turn its trying to mine, check for most optimal mining position
              /*
              let hl = mining.totalHaliteInRadius(gameMap, ship.position, 1);
              if (hl < 100) {
                shipMineRange = 5;
                shipNumFutureTurnsToCalc = 12;
              }
              */
              let newMiningDestination = mining.findOptimalMiningPosition(gameMap, ship, shipMineRange, shipNumFutureTurnsToCalc);
              ships[id].targetDestination = newMiningDestination;
              let avoid = false;
              if (ship.haliteAmount >= 100) {
                avoid = true;
              }
              directions = movement.viableDirections(gameMap, ship, ships[id].targetDestination, avoid, attackMode);
              break;
            case 'leaveAnywhere':
              //search for any open spot to leave and go there
              directions = movement.moveAwayFromSelf(gameMap, ship);
              break;
            case 'buildDropoff':
              directions = [Direction.Still];
              break;
          }
        }
      }
      else if (meta === 'final') {
        //not optimized;
        let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
        directions = movement.finalMove(gameMap, ship, nearestDropoff);
      }
      
      
      
      if (ships[id].mode === 'buildDropoff') {
        commandQueue.push(ship.makeDropoff());
        logging.info(`Building with ship-${id}`)
        numDropoffs += 1;
        delete shipDirections[id];
        delete shipDesiredPositions[id];

      }
      else if(shipCanMove){
        //Send out desired directions of movement by preference. If one direction doesn't work, do the next.

        //Go through all past desired positions and check for conflicts. We assume that all previous selected desiredpositions arrays, the first element in there is the choice that is clean and avoids collision. Remove collision ones by shifting array
        //check ships within area, not implemented YET

        shipDirections[id] = directions;
        shipDesiredPositions[id] = [];

        //Store the desired positions
        for (let j = 0; j < directions.length; j++) {
          shipDesiredPositions[id].push(gameMap.normalize(ship.position.directionalOffset(directions[j])));
        }

        //logging.info(`Desired Positions: ${shipDesiredPositions}`);
        //WE ALSO ASSUME THAT THERES ALWAYS A DIRECTION THAT WONT RESULT IN COLLISION
        let k = 0;
        let allowConflicts = false;
        if (meta === 'final') {
          let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
          let dist = gameMap.calculateDistance(ship.position, nearestDropoff.position);
          if (dist <= 1) {
            //allow conflicts
            allowConflicts = true;
          }
        }
        if (shipDesiredPositions[id].length >= 1 && allowConflicts === false){
          for (k = 0; k < shipDesiredPositions[id].length; k++) {
            let checkPos = shipDesiredPositions[id][k];
            //logging.info(`Checking Desired Position: ${checkPos}`);
            let existConflict = false;
            for (otherId in shipDesiredPositions) {
              if (otherId != id) {
                if (shipDesiredPositions[otherId][0].equals(checkPos)){
                  //There is a conflict, stop and go to next desired position
                  //If there is a conflict, and this ship with id=id has only one desired position (possibly due to being unable to move anywhere else because not enough halite), then resolve otherId
                  //logging.info(`Ship-ID: ${id} conflict with ${otherId} at ${shipDesiredPositions[otherId][0]} `);
                  existConflict = true;
                  break;
                }
              }
            }
            if (existConflict === false) {
              break;
            }
          }
          shipDesiredPositions[id] = shipDesiredPositions[id].slice(k , shipDesiredPositions[id].length);
          shipDirections[id] = shipDirections[id].slice(k, shipDirections[id].length);

          //force a direction if no direction left or if there is no halite below and only direction so far is still
          if (shipDesiredPositions[id].length === 0 || (shipDesiredPositions[id].length === 1 && gameMap.get(ship.position).haliteAmount === 0 && shipDesiredPositions[id][0].equals(Direction.Still))) {
            directions = movement.moveAwayFromSelf(gameMap, ship);
            shipDirections[id] = directions;
            for (let j = 0; j < directions.length; j++) {
              shipDesiredPositions[id].push(gameMap.normalize(ship.position.directionalOffset(directions[j])));
            }
            logging.info(`Ship-${id} PANIC: JUMPING ${shipDesiredPositions[id]}`);
          }
        }

        /*
        for (let j = 0; j < directions.length; j++) {
          shipDesiredPositions[id].push(ship.position.directionalOffset(directions[j]));
        }
        */
        //logging.info(`Ship-${id} Desired Positions: ${shipDesiredPositions[id]}`);

      }
    }
    
    
    //Process commands of ships and look for collisions
    //If there are multiple ships wanting to go to one place, randomly choose one ship to go to that position, the other ship must then 
    
    
    //Push all the commands
    for (const ship of me.getShips()) {
      let id = ship.id;
      //logging.info (`New Command: ${shipCommands[id]}`);
      if (shipDirections[id] !== undefined){
        commandQueue.push(ship.move(shipDirections[id][0]));
      }
    }
    
    
    await game.endTurn(commandQueue);
    let end = new Date().getTime();
    let time = end - start;
    logging.info(`Turn took: ${time} ms`);
  }
});