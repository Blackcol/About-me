# some code of my notebooks

from time import sleep
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, train_test_split
from binance.client import Client,HistoricalKlinesType
import matplotlib.pyplot as plt
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier, GradientBoostingClassifier
from sklearn.feature_selection import SelectFromModel
from sklearn.model_selection import RandomizedSearchCV
from sklearn import metrics
import talib as ta

np.set_printoptions(suppress=True)
df = pd.read_csv('../data/df_prod_5.csv')
df_test = pd.read_csv('../data/df_test_prod_5.csv')

X_l = []
Y_l = []
Y_l_str = []
max_test = 2000
max_train = 0
lookback = 5  # our lookback is 25 last prices
candles_to_predict = 5
min_price_diff = 0.02  # for pct diff use 0.02 or calculate it according to actual price
chosen_price_property = 'OHLC'
chosen_test_property = 'OHLC'
tendence = 0  # bearish || house
bear_type = 1

# will perma ignore last candle, because can have 1 sec of info or 59sec, but we dont know.
splitted_len = 0
train_loop = lookback + candles_to_predict + splitted_len
while train_loop < len(df):
    # while train_loop < max_test:
    # -1 to include last candle(current), should not if using volume
    loop_base_zero = train_loop - 0
    start_idx = train_loop - lookback - candles_to_predict
    end_idx = train_loop - candles_to_predict - 1
    # open will be the closest close to bet time
    open = df.iloc[end_idx][chosen_price_property]
    close = df.iloc[loop_base_zero][chosen_price_property]
    # print("current idx", loop_base_zero, "row to predict", df.iloc[loop_base_zero].values)
    # print("idx to decide bet", loop_base_zero - candles_to_predict, "row", df.iloc[loop_base_zero - candles_to_predict].values)
    diff = close - open  # > 0 bull else bear
    # diff = getChgPct(open, 0, 0, close)  # only when using OHLC || close

    tmp_result = 0
    if close < open and diff < 0 and diff <= -min_price_diff:
        Y_l.append(bear_type)
        tmp_result = 1
    else:
        Y_l.append(tendence)
        tmp_result = tendence

    X_l.append(df.iloc[start_idx:train_loop - candles_to_predict].values.ravel())
    # print("Appending", f"{start_idx}:{end_idx}")
    # print("Values to add start", df.iloc[start_idx].values.ravel())
    # print("Values to add end", df.iloc[end_idx].values.ravel())
    # print("Data", df.iloc[start_idx:train_loop - candles_to_predict].values.ravel())
    # print(f"diff: {diff} open: {open} close: {close} res: {tmp_result} \n")

    train_loop += 1


diff = 0
X_l_2 = []
Y_l_2 = []
test_loop = lookback + candles_to_predict
while test_loop < len(df_test) and Y_l_2.__len__() < max_test:
    loop_base_zero = test_loop - 0 # -1 to include last candle(current), should not if using volume
    start_idx = test_loop - lookback - candles_to_predict
    end_idx = test_loop - candles_to_predict - 1
    open = df_test.iloc[end_idx][chosen_test_property]
    close = df_test.iloc[loop_base_zero][chosen_test_property]
        
    diff = close - open  # > 0 bull else bear
    tmp_result = -1
    if close < open and diff < 0 and diff <= -min_price_diff:
        Y_l_2.append(bear_type)
        tmp_result = 1
    else:
        Y_l_2.append(tendence)
        tmp_result = tendence

    X_l_2.append(df_test.iloc[start_idx:test_loop - candles_to_predict].values.ravel())
    test_loop += 1
    
X_train = np.array(X_l)  # We convert our data into numpy arrays
Y_train = np.array(Y_l)
X_train, X_test, Y_train, Y_test = train_test_split(X_train, Y_train, test_size=0.1, random_state=0)
X_test_uk = np.array(X_l_2)  # We convert our data into numpy arrays
Y_test_uk = np.array(Y_l_2)
scaler = StandardScaler()
scaler.fit(X_train)
X_train_std = scaler.transform(X_train)
X_test_std = scaler.transform(X_test)

log_rfc = RandomForestClassifier(max_depth=50, n_estimators=2000, criterion='log_loss', random_state=2, n_jobs=6, 
                                # min_samples_split=2, 
                                # min_samples_leaf=7, 
                                max_features=6, 
                                bootstrap=True
                                 )
model = log_rfc
cols = getColumnsNumerated(df.columns, lookback)
X_train_std = pd.DataFrame(X_train_std, columns=cols)
X_test_std = pd.DataFrame(X_test_std, columns=cols)
model.fit(X_train_std, Y_train)
Y_pred = model.predict(X_test_std)

print("Accuracy known: " + str(accuracy_score(Y_pred, Y_test)))