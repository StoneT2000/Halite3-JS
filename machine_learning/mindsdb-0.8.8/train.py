from mindsdb import *


# We tell mindsDB what we want to learn and from what data
'''
MindsDB().learn(
    from_data="data.csv", # the path to the file where we can learn from, (note: can be url)
    predict='p1', # the column we want to learn to predict given all the data in the file
    model_name='halite3_bot_rank1' # the name of this model
)

'''
MindsDB().learn(
    from_data="data.csv", # the path to the file where we can learn from, (note: can be url)
    predict='scoreDiff', # the column we want to learn to predict given all the data in the file
    model_name='halite3_bot_scoreDiff' # the name of this model
)

