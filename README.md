# Halite 3 Bot

This is my bot I submitted for <a href='https://halite.io'>Halite 3</a> hosted by Two Sigma. I ranked about <a href='https://halite.io/user/?user_id=8011'>#63 globally</a>, and about <a href='https://halite.io/programming-competition-leaderboard?level=High%20School'>#4 out of highschool students</a>

I wrote this in JavaScript (Oops!).

Obviously JavaScript has a lot of limitations, no memory management (dynamic arrays are kind of slow), but to be fair for this tournament, runtime was never an issue for my bot. On my MacBook air, my bot consistently took up less than 100ms of runtime per turn.

I primarily chose to use JS to write my bot because by leaving out all the specifics regarding memory management, types etc., I could easily implement new models and strategies.

I will discuss the specifics of my code in this README file, and a general overview + reflections about Halite 3 and my bot (a postmortem) will be released soon on my github page.

The bot submitted for finals is the directory bots_archive/ST-Bot-Jan-8v1

## General Structure
There are several key parts to my bot:
- General Structure of the Main File MyBot.js and Other Files
- Ship Organization and Coordination
- Mining Optimization (and using inspiration)
- Movement and Collision Management
- Building Dropoffs
- Other Strategies
- A Cheap Way to Avoid Using an BFS Algorithm

Generally the bot works as follows in the main while loop:
We calculate some key values such as numer of ships, halite density and amount of halite left.
We also determine the best/optimal dropoff locations left and determine whether we should build a ship or save up halite for a dropoff etc.

Specifically, each ship has a status and a target destination. The status determines how it behaves and the target destination (should be) the final place the ship moves towards. This got pretty messy as I introduced a bunch of quick fixes but generally the statuses ships can 
have are ```'return', 'mine', 'leaveAnywhere', 'buildDropoff', 'final', 'goingToBuildDropoff', 'blockDropoff'```

