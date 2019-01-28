# Halite 3 Bot

This is my bot I submitted for Halite 3 hosted by Two Sigma. I ranked about #63 globally, and about #4 out of highschool students

I wrote this in JavaScript (Oops!).

Obviously JavaScript has a lot of limitations, no memory management (dynamic arrays are kind of slow), but to be fair for this tournament, runtime was never an issue for my bot. On my MacBook air, my bot consistently took up less than 100ms of runtime per turn.

I primarily chose to use JS to write my bot because by leaving out all the specifics regarding memory management, types etc., I could easily implement new models and strategies.

I will discuss the specifics of my code in this README file, and a general overview + reflections about Halite 3 and my bot (a postmortem) will be released soon on my github page.

The bot submitted for finals is the directory bots_archive/ST-Bot-Jan-8v1

## General Structure
There are several key parts to my bot:
- 
- Mining Optimization (and using inspiration)
- Building Dropoffs
- Movement and Collision Management
- Other Strategies

Generally the bot works as follows in the main while loop:
We calculate some key values such as numer of ships, halite density and amount of halite left.
We also determine the best/optimal dropoff locations left
Specifically, each ship has a status and a target destination. The status determines how it behaves and the target destination (should be) the final place the ship moves towards


### Mining Optimization

My code for this is probably the fatal flaw in my bot and its inability to beat other bots in high mining efficiency, even those ranked below it. I'm not proud of it, but the heuristic I used for determining the best mining spot the ship should go towards is the following

For each tile within a manhattan radius of 20, calculate a ratio A where A = halite at that tile / ((distance to that tile  + 1.5) * halite at tile ship is on)

The tile with the highest ratio is set as the target destination for the ship to move towards and mine at. Remarkably, attempting to program a theoretically better mining code made my bot worse and I'm not sure why. Theoretically, a function that takes distance, cost to move to the position, and effectively calculates the rate at which halite will be gained if the bot tries to move to that tile, just did not work with my bot.

### Movement and Collision Management
This was crucial and was what made my initial bot jump from a rank of around 600 to top 300.

The navigation function provided by the starter kits work, but are too simple and are not efficient enough as it does not allow ships to move to spaces that other ships previously occupied but no longer occupy.

Generally, each ship based on a collection of code for other parts of the bot (mining, building dropoffs, and some other micro management strategies), will determine it's most favorable direction to move towards. Using these directions, the bot stores the most desired position of the ship. When looping through the next ship in the bot's array of ships, that ship will also have its own desired directions and positions, but it will first check with all the previous ships' desired positions and if there are conflicts, this ship will not move in that direction.
