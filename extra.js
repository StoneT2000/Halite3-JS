//LAter: Move in terms of the lines maybe
              moves = gameMap.getUnsafeMoves(ship.position, ships[id].targetDestination);
              let leastNumOfShipsAround = 100;
              let idealMove = null;
              if (moves.length === 0) {
                
              }
              for (let i = 0; i < moves.length; i++) {
                //let potentialDir = moves[i];
                let newPos = ship.position.directionalOffset(moves[i]);
                let newTile = gameMap.get(newPos);
                let numOfShipsAroundThere = 0;
                if (!newTile.isOccupied) {
                  //we check around the potential direction for the least number of ships
                  let checkPositions = circle(gameMap, newPos, 1);
                  for (let j = 0; j < checkPositions.length; j++) {
                    let checkTile = gameMap.get(checkPositions[j]);
                    if (checkTile.isOccupied) {
                      numOfShipsAroundThere +=1;
                    }
                  }
                  if (numOfShipsAroundThere < leastNumOfShipsAround) {
                    leastNumOfShipsAround = numOfShipsAroundThere;
                    idealMove = moves[i];
                  }
                }
                
              }
              //move1 = ship.position.directionalOffset(moves[0]);
              if (idealMove !== null) {
                safeMove = idealMove;
              }
              let targetPos = ship.position.directionalOffset(safeMove);
              gameMap.get(targetPos).markUnsafe(ship);