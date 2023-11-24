import pandas as pd
import json
from decorators import EpochData, PredictionData, SentimentData

# using decorators
def load_predictions_data2():
    """
    Load predictions data from file predictions.json.

    Returns:
    - EpochData: An instance of the EpochData class representing the JSON data.
    """
    with open('data/predictions.json', 'r') as file:
        data = json.load(file)

    filtered_epochs = [epoch_data for epoch_data in data['cache']['epochs'].values() if all(prop in epoch_data for prop in ['txData', 'oracleData', 'postData', 'results', 'sentimentData', 'bnBettable', 'bnOfLock']) ]

    prediction_data_list = []

    for epoch_data in filtered_epochs:
        try:
            sentiment_data_dict = epoch_data['sentimentData']
            sentiment_data_dict.pop('updatedAt', None)
            sentiment_data = SentimentData(**sentiment_data_dict)
            sentiment_data.process_json()
            epoch_data['sentimentData'] = sentiment_data
            
            prediction_data = PredictionData(**epoch_data)
            prediction_data_list.append(prediction_data)
        except Exception as e:
            print(f"Error in epoch {epoch_data['txData']['epoch']}: {e}")
            print(epoch_data)

    epoch_data = EpochData(epochs=prediction_data_list)
    
    return epoch_data

# just some functions of TA

#Moving Average  
def MA(df, n):  
  MA = pd.Series(df['Close'].rolling(n).mean(), name = 'MA_' + str(n))  
  df = df.join(MA)  
  return df

#Exponential Moving Average  
def EMA(df, n):  
    EMA = pd.Series(pd.ewma(df['Close'], span = n, min_periods = n - 1), name = 'EMA_' + str(n))  
    df = df.join(EMA)  
    return df

#Momentum  
def MOM(df, n):  
    M = pd.Series(df['Close'].diff(n), name = 'MOM_' + str(n))  
    df = df.join(M)  
    return df

#Rate of Change  
def ROC(df, n):  
    M = df['Close'].diff(n - 1)  
    N = df['Close'].shift(n - 1)  
    ROC = pd.Series(M / N, name = 'ROC_' + str(n))  
    df = df.join(ROC)  
    return df

#Average True Range  
def ATR(df, n, high= 'High', low= 'Low', close= 'Close', append_to_name = ''):  
    i = 0  
    TR_l = [0]  
    while i < df.index[-1]:  
        TR = max(df._get_value(i + 1, high), df._get_value(i, close)) - min(df._get_value(i + 1, low), df._get_value(i, close))  
        TR_l.append(TR)  
        i = i + 1  
    TR_s = pd.Series(TR_l)  
    ATR = pd.Series(pd.Series.ewm(TR_s, span = n, min_periods = n).mean(), name = 'ATR_' + append_to_name + str(n))  
    df = df.join(ATR)  
    return df

#Bollinger Bands  
def BBANDS(df, n):  
    MA = pd.Series(df['Close'].rolling(n).mean())  
    MSD = pd.Series(df['Close'].rolling(n).std())  
    b1 = 4 * MSD / MA  
    B1 = pd.Series(b1, name = 'BollingerB_' + str(n))  
    df = df.join(B1)  
    b2 = (df['Close'] - MA + 2 * MSD) / (4 * MSD)  
    B2 = pd.Series(b2, name = 'Bollinger%b_' + str(n))  
    df = df.join(B2)  
    return df

#Pivot Points, Supports and Resistances  
def PPSR(df):  
    PP = pd.Series((df['High'] + df['Low'] + df['Close']) / 3)  
    R1 = pd.Series(2 * PP - df['Low'])  
    S1 = pd.Series(2 * PP - df['High'])  
    R2 = pd.Series(PP + df['High'] - df['Low'])  
    S2 = pd.Series(PP - df['High'] + df['Low'])  
    R3 = pd.Series(df['High'] + 2 * (PP - df['Low']))  
    S3 = pd.Series(df['Low'] - 2 * (df['High'] - PP))  
    psr = {'PP':PP, 'R1':R1, 'S1':S1, 'R2':R2, 'S2':S2, 'R3':R3, 'S3':S3}  
    PSR = pd.DataFrame(psr)  
    df = df.join(PSR)  
    return df

#Stochastic oscillator %K  
def STOK(df):  
    SOk = pd.Series((df['Close'] - df['Low']) / (df['High'] - df['Low']), name = 'STOCHK')  
    df = df.join(SOk)  
    return df

#Stochastic oscillator %D  
def STOCHD(df, n):  
    SOk = pd.Series((df['Close'] - df['Low']) / (df['High'] - df['Low']), name = 'SO%k')  
    SOd = pd.Series(pd.Series.ewm(SOk, span = n, min_periods = n - 1).mean(), name = 'stoch_d')  
    df = df.join(SOd)  
    return df

def STOCHK(df, fast, slow):
    # Define periods
    k_period = fast
    d_period = slow
    temp_df = df.copy()
    # Adds a "n_high" column with max value of previous 14 periods
    temp_df['n_high'] = temp_df['High'].rolling(k_period).max()
    # Adds an "n_low" column with min value of previous 14 periods
    temp_df['n_low'] = temp_df['Low'].rolling(k_period).min()
    # Uses the min/max values to calculate the %k (as a percentage)
    temp_df['stoch_k'] = (temp_df['Close'] - temp_df['n_low']) * 100 / (temp_df['n_high'] - temp_df['n_low'])
    # Uses the %k to calculates a SMA over the past 3 values of %k
    df['stoch_k'] = temp_df['stoch_k'].rolling(d_period).mean()
    # df['stoch_k2'] = temp_df['stoch_k']
    
    return df
