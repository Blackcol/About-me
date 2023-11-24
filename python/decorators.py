from dataclasses import dataclass
from typing import Dict, List, Union, Optional
import json

@dataclass
class TxData:
    epoch: int
    quantity: Dict[str, int]
    amounts: Dict[str, float]
    xRewards: Dict[str, float]
    lastTx: str
    predictedBet: Union[str, None]
    locked: bool

@dataclass
class SentimentData:
    epoch: int
    json: str  # You might want to define a proper type for this, e.g., a class for sentiment data
    data_by_timeframe: Dict[str, Dict[str, float]] = None
    
    def process_json(self):
        """
        Process the JSON string and assign extracted properties to the instance.
        """
        json_data = json.loads(self.json)
        self.data_by_timeframe = json_data
          
        setattr(self, 'json', '')

@dataclass
class OracleData:
    epoch: int
    lastPrice: float
    answer: float
    startedAt: str
    updatedAt: str
    answeredInRound: str
    dateStr: str

@dataclass
class Results:
    winner: str
    bullX: float
    bearX: float
    bullAmount: float
    bearAmount: float
    totalAmount: float

@dataclass
class EpochData:
    epoch: int
    lockTimestamp: str
    closeTimestamp: str
    lockPrice: str
    closePrice: str
    bullAmount: str
    bearAmount: str
    totalAmount: str
    updatedAt: int

@dataclass
class PredictionData:
    preData_2: Optional[EpochData]
    txData: TxData
    sentimentData: SentimentData
    oracleData: Optional[OracleData]
    results: Results
    postData: EpochData
    bnBettable: int
    bnOfLock: int

@dataclass
class EpochData:
    epochs: List[PredictionData]