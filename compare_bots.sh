#!/bin/sh


while [[ "$1" =~ ^- && ! "$1" == "--" ]]; do case $1 in
  -V | --version )
    echo $version
    exit
    ;;
  -g | --games )
    shift; games=$1
    ;;
  -ms | --map-size )
    shift;  fixedMapSize=$1
    fixedMap=1
esac; shift; done
if [[ "$1" == '--' ]]; then shift; fi

echo $games

echo 'Comparing Bots'

echo 'data = [' > output.json
MapSize=('32' '40' '48' '56' '64')
for i in $( seq 1 $games ); do
    : '
    if [$fixedMap -ne 1]; then
      ThisMapSize=${MapSize[$((RANDOM%=4))]}
    elif [$fixedMap -eq 1]; then
      ThisMapSize=$fixedMapSize
    fi
    '
    ThisMapSize=${MapSize[$((RANDOM%=4))]}
    echo "Beginning game with map size $ThisMapSize"
    ./halite --replay-directory replays/ --width $ThisMapSize --height $ThisMapSize "node ./bots_archive/currentBot/MyBot.js" "node ./bots_archive/currentBotTest/MyBot.js" --results-as-json --no-logs >> output.json
    echo ',' >> output.json
done
echo ']' >> output.json
