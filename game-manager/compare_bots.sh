#!/bin/sh
DIR="${0%/*}"
echo $DIR
path1=""
path2=""
path3=""
path4=""
players=2
while [[ "$1" =~ ^- && ! "$1" == "--" ]]; do case $1 in
  -g | --games )
    shift; games=$1
    ;;
  -p1 | --path1 )
    shift; path1=$1
    ;;
  -p2 | --path2 )
  shift; path2=$1
  ;;
  -p3 | --path3 )
  shift; path3=$1
  ;;
  -p4 | --path4 )
  shift; path4=$1
  ;;
  -dp | --doublePlay )
  shift; doublePlay=$1
  ;;
  -h | --help )
  printf "$0"
  printf "\n"
  printf "\t -g, --games \n \t%2s Number of games to be played \n"
  printf "\t -p1, --path1 \n \t%2s Path to first bot \n"
  printf "\t -p2, --path2 \n \t%2s Path to second bot \n"
  printf "\t -p3, --path3 \n \t%2s Path to third bot \n"
  printf "\t -p4, --path4 \n \t%2s Path to fourth bot \n"
  printf "\n"
  exit
  ;;
  *)
  printf "$0 \n USAGE: \n \t [-g | --games]... [-p1 | --path1]... [-p2 | --path2]... [-p3 | --path3]... [-p4 | --path4] \n \t Type -h or --help for help \n"
  exit
  ;;
  -ms | --map-size )
    shift;  fixedMapSize=$1
    fixedMap=1
    ;;
esac; shift; done
if [[ "$1" == '--' ]]; then shift; fi
if [ -z "$path1" ]; then 
  echo "No bot path given"
  exit
fi
if [ -z "$path2" ]; then 
  echo "No 2nd bot path given"
  exit
fi
if ( [ -z "$path3" ] && [ -n "$path4" ] ) || ( [ -n "$path3" ] && [ -z "$path4" ] ); then 
  echo "No 3rd or 4th bot path given"
  exit
fi
if [ -n "$path3" ]; then
  players=4
fi

averageGameTime=2000

echo "Comparing Bots for ${games} games"
echo 'data = [' > $DIR/tempoutput.json
echo 'data = [' > $DIR/tempoutput2.json
MapSize=('64' '32' '40' '48' '56')
GameNumber=0
Seed=1546875654
for i in $( seq 1 $games ); do
    GameNumber=$(( GameNumber + 1 ))
    Seed=$(( Seed + 11 ))
    : '
    if [$fixedMap -ne 1]; then
      ThisMapSize=${MapSize[$((RANDOM%=4))]}
    elif [$fixedMap -eq 1]; then
      ThisMapSize=$fixedMapSize
    fi
    '
    ThisMapSize=${MapSize[$(( $GameNumber %5 ))]}
    
    if [ $players -eq 2 ]; then
      echo "Beginning game $GameNumber of $games with map size $ThisMapSize x $ThisMapSize, seed: $Seed, and $players players"
      ./halite --replay-directory replays/ --width $ThisMapSize --height $ThisMapSize -s $Seed "node ${path1}" "node ${path2}" --results-as-json --no-logs >> $DIR/tempoutput.json
    fi
    

    
    if [ $players -eq 4 ]; then
      echo "Beginning game $GameNumber of $games with map size $ThisMapSize x $ThisMapSize, seed: $Seed, and $players players"
      ./halite --replay-directory replays/ --width $ThisMapSize --height $ThisMapSize -s $Seed "node ${path1}" "node ${path2}" "node ${path3}" "node ${path4}" --results-as-json --no-logs >> $DIR/tempoutput.json
    fi
    
    echo ',' >> $DIR/tempoutput.json
    cat $DIR/tempoutput.json > $DIR/output.json
    echo ']' >> $DIR/output.json
    
    if [ $doublePlay -eq 1 ]; then
      echo "Beginning game $GameNumber (2nd rnd) of $games with map size $ThisMapSize x $ThisMapSize, seed: $Seed, and $players players"
      ./halite --replay-directory replays/ --width $ThisMapSize --height $ThisMapSize -s $Seed "node ${path2}" "node ${path1}" --results-as-json --no-logs >> $DIR/tempoutput2.json
      
      echo ',' >> $DIR/tempoutput2.json
      cat $DIR/tempoutput2.json > $DIR/output2.json
      echo ']' >> $DIR/output2.json
    fi
    
done
echo ']' >> $DIR/tempoutput.json
echo ']' >> $DIR/tempoutput2.json
cat $DIR/tempoutput.json > $DIR/output.json
cat $DIR/tempoutput2.json > $DIR/output2.json
rm $DIR/tempoutput.json
rm $DIR/tempoutput2.json