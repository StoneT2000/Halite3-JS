module.exports = {
    run(gameMap, me, ships, id) {
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
          //logging.info(``)
          //Allow unsafe move if one away from dropoff
          //Final movements, allow synchronous moving
          //Essentially, if you try to move to a occupied square but that turtle is going to move away, u can move there
          
          
          if (canMove(gameMap, ship)){
            if (ships[id].distanceLeftToDestination === 1) {
              const finalDirections = gameMap.getUnsafeMoves(ship.position, ships[id].targetDestination);
              commandQueue.push(ship.move(finalDirections[0]));
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
                gameMap.get(ship.position).ship = null;
              }


              ships[id].distanceLeftToDestination -= 1;
            }
          }
        }
    }
};