Depending on statuses and contextual situations (e.g ships that don't have enough halite to move), each ship is then given priority in deciding where to move, e.g a ship that is stuck because it doesn't have enough halite to move, will be given priority on deciding where to move.

At the very end of the while loop, we push all the relevant commands to let the bot do its magic and play.

The other key files are ```movement.js```, ```search.js```, and ```mining.js```. They do exactly what you think they do, handle movement decisions, handle all searching code e.g finding ships nearby or nearest dropoff, and the mining decision code.

### Ship Organization and Coordination

Each ship has a status and a target destination. The statuses are ```'return', 'mine', 'leaveAnywhere', 'buildDropoff', 'final', 'goingToBuildDropoff', 'blockDropoff'```
- ```return``` means the ship is returning to deliver halite
- ```mine``` means the ship is out to go and mine
- ```leaveAnywhere``` is a status telling the ship to leave ASAP, usually because it is hogging a key position such as a friendly dropoff
- ```buildDropoff``` is a status meaning the ship is going to stay still and attempt to build a dropoff when possible
- ```final``` is a status telling the ship to run its end game code, essentially returning all ships to dropoffs and shipyards as late as possible and storing all our mined halite.
- ```goingToBuildDropoff``` is a status telling the ship to move to a designated (optimal) location for building a dropoff
- ```blockDropoff``` is a status telling the ship to block the enemy dropoff to force them to collide into this ship and drop halite in the end game

Each ship is looped through and each ship makes a decision on its most desired directions or adjacent positions to move to.
This leads to the problem of prioritization. Which ship takes priority in choosing a desired direction, which then other ships cannot take or else they will collide?

Generally, I prioritized the ships as follows:
 - Ships that can't move due to lack of halite
 - Ships that are on our own shipyard or dropoff
 - Ships that are trying to build a dropoff
 - Ships that are going to a dropoff location
 - Ships that are performing their final return to the shipyard or dropoff location in the endgame
 - Ships that are just returning to deliver their halite
 - Ships that are near enemy dropoffs and trying to block them
 - All other ships
This prioritization in my opinion not only ensures unwanted friendly collisions will essentially never happen (along with the collision management code), but also improves the bot efficiency as these priorities essentially follow the importance of each role.

### Mining Optimization

My code for this is probably the most fatal flaw in my bot and its inability to beat other bots in high mining efficiency, even those ranked below it. I'm not proud of it, but the heuristic I used for determining the best mining spot the ship should go towards is the following

For each tile within a manhattan radius of 20, calculate a ratio ```A``` where 

```A = halite at that tile / ((distance to that tile  + 1.5) * halite at tile ship is on)```

The ```halite at that tile``` is then subtracted by the cost to go that position by moving to discourage bots from moving too far away and losing all their halite along the way.

If there is inspiration on that tile, we multiply the halite at that tile by 3 in accordance to the inspiration mechanic. I only checked and put inspiration as a factor when searching for mining locations if the manhattan distance to the location is ≤ 1. This probably could have been improved but I was afraid any farther would cause my bot to end up chasing the enemy a lot more often than mining.

The tile with the highest ratio is set as the target destination for the ship to move towards and mine at. Remarkably, attempting to program a theoretically better mining code made my bot worse and I'm not sure why. 

Theoretically, a function that takes distance, cost to move to the position, and effectively calculates the rate at which halite will be gained if the bot tries to move to that tile, just did not work with my bot. You can see me attempting this method in the file mining2.js in my final bot which was ultimately unused.

Simple, and somewhat effective... but still mediocre and not trying to find the root cause of why the theoretically better method didn't work with my bot will be one of largest regrets for this competition.

### Movement and Collision Management
This was crucial and was what made my initial bot jump from a rank of around 600 to top 300.

The navigation function provided by the starter kits work, but are too simple and are not efficient enough as it does not allow ships to move to spaces that other ships previously occupied but no longer occupy.

Generally, each ship based on a collection of code for other parts of the bot (mining, building dropoffs, and some other micro management strategies), will determine it's most favorable direction to move towards. Using these directions, the bot stores the most desired adjacent positions of the ship. When looping through the next ship in the bot's array of ships, that ship will also have its own desired directions and positions, but it will first check with all the previous ships' desired positions and if there are conflicts, this ship will not move in that direction and will then check the next desired direction for conflicts.

We keep checking all desired directions for conflicts and if there is no path available for the ship, then we allow the ship to take its most desired direction, find who is conflicting with the ship, and check if there is another available direction for the conflicting ship to take. This was more than enough of a check to avoid collisions 99.99% of the time (theoretically we might still self-collide sometimes)

Additionally, the ships also attempt to collide with the enemy given that the enemy has at least 1.5 times the amount of halite our ship has and there are at least 2 friendly ships nearby to pickup the remains. It will keep trying to move to positions adjacent to the enemy.

### Building Dropoffs

I used a very simple heuristic for deciding where to build dropoffs. If there is at least 18000 halite within a 6 unit manhattan distance radius, the location is a viable dropoff build spot. Depending on the number of ships, we allow a dropoff to be built and the dropoff will be built on the location with the most halite that is within some distance of a nearby ship. The building ship is then given the status ```goingToBuildDropoff``` and in addition, it will bring nearby ships to that dropoff location to help control that rich halite location and mine more.

### Other Strategies

At the end of the game, all of our ships return to the shipyard or dropoff and self-collisions are allowed at this point as it will allow our ships to drop halite faster. 

In addition, ships also try to block enemy dropoffs and we search for the enemy dropoff with the most ships nearby to go ahead and block. There is a ton of micro managing for blocking enemy dropoffs, but it essentially boils down to the following.
- Position our ship in front of the direction of the enemy dropoff where there are the most ships in that direction.
- Never allow our ship to be over the enemy dropoff (or else if it collides, the enemy gets all the halite anyway) if there are enemies really close. This also means for a ship to be repositions on another side of the enemy dropoff, it will have to travel around the enemy dropoff.
- Try to cover all directions and keep shifting around (seems to confuse a lot of enemy bots if we keep moving)

### A Cheap Way to Avoid Using an BFS Algorithm

Luckily, the Halite 3 game is on a square-tile based map with no obstacles (other than enemy ships). This means no pathing algorithms are needed (yay!) and really a BFS (Breadth First Search) algorithm is all you really need if you want a fast way to find things that are near something (which my bot constantly does in order to quickly mine halite and quickly go to the nearest dropoff etc.)

But really, you don't need a BFS algorithm. Thanks to the fact that units can only move to adjacent tiles and that there are 0 obstacles, I stored a lookup table into ```search.js``` called ```manhattanDeltas```. ```manhattanDeltas[r]``` where ```r``` is the manhattan radius away from a position, returns a sorted array of relative positions within the radius ```r``` that would be normally returned by a BFS algorithm. Using a lookup table is much faster and reduces runtime.

_____

I probably left out some details about my bot because since around Jan. 12, I shifted focus completely to another excellent AI competition, <a href="http://battlecode.org/">MIT Battlecode</a>

In conclusion, the code of my bot is basically
```If If If If If``` (insert a ton of for loops and more if statements) ```else if else if //comment #192312841231``` and some random quick hacky bug fixes that I never solidified (but worked I guess)
