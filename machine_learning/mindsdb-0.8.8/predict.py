from mindsdb import *

# use the model to make predictions
# result0 = MindsDB().predict(predict='score0', when={'map_width': 32}, model_name='halite3_bot_score0')
# result1 = MindsDB().predict(predict='score1', when={'map_width': 32}, model_name='halite3_bot_score1')
# scoreDiffResult = MindsDB().predict(predict='scoreDiff', when={'map_width': 48}, model_name='halite3_bot_scoreDiff')
# you can now print the results
#print('The predicted rank for bot0 is {p0} with {conf} confidence'.format(p0=result0.predicted_values[0]['p0'], conf=result0.predicted_values[0]['prediction_confidence']))
# print('The predicted rank for bot1 is {p1} with {conf} confidence'.format(p1=result1.predicted_values[0]['p1'], conf=result1.predicted_values[0]['prediction_confidence']))
mapSizes = [32, 40, 48, 56, 64];
scoreDiffResults = [];
for i in range(len(mapSizes)):
  scoreDiffResult = MindsDB().predict(predict='scoreDiff', when={'map_width': mapSizes[i]}, model_name='halite3_bot_scoreDiff')
  scoreDiffResults.append(scoreDiffResult)

for i in range(len(scoreDiffResults)):
  print('The predicted score diff on map size {mapSize} for bot0 vs bot1 is {scoreDiff} with {conf} confidence'.format(scoreDiff=scoreDiffResults[i].predicted_values[0]['scoreDiff'], conf=scoreDiffResults[i].predicted_values[0]['prediction_confidence'], mapSize=mapSizes[i]))
