#!/bin/sh

./halite --replay-directory replays/ -vvv --width 64 --height 64 --seed 1545146734 "node ./bots_archive/currentBot/MyBot.js" "node ./bots_archive/currentBotTest/MyBot.js" --results-as-json
