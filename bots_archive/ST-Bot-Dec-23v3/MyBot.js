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
  await game.ready('Current Bot: SM-Bot3 Dec-18');

  logging.info(`My Player ID is ${game.myId}.`);
  
  const {gameMap, me} = game;
  
  let mapSize = gameMap.width * gameMap.height;
  let numShips = 0;
  let numDropoffs = 1;
  let maxDropoffs = 1;
  let averageHalite = 0;
  let idealDropOffLocs = [];

  let numPlayers = 0;
  for (let key of game.players){
    numPlayers += 1;
  }
  logging.info(`There are ${numPlayers} players`);

  for (let i = 0; i < gameMap.width; i++) {
    for (let j = 0; j < gameMap.height; j++) {
      averageHalite += gameMap.get(new Position(i,j)).haliteAmount;
    }
  }
  averageHalite = averageHalite / mapSize;
  logging.info(`Average Halite: ${averageHalite}`);
  for (let i = 0; i < gameMap.width; i++) {
    for (let j = 0; j < gameMap.height; j++) {
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
  
  //minimum halite around a dropoff point before we allow dropoffs to be made
  let minHaliteAroundDropoff = 18000;
  
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
  /*
  if (mapSize > 2500) {
    maxDropoffs = 3;
  }
  else if (mapSize > 1600) {
    maxDropoffs = 2;
  }
  */
  while (true) {
    
    let start = new Date().getTime();
    let shipCommands = {};
    let shipDirections = {};
    let shipDesiredPositions = {};
    
    
    
    await game.updateFrame();

    
   
    const commandQueue = [];

    
    //Calculate number of good drop off locations to put a limit on the maximum number of dropoffs so this way, the AI won't try to stack up halite to prepare to build for a dropoff that will never be built
    let possibleDropoffLocations = [];
    for (let i = 0; i < gameMap.width; i++) {
      for (let j = 0; j < gameMap.height; j++) {
        let gameMapPosition = (new Position(i,j));
        let nearestDropoffToHere = search.findNearestDropoff(gameMap, me, gameMapPosition);
        let distanceToNearestDropoff = gameMap.calculateDistance(gameMapPosition, nearestDropoffToHere.position);
        if (distanceToNearestDropoff >= 2 * 6){
          let haliteInRadiusOfThisTile = mining.totalHaliteInRadius(gameMap, gameMapPosition, 6);

          if (haliteInRadiusOfThisTile >= minHaliteAroundDropoff) {
            let shipsInRadius = search.numShipsInRadius(gameMap, me.shipyard.owner, gameMapPosition, 6);
            if (shipsInRadius.friendly >= 1) {
              possibleDropoffLocations.push(gameMapPosition);
            }
          }
        }
      }
    }
    logging.info(`${possibleDropoffLocations.length} possible dropoff locations: ${possibleDropoffLocations}`)
    
    
    
    
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
    let buildShip = false;
    if ((game.turnNumber < 0.65 * hlt.constants.MAX_TURNS && numShips <= Math.sqrt(mapSize)) &&
      me.haliteAmount >= hlt.constants.SHIP_COST) {
      if (numDropoffs < maxDropoffs) {
        //this shouldnt be >= drop off cost, could be less due to existing halite in cargo and ground
        if (me.haliteAmount >= hlt.constants.DROPOFF_COST - 500) {
          buildShip = true;
        }
      }
      else {
        buildShip = true;
      }
      if (buildShip === true) {
        let positionsToCheck = search.circle(gameMap, me.shipyard.position, 1);
        commandQueue.push(me.shipyard.spawn());
        localHaliteCount -= 1000;
        shipDesiredPositions[tempId] = [me.shipyard.position];
        tempId -= 1; 
      }
    }
    numShips = 0;
    
    let shipsThatCantMove = []; //array of ships that don't have enough halite to move
    let shipsThatAreReturning = []; //array of ships that are on return mode
    let shipsThatArePerformingFinalReturn = []; //array of ships on the final mode
    let otherShips = []; //all other ships
    let prioritizedShips = []; //the prioritized array of ships in which movements and decisions should be made
    
    //Some unit preprocession stuff
    for (const ship of me.getShips()){
      let id = ship.id;
      numShips += 1;
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
      if (!movement.canMove(gameMap, ship)) {
        //If unit is cant move
        shipsThatCantMove.push(ship);
        
        let directions = [Direction.Still];
        shipDirections[id] = directions;
        shipDesiredPositions[id] = [];
        shipDesiredPositions[id].push(ship.position);
      }
      else if (ships[id].mode === 'return') {
        shipsThatAreReturning.push(ship);
      }
      else if (ships[id].mode === 'final') {
        shipsThatArePerformingFinalReturn.push(ship);
      }
      else {
        otherShips.push(ship);
      }
    }
    
    //Build the prioritized ships array
    for (let i = 0; i < shipsThatCantMove.length; i++) {
      prioritizedShips.push(shipsThatCantMove[i]);
    }
    for (let i = 0; i < shipsThatArePerformingFinalReturn.length; i++) {
      prioritizedShips.push(shipsThatArePerformingFinalReturn[i]);
    }
    for (let i = 0; i < shipsThatAreReturning.length; i++) {
      prioritizedShips.push(shipsThatAreReturning[i]);
    }
    for (let i = 0; i < otherShips.length; i++) {
      prioritizedShips.push(otherShips[i]);
    }
    logging.info(`Max Dropoffs: ${maxDropoffs}; Current dropoffs: ${numDropoffs}; Numships: ${numShips}`)
    //Decide on max number of dropoffs to build given the current ship count
    if (numShips <= 15) {
      maxDropoffs = 1;
    }
    else if (numShips <= 30) {
      maxDropoffs = 2;
    }
    else if (numShips <= 45) {
      maxDropoffs = 3;
    }
    else if (numShips <= 60) {
      maxDropoffs = 4;
    }
    maxDropoffs = Math.min(maxDropoffs, possibleDropoffLocations.length);
    
    //Decide on movement and strategy in order of the priorities
    for (const ship of prioritizedShips) {
      
      let id = ship.id;
      
      //If ship was given a target destination and it has reached it, set its mode to none to force the ship to rethink its current strategy.
      if (ships[id].targetDestination !== null) {
        if (ships[id].targetDestination.equals(ship.position)) {
          ships[id].mode = 'none';
          ships[id].targetDestination = null;
        }
      }
      
      let oldMode = ships[id].mode;
      ships[id].mode = 'none';
      //DETERMINE SHIP MODE:
      
      //Returning mode if there is enough halite in cargo or ship was already trying to return.
      if (ship.haliteAmount >= hlt.constants.MAX_HALITE / 1.02 || oldMode === 'return') {
        ships[id].mode = 'return';
      }
      else if (oldMode === 'final') {
        ships[id].mode === 'final'; //This locks the final mode in place
      }
      /*
      else if (gameMap.get(ship.position).haliteAmount < hlt.constants.MAX_HALITE / 10){
        ships[id].mode = 'mine';
      }
      */
      else if (gameMap.get(ship.position).hasStructure) {
        ships[id].mode = 'mine'; //force unit to leave to allow others in
      }
      else if (numDropoffs < maxDropoffs && game.turnNumber <= 0.85 * hlt.constants.MAX_TURNS) {
        let haliteAvailable = localHaliteCount + ship.haliteAmount + gameMap.get(ship.position).haliteAmount;
        if (haliteAvailable >= hlt.constants.DROPOFF_COST){
          //code needs lot of betterment
          //Building dropoffs code
          let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
          let dist = gameMap.calculateDistance(ship.position, nearestDropoff.position);
          let distShipyard = gameMap.calculateDistance(ship.position, me.shipyard.position);
          //let dropoffPotential = 
          if (dist >= 2 * 6){
            let haliteInRadius9 = mining.totalHaliteInRadius(gameMap, ship.position, 6); //possibly expensive
            if (haliteInRadius9 >= minHaliteAroundDropoff) {
              ships[id].mode = 'buildDropoff';
              localHaliteCount -= (hlt.constants.DROPOFF_COST - ship.haliteAmount - gameMap.get(ship.position).haliteAmount);
            }
            /*
            for (let p = 0; p < idealDropOffLocs.length; p++){
              if (ship.position.equals(idealDropOffLocs[p])) {
                

              }
            }
            */
          }
        }
      }
      else {
        ships[id].mode = 'mine';
      }
      if (ships[id].mode === 'none') {
        ships[id].mode = 'mine';
      }
      
      //Determine if ship needs a new target destination
      let needsNewTarget = false;
      
      if (ships[id].mode !== oldMode || ships[id].targetDestination === null || ships[id].mode === 'none') {
        needsNewTarget = true;
      }
      
      let directions = [Direction.Still];
      
      let shipCanMove = movement.canMove(gameMap, ship);
      //If ship can't move, it will stay still and gather halite
      if (true){
        if (shipCanMove) {
          switch(ships[id].mode) {
            case 'return':
              //not optimized
              let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
              ships[id].targetDestination = nearestDropoff.position;
              //Last two arguments of below are true, false = avoid and dont attack
              let distanceToNearestDropoffWhenReturning = gameMap.calculateDistance(ship.position, nearestDropoff.position);
              let avoidEnemy = true;
              if (distanceToNearestDropoffWhenReturning <= 1){
                avoidEnemy = false;
              }
              directions = movement.viableDirections(gameMap, ship, ships[id].targetDestination, avoidEnemy);
              break;
            case 'mine':
              let newMiningDestination = mining.findOptimalMiningPosition(gameMap, ship, shipMineRange, shipNumFutureTurnsToCalc);
              ships[id].targetDestination = newMiningDestination;
              
              let avoid = true;
              let possibleEnemyPositions = search.circle(gameMap, ship.position, 2);
              for (let i = 0; i < possibleEnemyPositions.length; i++) {
                let possibleEnemyTile = gameMap.get(possibleEnemyPositions[i]);
                let oship = possibleEnemyTile.ship;
                
                //IMPROVEMENT: Doesn't check for which ship is best to collide into if there are several ones worth attacking
                if (oship !== null && oship.owner !== ship.owner) {
                  if (movement.worthAttacking(gameMap, ship, oship)) {
                    ships[id].targetDestination = oship.position;
                    avoid = false;
                    break;
                  }
                }
              }
              
              
              directions = movement.viableDirections(gameMap, ship, ships[id].targetDestination, avoid);
              
              //add code for determining who to attack here
              break;
            case 'leaveAnywhere':
              //search for any open spot to leave and go there
              directions = movement.moveAwayFromSelf(gameMap, ship);
              break;
            case 'buildDropoff':
              directions = [Direction.Still];
              break;
            case 'final':
              let finalNearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
              //IMPROVEMENT: REDUNDANT CODE HERE WITH OTHER ONE DETERMINING DIRECTION
              let dist = gameMap.calculateDistance(ship.position, finalNearestDropoff.position);
              let avoidCollisons = true;
              if (dist <= 1) {
                avoidCollisons = false;
              }
              directions = movement.finalMove(gameMap, ship, finalNearestDropoff, avoidCollisons);
              break;
          }
        }
      }

      //If nearing end of game, prepare to perform calculations for final return to dropoff. Do this once, once its on its final return, let it destroy itself ontop of the dropoff instead of doing more mining if it comes back too early.
      if (meta === 'final' && ships[id].mode !== 'final') {
        
        let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
        /*
        let turnsLeft = hlt.constants.MAX_TURNS - game.turnNumber;
        turnsLeft -= 10; //10 turn padding, might want to increase this due to possible collisions and inefficiency;
        let distToDropoff = gameMap.calculateDistance(ship.position, nearestDropoff.position);
        */
        ships[id].mode = 'final';
        ships[id].targetDestination = nearestDropoff.position;
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
        //logging.info(`Ship-${ship.id} at ${ship.position} direction order: ${directions}`);
        //Store the desired positions
        for (let j = 0; j < directions.length; j++) {
          shipDesiredPositions[id].push(gameMap.normalize(ship.position.directionalOffset(directions[j])));
        }

        //logging.info(`Desired Positions: ${shipDesiredPositions}`);
        //WE ALSO ASSUME THAT THERES ALWAYS A DIRECTION THAT WONT RESULT IN COLLISION
        
        let allowConflicts = false;
        if (meta === 'final') {
          let nearestDropoff = search.findNearestDropoff(gameMap, me, ship.position);
          let dist = gameMap.calculateDistance(ship.position, nearestDropoff.position);
          if (dist <= 1 && ships[id].mode === 'final') {
            //allow conflicts/collisions
            allowConflicts = true;
          }
        }
        //If the ship has desired positions and we don't allow it to collide with any other ship...
        if (shipDesiredPositions[id].length >= 1 && allowConflicts === false){
          
          //Run through each of the ships desired positions until we find one of which there doesn't exist a conflict. Stop the loop if we find a viable position.
          let k = 0;
          let nonConflictDesiredPositions = [];
          let nonConflictDirections = [];
          for (k = 0; k < shipDesiredPositions[id].length; k++) {
            let checkPos = shipDesiredPositions[id][k];
            //logging.info(`Checking Desired Position: ${checkPos}`);
            let existConflict = false;
            for (otherId in shipDesiredPositions) {
              if (otherId != id) {
                if (shipDesiredPositions[otherId][0].equals(checkPos)){
                  //If there are two ships trying to go to the same place, we assume that the previous ships first desired position (which has already been checked for conflicts) is their desired and priortized one. So this ship will change its direction and desired position
                  existConflict = true;
                  break;
                }
              }
            }
            if (existConflict === false) {
              //All directions and positions without conflict get pushed here.
              nonConflictDirections.push(shipDirections[id][k]);
              nonConflictDesiredPositions.push(shipDesiredPositions[id][k]);
            }
          }
          //Set all possible non conflicting directions and positions
          shipDesiredPositions[id] = nonConflictDesiredPositions
          shipDirections[id] = nonConflictDirections

          //If after checking for conflicts, there are no desired positions we can't do anything as the function movement.viableDirections returns all cardinal directions

          //force a direction if no direction left or if there is no halite below and only direction so far is still
          if (shipDesiredPositions[id].length === 0) {
            logging.info(`Ship-${id} PANIC: NO AVAILABLE PLACES TO GO from ${ship.position}`);
            shipDirections[id] = [Direction.Still];
            shipDesiredPositions[id] = [ship.position];
          }
          
        }
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