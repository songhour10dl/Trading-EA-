//+------------------------------------------------------------------+
//|                                          GoldTradingBot.mq5      |
//|              MT5 Trading Bot with Web Dashboard Integration      |
//+------------------------------------------------------------------+
#property strict
#property copyright "Trading Bot 2026"
#property link "https://tradingbot.local"
#property version "2.00"
#property description "Risk-capped XAUUSD range scalper with bounded recovery and dashboard sync"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\DealInfo.mqh>

CTrade        trade;
CPositionInfo positionInfo;
CDealInfo     dealInfo;

enum TRADING_STRATEGY
{
   STRATEGY_SIDEWAYS = 0,
   STRATEGY_TREND    = 1,
   STRATEGY_SCALPING = 2,
   STRATEGY_BREAKOUT = 3,
   STRATEGY_MARTINGALE_SCALPING = 4
};

//--- Inputs ---------------------------------------------------------
input string             EAName             = "MT5 Trading Bot";
input int                MagicNumber        = 20260516;
input TRADING_STRATEGY   Strategy           = STRATEGY_MARTINGALE_SCALPING;
input string             BackendURL         = "http://192.168.101.8:5000";
input string             ApiKey             = "";
input bool               TradingEnabledInput = true;
input double             RiskPercentage     = 1.0;    // % of balance risked per trade
input double             MaxRiskPerTradePct = 1.0;    // hard risk cap per position
input double             MaxSpreadPoints    = 80.0;   // XAUUSD broker points
input int                MaxSlippagePoints  = 30;
input int                HeartbeatInterval  = 10;     // seconds

//--- Controlled Martingale Averaging Inputs -------------------------
input bool               EnableMartingale   = true;
input bool               EnableBuy          = true;
input bool               EnableSell         = false;
input double             InitialLot         = 0.01;
input double             LotMultiplier      = 2.0;
input int                GridStepPoints     = 1200;
input int                MaxOrders          = 5;
input double             MaxLotPerOrder     = 0.08;
input double             MaxBasketLots      = 0.15;
input double             BasketTakeProfitMoney = 1.00;
input double             BasketStopLossMoney = 5.00;
input double             MaxDrawdownPercent = 10.0;
input int                CooldownAfterBasketCloseMinutes = 5;

input ENUM_TIMEFRAMES    EntryTimeframe     = PERIOD_M1;
input int                RSI_Period         = 14;
input int                BB_Period          = 20;
input double             BB_Deviation       = 1.5;
input int                ATR_Period         = 14;
input double             ATR_SL_Multiplier  = 1.5;
input double             RewardRiskRatio    = 1.5;
input int                MaxConcurrentPos   = 3;
input int                MaxDailyTrades     = 20;
input bool               UseTrailingStop    = true;
input double             TrailingStartRR    = 1.0;
input double             TrailingATRMult    = 1.0;
input int                SignalCooldownSec  = 60;
input int                MinRSIBuy          = 40;
input int                MaxRSISell         = 60;
input double             InitialLotSize     = 0.01;
input double             MartingaleMultiplier = 1.2;
input int                MaxMartingaleSteps = 3;
input double             MaxLotPerPosition  = 0.05;
input double             MaxCombinedVolume  = 0.10;
input double             MaxBasketTakeProfit = 10.0; // deposit currency; 0 disables
input double             MaxBasketStopLoss  = 20.0;  // deposit currency loss; 0 disables
input bool               UseBasketTakeProfit = false;
input bool               UseBasketStopLoss = true;
input bool               UseBasketDrawdown = true;
input double             MaxBasketDrawdownPct = 2.0; // equity drawdown from basket peak; 0 disables
input double             DailyLossLimitPct  = 2.0;
input double             StrategyDrawdownPct = 5.0;
input double             ReferenceEquity     = 0.0;  // 0 = equity at first initialization
input bool               CloseBasketOnRiskLimit = true;
input int                ADX_Period          = 14;
input double             ADX_RangeMax        = 20.0;
input double             ADX_TrendBlock      = 28.0;
input int                RangeLookbackBars   = 24;
input double             RangeMaxWidthATR    = 5.0;
input double             ATR_MaxMultiple     = 2.5;
input double             GridATRMultiplier   = 1.0;
input double             GridMinPoints       = 150.0;
input double             GridMaxPoints       = 1200.0;
input double             BasketBreakEvenBuffer = 0.0;
input bool               AllowHedgeEntries   = false;
input bool               UseNewsFilter       = false; // safe unavailable-feed fallback: blocks entries
input int                NewsBlockMinutesBefore = 30;
input int                NewsBlockMinutesAfter = 15;
input bool               ShowStatusPanel     = true;
input bool               AllowManualPositionControl = false;
input bool               ManageManualPositions = false;
input bool               UseBreakEven         = false;
input double             BreakEvenAtR         = 1.0;
input bool               UsePerPositionStops  = true;

//--- Forward Declarations --------------------------------------------
void OnHeartbeat();
void ProcessCommands();
void ManageTrailingStops();
void CheckMartingaleBasketTakeProfit();
void CheckMartingaleBasketStopLoss();
void CheckMartingaleBasketDrawdown();
bool IsCooldownActive();
string JsonEscape(string str);
void SendJson(string method, string url, string payload, string tag);
double GetBasketSide(double &averageEntry, double &volume);
void ExecuteMeanReversion();
int CountBuyBasketOrders();
int CountSellBasketOrders();
double GetBuyBasketProfit();
double GetSellBasketProfit();
double CalculateMartingaleLot(int currentBasketCount);
bool CheckBasketVolumeLimit(double newLotSize, bool isBuy);
double GetGridStepDistance();
bool ShouldOpenBuyGrid(double currentPrice);
bool ShouldOpenSellGrid(double currentPrice);
void CloseAllBuyPositions();
void CloseAllSellPositions();

//--- Indicator handles ----------------------------------------------
int hRSI = INVALID_HANDLE;
int hBB  = INVALID_HANDLE;
int hATR = INVALID_HANDLE;
int hADX = INVALID_HANDLE;

//--- Runtime state --------------------------------------------------
string   eaStatus         = "DISCONNECTED";
string   tradingStatus    = "WAITING_FOR_SIGNAL";
string   marketState      = "UNKNOWN";
string   riskBlockReason  = "";
bool     newEntriesAllowed = false;
double   accountBalance   = 0;
double   accountEquity    = 0;
double   marginLevel      = 0;
double   freeMargin       = 0;
int      openPositionsCount = 0;
int      botPositionsCount  = 0;
double   floatingPnl      = 0;
double   dailyRealizedPnl = 0;
double   currentSpreadPoints = 0;
double   currentADX = 0;
double   currentATR = 0;
bool     tradingEnabled   = false;

//--- Martingale Grid State ------------------------------------------
double   buyBasketReferencePrice = 0;
double   sellBasketReferencePrice = 0;
double   lastBuyGridPrice = 0;
double   lastSellGridPrice = 0;
datetime lastBasketCloseTime = 0;
bool     basketCooldownActive = false;

datetime lastHeartbeat    = 0;
datetime lastCommandCheck = 0;
datetime lastTradeTime    = 0;
datetime lastTradeReport  = 0;
int      tradesToday      = 0;
datetime lastCountedEntryTime = 0;
int      martingaleStep   = 0;
int      closedRecoveryWins = 0;
   double   basketPeakEquity = 0;
double   strategyReferenceEquity = 0;
double   recoveryDeficit = 0;
double   dayStartEquity = 0;
double   weekStartEquity = 0;
double   monthStartEquity = 0;
datetime weekStartStamp = 0;
datetime monthStartStamp = 0;
datetime dayStartEquityDate = 0;
bool     riskLatched = false;
bool     strategyRiskLatched = false;
bool     basketRiskLatched = false;
bool     dailyRiskLatched = false;
int      recoveryPauseBars = 0;
ulong    lastProcessedExitDeal = 0;
ulong    lastProcessedPositionId = 0;
datetime tradesTodayDate  = 0;
double   startOfDayBalance = 0;
datetime lastEvaluatedBar = 0;
datetime lastRegimeBar = 0;
datetime strategyStartTime = 0;
string   statePrefix = "";
bool     newsFeedAvailable = false;
bool     newsFeedPreviouslyUnavailable = false;
int      rangeConfirmBars = 0;
int      trendConfirmBars = 0;
int      volatilityPauseBars = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(!ValidateInputs())
      return INIT_PARAMETERS_INCORRECT;

   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetTypeFillingBySymbol(_Symbol);
   trade.SetDeviationInPoints(MaxSlippagePoints);

   hRSI = iRSI(_Symbol, EntryTimeframe, RSI_Period, PRICE_CLOSE);
   hBB  = iBands(_Symbol, EntryTimeframe, BB_Period, 0, BB_Deviation, PRICE_CLOSE);
   hATR = iATR(_Symbol, EntryTimeframe, ATR_Period);
   hADX = iADX(_Symbol, EntryTimeframe, ADX_Period);

   if(hRSI == INVALID_HANDLE || hBB == INVALID_HANDLE || hATR == INVALID_HANDLE || hADX == INVALID_HANDLE)
   {
      Print("ERROR: Failed to create indicator handles. Error: ", GetLastError());
      return INIT_FAILED;
   }
   if(UseNewsFilter)
   {
      Print("News guard enabled without feed: entries will remain blocked.");
      marketState = "NEWS_BLOCKED";
   }

   eaStatus       = "RUNNING";
   tradingEnabled = TradingEnabledInput;
   statePrefix = "NS_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "_" + _Symbol + "_" + IntegerToString(MagicNumber) + "_";
   LoadPersistentState();
   if(MaxRiskPerTradePct <= 0 || DailyLossLimitPct <= 0 || StrategyDrawdownPct <= 0)
      return INIT_PARAMETERS_INCORRECT;
   accountEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(dayStartEquity <= 0) dayStartEquity = accountEquity;
   if(strategyReferenceEquity <= 0)
      strategyReferenceEquity = (ReferenceEquity > 0 ? ReferenceEquity : accountEquity);
   if(basketPeakEquity <= 0) basketPeakEquity = accountEquity;
   if(strategyStartTime <= 0) strategyStartTime = TimeTradeServer();
   if(strategyStartTime <= 0) strategyStartTime = TimeTradeServer();
   SavePersistentState();
   ResetDailyCounters();
   ReconcileClosedSequences();

   if(ApiKey == "" && !MQLInfoInteger(MQL_TESTER))
      Print("INFO: API key is empty; trading works, but dashboard heartbeat/commands are disabled.");

   Print("=======================================");
   Print("MT5 Trading Bot initialized");
   Print("Symbol: ", _Symbol, "  TF: ", EnumToString(EntryTimeframe));
   Print("Magic: ", MagicNumber, "  Strategy: ", EnumToString(Strategy));
   Print("Risk-aware XAUUSD range strategy. Base lot=", InitialLotSize,
         " multiplier=", MartingaleMultiplier, " max recovery levels=", MaxMartingaleSteps,
         " basket volume cap=", MaxCombinedVolume);
   Print("Backend: ", BackendURL);
   Print("=======================================");

   if(ApiKey != "") OnHeartbeat();
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(reason != REASON_CHARTCHANGE && reason != REASON_PARAMETERS && reason != REASON_RECOMPILE)
      eaStatus = "STOPPED";
   if(ApiKey != "") OnHeartbeat();

   if(hRSI != INVALID_HANDLE) IndicatorRelease(hRSI);
   if(hBB  != INVALID_HANDLE) IndicatorRelease(hBB);
   if(hATR != INVALID_HANDLE) IndicatorRelease(hATR);
   if(hADX != INVALID_HANDLE) IndicatorRelease(hADX);
   DeleteStatusPanel();

   Print("EA stopped. Reason: ", reason);
}

// Track actual closed bot deals. Loss increases the bounded next-entry risk;
// a win or breakeven resets progression. Manual trades are ignored.
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   // We only use transaction callbacks as a wake-up; inspect the complete deal
   // history in ReconcileClosedSequences to handle restarts/partial exits.
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD && trans.deal > 0)
      ProcessClosedDeal(trans.deal);
   ReconcileClosedSequences();
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD && trans.deal > 0 && ApiKey != "")
      ReportClosedDealFromHistory(trans.deal);
}

void ReportClosedDealFromHistory(ulong dealId)
{
   if(!HistoryDealSelect(dealId)) return;
   long entry=HistoryDealGetInteger(dealId,DEAL_ENTRY);
   if(entry!=DEAL_ENTRY_OUT && entry!=DEAL_ENTRY_OUT_BY && entry!=DEAL_ENTRY_INOUT) return;
   if(HistoryDealGetInteger(dealId,DEAL_MAGIC)!=MagicNumber || HistoryDealGetString(dealId,DEAL_SYMBOL)!=_Symbol) return;
   ulong positionId=(ulong)HistoryDealGetInteger(dealId,DEAL_POSITION_ID);
   double net=HistoryDealGetDouble(dealId,DEAL_PROFIT)+HistoryDealGetDouble(dealId,DEAL_SWAP)+
              HistoryDealGetDouble(dealId,DEAL_COMMISSION)+HistoryDealGetDouble(dealId,DEAL_FEE);
   ReportClosedPosition(positionId,dealId,net);
}

void ReconcileClosedSequences()
{
   datetime scanStart = (strategyStartTime > 0 ? strategyStartTime : 0);
   if(!HistorySelect(scanStart, TimeTradeServer())) return;
   bool reconstruct = (lastProcessedExitDeal == 0);

   ulong latestExitDeal = 0;
   double trailingSequence = reconstruct ? 0 : recoveryDeficit;
   int sequenceStep = reconstruct ? 0 : martingaleStep;
   int winsAfterRecovery = reconstruct ? 0 : closedRecoveryWins;
   ulong lastPosition = lastProcessedPositionId;
   for(int i=0;i<HistoryDealsTotal();i++)
   {
      ulong deal=HistoryDealGetTicket(i);
      if(deal==0 || HistoryDealGetInteger(deal,DEAL_MAGIC)!=MagicNumber || HistoryDealGetString(deal,DEAL_SYMBOL)!=_Symbol) continue;
      long entry=HistoryDealGetInteger(deal,DEAL_ENTRY);
      if(entry==DEAL_ENTRY_IN && (datetime)HistoryDealGetInteger(deal,DEAL_TIME)>=ServerDayStart())
      {
         datetime entryTime = (datetime)HistoryDealGetInteger(deal,DEAL_TIME);
         if(entryTime > lastCountedEntryTime) lastCountedEntryTime = entryTime;
      }
      if(entry!=DEAL_ENTRY_OUT && entry!=DEAL_ENTRY_OUT_BY && entry!=DEAL_ENTRY_INOUT) continue;
      if(!reconstruct && deal <= lastProcessedExitDeal) continue;
      double net = HistoryDealGetDouble(deal,DEAL_PROFIT)+HistoryDealGetDouble(deal,DEAL_SWAP)+HistoryDealGetDouble(deal,DEAL_COMMISSION)+HistoryDealGetDouble(deal,DEAL_FEE);
      if(net < 0)
      {
         trailingSequence += -net;
         sequenceStep = MathMin(MaxMartingaleSteps, sequenceStep + (int)MathCeil(HistoryDealGetDouble(deal,DEAL_VOLUME)/InitialLotSize));
         winsAfterRecovery = 0;
      }
      else if(net > 0)
      {
         trailingSequence = MathMax(0, trailingSequence - net);
         if(trailingSequence <= 0.000001)
         {
            sequenceStep = 0;
            winsAfterRecovery = 0;
         }
      }
      latestExitDeal=deal;
      lastPosition=(ulong)HistoryDealGetInteger(deal,DEAL_POSITION_ID);
   }

   // If the EA restarted with an open basket, rebuild progression from all
   // realized losses/profits accumulated since this strategy's reference start.
   if(latestExitDeal > lastProcessedExitDeal)
   {
      martingaleStep = sequenceStep;
      closedRecoveryWins = winsAfterRecovery;
      recoveryDeficit = trailingSequence;
      lastProcessedExitDeal=latestExitDeal;
      lastProcessedPositionId=lastPosition;
      SavePersistentState();
   }
}

void ProcessClosedDeal(ulong dealId)
{
   if(dealId == 0 || !HistoryDealSelect(dealId)) return;

   long entry = HistoryDealGetInteger(dealId, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT)
      return;
   if(HistoryDealGetInteger(dealId, DEAL_MAGIC) != MagicNumber ||
      HistoryDealGetString(dealId, DEAL_SYMBOL) != _Symbol)
      return;

      // In hedging accounts a position can close in multiple partial deals.
      // Wait until no volume remains for the position ticket before counting
      // the final aggregate outcome toward progression.
   ulong positionId = (ulong)HistoryDealGetInteger(dealId, DEAL_POSITION_ID);
   if(positionId == lastProcessedPositionId && BasketPositionCount() > 0)
      return;

   double remainingVolume = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(positionInfo.SelectByIndex(i) && positionInfo.Identifier() == positionId)
         remainingVolume += positionInfo.Volume();
   }
   if(remainingVolume > 0)
      return;

   if(!HistorySelectByPosition(positionId))
      return;

   double netResult = 0;
   for(int i = 0; i < HistoryDealsTotal(); i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0 || HistoryDealGetInteger(deal, DEAL_MAGIC) != MagicNumber)
         continue;
      long dealEntry = HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_OUT_BY || dealEntry == DEAL_ENTRY_INOUT)
      {
         netResult += HistoryDealGetDouble(deal, DEAL_PROFIT)
                    + HistoryDealGetDouble(deal, DEAL_SWAP)
                    + HistoryDealGetDouble(deal, DEAL_COMMISSION);
      }
   }

   lastProcessedExitDeal = dealId;
   lastProcessedPositionId = positionId;
   if(BasketPositionCount() == 0 && UseBasketTakeProfit && MaxBasketTakeProfit > 0 && netResult >= MaxBasketTakeProfit)
   {
      martingaleStep = 0;
      recoveryDeficit = 0;
      closedRecoveryWins = 0;
      basketRiskLatched = false;
      basketPeakEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   }
   else if(BasketPositionCount() == 0 && UseBasketTakeProfit && basketRiskLatched)
   {
      martingaleStep=0;
      recoveryDeficit=0;
      closedRecoveryWins=0;
      basketRiskLatched=false;
      basketPeakEquity=AccountInfoDouble(ACCOUNT_EQUITY);
   }
   else if(netResult < 0)
   {
      martingaleStep = MathMin(martingaleStep + MathMax(1,(int)MathCeil(HistoryDealGetDouble(dealId,DEAL_VOLUME)/InitialLotSize)), MaxMartingaleSteps);
      closedRecoveryWins = 0;
      recoveryDeficit += -netResult;
   }
   else if(netResult > 0)
   {
      recoveryDeficit = MathMax(0, recoveryDeficit - netResult);
      closedRecoveryWins++;
      if(recoveryDeficit <= 0.000001)
      {
         martingaleStep = 0;
         closedRecoveryWins = 0;
      }
   }
   SavePersistentState();

   Print("Closed bot deal ", dealId, " net=", DoubleToString(netResult, 2),
         "; next martingale step=", martingaleStep);

   if(ApiKey != "")
      ReportClosedPosition(positionId, dealId, netResult);
}

void ReportClosedPosition(ulong positionId, ulong closingDeal, double netResult)
{
   if(!HistorySelectByPosition(positionId))
      return;

   ulong openingDeal = 0;
   bool targetIsSell = false;
   double openVolume = 0;
   double openPriceVolume = 0;
   ulong latestExitDeal = 0;
   double closeVolume = 0;
   double closePriceVolume = 0;
   double closeCommission = 0;
   double closeSwap = 0;
   double closeFees = 0;
   double closeProfit = 0;
   datetime closeTime = 0;
   ENUM_DEAL_REASON closeReason = DEAL_REASON_CLIENT;
   for(int i = 0; i < HistoryDealsTotal(); i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0 || HistoryDealGetInteger(deal, DEAL_MAGIC) != MagicNumber)
         continue;
      long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_IN || entry == DEAL_ENTRY_INOUT)
      {
         if(openingDeal == 0) openingDeal = deal;
         if(entry == DEAL_ENTRY_INOUT)
         {
            double reversalVolume = HistoryDealGetDouble(deal, DEAL_VOLUME);
            openVolume += reversalVolume;
            openPriceVolume += HistoryDealGetDouble(deal, DEAL_PRICE) * reversalVolume;
            targetIsSell = (HistoryDealGetInteger(deal,DEAL_TYPE) == DEAL_TYPE_SELL);
         }
         else
         {
            double volume = HistoryDealGetDouble(deal, DEAL_VOLUME);
            openVolume += volume;
            openPriceVolume += HistoryDealGetDouble(deal, DEAL_PRICE) * volume;
         }
      }
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
      {
         double volume = HistoryDealGetDouble(deal, DEAL_VOLUME);
         closeVolume += volume;
         if(deal > latestExitDeal) latestExitDeal = deal;
         closePriceVolume += HistoryDealGetDouble(deal, DEAL_PRICE) * volume;
         closeCommission += HistoryDealGetDouble(deal, DEAL_COMMISSION);
         closeSwap += HistoryDealGetDouble(deal, DEAL_SWAP);
         closeFees += HistoryDealGetDouble(deal, DEAL_FEE);
         closeProfit += HistoryDealGetDouble(deal, DEAL_PROFIT);
         datetime dealTime = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
         if(dealTime >= closeTime)
         {
            closeTime = dealTime;
            closeReason = (ENUM_DEAL_REASON)HistoryDealGetInteger(deal, DEAL_REASON);
         }
      }
   }
   if(openingDeal == 0 || closeVolume <= 0 || latestExitDeal != closingDeal)
   {
      Print("History sync skipped: opening/closing deal details unavailable for position ", positionId);
      return;
   }

   double remainingVolume = 0;
   for(int i=PositionsTotal()-1;i>=0;i--)
      if(positionInfo.SelectByIndex(i) && positionInfo.Identifier()==positionId)
         remainingVolume += positionInfo.Volume();
   if(remainingVolume > 0)
   {
      Print("Partial close retained; history row waits for final position close. position=",positionId);
      return;
   }

   long openType = (targetIsSell ? DEAL_TYPE_SELL : HistoryDealGetInteger(openingDeal, DEAL_TYPE));
   string direction = (openType == DEAL_TYPE_BUY ? "BUY" : "SELL");
   string strategyName = (Strategy == STRATEGY_MARTINGALE_SCALPING ? "MARTINGALE_SCALPING" : EnumToString(Strategy));
   string payload = "{\"trades\":[{";
   payload += "\"ticket\":\"" + IntegerToString((long)positionId) + "\",";
   payload += "\"dealTicket\":\"" + IntegerToString((long)closingDeal) + "\",";
   payload += "\"positionId\":\"" + IntegerToString((long)positionId) + "\",";
   payload += "\"symbol\":\"" + JsonEscape(HistoryDealGetString(openingDeal, DEAL_SYMBOL)) + "\",";
   payload += "\"direction\":\"" + direction + "\",";
   payload += "\"strategy\":\"" + strategyName + "\",";
   payload += "\"entryPrice\":" + DoubleToString(openVolume>0 ? openPriceVolume/openVolume : HistoryDealGetDouble(openingDeal, DEAL_PRICE), _Digits) + ",";
   payload += "\"entryTime\":" + IntegerToString((int)HistoryDealGetInteger(openingDeal, DEAL_TIME)) + ",";
   payload += "\"exitPrice\":" + DoubleToString(closePriceVolume / closeVolume, _Digits) + ",";
   payload += "\"exitTime\":" + IntegerToString((int)closeTime) + ",";
   payload += "\"lotSize\":" + DoubleToString(openVolume, 2) + ",";
   payload += "\"profitLoss\":" + DoubleToString(closeProfit + closeCommission + closeSwap + closeFees, 2) + ",";
   payload += "\"commission\":" + DoubleToString(closeCommission + closeFees, 2) + ",";
   payload += "\"swap\":" + DoubleToString(closeSwap, 2) + ",";
   payload += "\"exitReason\":\"" + EnumToString(closeReason) + "\"";
   payload += "}]}";

   SendJson("POST", BackendURL + "/api/mt5/trade-update/" + ApiKey, payload, "closed-trade-history");
}

//+------------------------------------------------------------------+
void OnTick()
{
   UpdateAccountData();
   ResetDailyCounters();
   ReconcileClosedSequences();
   ReconcileClosedSequences();

   if(TimeCurrent() - lastHeartbeat >= HeartbeatInterval)
   {
      if(ApiKey != "") OnHeartbeat();
      lastHeartbeat = TimeCurrent();
   }

   if(ApiKey != "" && TimeCurrent() - lastCommandCheck >= 5)
   {
      ProcessCommands();
      lastCommandCheck = TimeCurrent();
   }

   ManageBasketRisk();
   ManageTrailingStops();
   UpdateStatusPanel();

   // Martingale basket monitoring
   CheckMartingaleBasketTakeProfit();
   CheckMartingaleBasketStopLoss();
   CheckMartingaleBasketDrawdown();

   newEntriesAllowed = tradingEnabled && eaStatus == "RUNNING" && CheckRiskLimits() && !basketRiskLatched &&
                        UpdateMarketRegime() && !riskLatched && NewsAllowsEntries() &&
                        !IsCooldownActive();
   if(newEntriesAllowed)
      ExecuteStrategy();
}

//+------------------------------------------------------------------+
void ResetDailyCounters()
{
   datetime today = ServerDayStart();
   if(dayStartEquityDate != today)
   {
      tradesTodayDate = today;
      tradesToday = CountEntriesSince(today);
      dayStartEquity = accountEquity;
      dayStartEquityDate = today;
      if(!strategyRiskLatched && !dailyRiskLatched)
      {
         riskLatched = false;
         riskBlockReason = "";
      }
      SavePersistentState();
   }

   datetime week = ServerWeekStart();
   if(weekStartStamp != week)
   {
      weekStartStamp = week;
      weekStartEquity = EquityAtTime(week);
      SavePersistentState();
   }

   datetime month = ServerMonthStart();
   if(monthStartStamp != month)
   {
      monthStartStamp = month;
      monthStartEquity = EquityAtTime(month);
      SavePersistentState();
   }
}

double EquityAtTime(datetime atTime)
{
   double realized = 0;
   if(HistorySelect(atTime,TimeTradeServer()))
   {
      for(int i=0;i<HistoryDealsTotal();i++)
      {
         ulong deal=HistoryDealGetTicket(i);
         if(deal==0) continue;
         realized += HistoryDealGetDouble(deal,DEAL_PROFIT)+HistoryDealGetDouble(deal,DEAL_COMMISSION)+
                     HistoryDealGetDouble(deal,DEAL_SWAP)+HistoryDealGetDouble(deal,DEAL_FEE);
      }
   }
   return accountBalance - realized;
}

int CountEntriesSince(datetime fromTime)
{
   if(!HistorySelect(fromTime,TimeTradeServer())) return 0;
   int count=0;
   for(int i=0;i<HistoryDealsTotal();i++)
   {
      ulong deal=HistoryDealGetTicket(i);
      if(deal==0 || HistoryDealGetInteger(deal,DEAL_MAGIC)!=MagicNumber || HistoryDealGetString(deal,DEAL_SYMBOL)!=_Symbol) continue;
      long entry=HistoryDealGetInteger(deal,DEAL_ENTRY);
      if(entry==DEAL_ENTRY_IN || entry==DEAL_ENTRY_INOUT) count++;
   }
   return count;
}

//+------------------------------------------------------------------+
bool CheckRiskLimits()
{
   if(tradesToday >= MaxDailyTrades)
   {
      tradingStatus = "RISK_LIMIT_REACHED";
      riskBlockReason = "Maximum daily trade count reached";
      return false;
   }

   if(dayStartEquity > 0 && DailyLossLimitPct > 0)
   {
      double lossPct = MathMax(0, (dayStartEquity - accountEquity) / dayStartEquity * 100.0);
      if(lossPct >= DailyLossLimitPct)
      {
         LatchRisk("RISK_LIMIT_REACHED: daily equity drawdown " + DoubleToString(lossPct, 2) + "%");
         if(CloseBasketOnRiskLimit && BasketPositionCount() > 0)
            tradingStatus = "CLOSING_BASKET";
         return false;
      }
   }

   if(strategyReferenceEquity > 0 && StrategyDrawdownPct > 0)
   {
      double drawdown = MathMax(0, (strategyReferenceEquity - accountEquity) / strategyReferenceEquity * 100.0);
      if(drawdown >= StrategyDrawdownPct)
      {
         LatchRisk("RISK_LIMIT_REACHED: strategy drawdown " + DoubleToString(drawdown, 2) + "%");
         if(CloseBasketOnRiskLimit && BasketPositionCount() > 0)
            tradingStatus = "CLOSING_BASKET";
         return false;
      }
   }

   if(TimeCurrent() - lastTradeTime < SignalCooldownSec)
   {
      tradingStatus = "COOLDOWN";
      return false;
   }

   if(riskLatched)
   {
      tradingStatus = "RISK_LIMIT_REACHED";
      return false;
   }

   if(!newsFeedAvailable && marketState == "NEWS_BLOCKED")
   {
      tradingStatus = "NEWS_FEED_UNAVAILABLE";
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
void UpdateAccountData()
{
   accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   accountEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
   marginLevel    = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   freeMargin     = AccountInfoDouble(ACCOUNT_MARGIN_FREE);

   // Account-wide totals must include manual trades too, otherwise the
   // dashboard balance/equity/PnL disagrees with the MT5 terminal.
   openPositionsCount = 0;
   botPositionsCount  = 0;
   floatingPnl        = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i)) continue;

      openPositionsCount++;
      floatingPnl += positionInfo.Profit() + positionInfo.Swap() + positionInfo.Commission();
      if(positionInfo.Magic() == MagicNumber && positionInfo.Symbol() == _Symbol)
         botPositionsCount++;
   }

   double spreadPrice = Ask() - Bid();
   currentSpreadPoints = spreadPrice / _Point;

   AnalyzeMarket();
}

//+------------------------------------------------------------------+
void AnalyzeMarket()
{
   UpdateMarketRegime();
}

bool ValidateInputs()
{
   if(MagicNumber <= 0 || RSI_Period < 2 || BB_Period < 2 || ATR_Period < 2 || ADX_Period < 2 ||
      RangeLookbackBars < 5 || InitialLotSize <= 0 || MartingaleMultiplier < 1.0 ||
      MaxMartingaleSteps < 0 || MaxLotPerPosition <= 0 || MaxCombinedVolume <= 0 ||
      MaxConcurrentPos < 1 || MaxSpreadPoints <= 0 || MaxSlippagePoints < 0 ||
      GridMinPoints <= 0 || GridMaxPoints < GridMinPoints || GridATRMultiplier <= 0 ||
      RangeMaxWidthATR <= 0 || ATR_MaxMultiple <= 1 || RiskPercentage <= 0 ||
       MaxBasketTakeProfit < 0 || MaxBasketStopLoss < 0 || MaxBasketDrawdownPct < 0 || DailyLossLimitPct <= 0 ||
       StrategyDrawdownPct <= 0 || ADX_RangeMax <= 0 || ADX_TrendBlock <= ADX_RangeMax)
   {
      Print("INVALID INPUTS: review risk, indicator, regime, volume, and grid parameters.");
      return false;
   }
   if(UseBreakEven && BreakEvenAtR <= 0)
   {
      Print("INVALID INPUTS: BreakEvenAtR must be positive when break-even is enabled.");
      return false;
   }
   if(StringFind(_Symbol,"XAUUSD") < 0)
   {
      Print("ERROR: this EA is restricted to XAUUSD symbols; current symbol is ",_Symbol);
      return false;
   }
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_NETTING)
      Print("Netting account detected: positions are merged; basket state will be reconstructed by symbol+magic.");
   if(UseNewsFilter)
      Print("UseNewsFilter enabled; because no reliable calendar provider is integrated, entries will fail closed.");
   if(MaxBasketStopLoss <= 0 && MaxBasketDrawdownPct <= 0 && MaxBasketTakeProfit <= 0)
      Print("WARNING: basket-specific money/drawdown exits are disabled; daily and strategy equity loss limits remain active.");
   return true;
}

bool NewsAllowsEntries()
{
   if(!UseNewsFilter) return true;
   // There is no external/calendar provider configured in this EA. Fail
   // closed rather than pretending to know the high-impact USD schedule.
   newsFeedAvailable = false;
   if(!newsFeedPreviouslyUnavailable)
      Print("NEWS_BLOCKED: no calendar feed configured; fail-closed mode blocks new entries.");
   newsFeedPreviouslyUnavailable = true;
   marketState = "NEWS_BLOCKED";
   riskBlockReason = "News filter enabled, but no calendar feed is configured";
   tradingStatus = "NEWS_FEED_UNAVAILABLE";
   return false;
}

void LoadPersistentState()
{
   if(GlobalVariableCheck(statePrefix + "martingaleStep"))
      martingaleStep = (int)GlobalVariableGet(statePrefix + "martingaleStep");
   if(GlobalVariableCheck(statePrefix + "recoveryDeficit"))
      recoveryDeficit = GlobalVariableGet(statePrefix + "recoveryDeficit");
   if(GlobalVariableCheck(statePrefix + "basketPeakEquity"))
      basketPeakEquity = GlobalVariableGet(statePrefix + "basketPeakEquity");
   if(GlobalVariableCheck(statePrefix + "closedRecoveryWins"))
      closedRecoveryWins = (int)GlobalVariableGet(statePrefix + "closedRecoveryWins");
   if(GlobalVariableCheck(statePrefix + "dayStartEquity") && GlobalVariableCheck(statePrefix + "dayEquityStamp") &&
      (datetime)GlobalVariableGet(statePrefix + "dayEquityStamp") == ServerDayStart())
   {
      dayStartEquity = GlobalVariableGet(statePrefix + "dayStartEquity");
      dayStartEquityDate = ServerDayStart();
   }
   if(GlobalVariableCheck(statePrefix + "dayStamp"))
      tradesTodayDate = (datetime)GlobalVariableGet(statePrefix + "dayStamp");
   if(GlobalVariableCheck(statePrefix + "tradesToday"))
      tradesToday = (int)GlobalVariableGet(statePrefix + "tradesToday");
   if(GlobalVariableCheck(statePrefix + "riskLatched"))
      riskLatched = GlobalVariableGet(statePrefix + "riskLatched") > 0.5;
   if(GlobalVariableCheck(statePrefix + "dailyRiskLatched"))
      dailyRiskLatched = GlobalVariableGet(statePrefix + "dailyRiskLatched") > 0.5;
   if(GlobalVariableCheck(statePrefix + "strategyRiskLatched"))
      strategyRiskLatched = GlobalVariableGet(statePrefix + "strategyRiskLatched") > 0.5;
   if(GlobalVariableCheck(statePrefix + "basketRiskLatched"))
      basketRiskLatched = GlobalVariableGet(statePrefix + "basketRiskLatched") > 0.5;
   if(ReferenceEquity > 0)
      strategyReferenceEquity = ReferenceEquity;
   else if(GlobalVariableCheck(statePrefix + "referenceEquity"))
      strategyReferenceEquity = GlobalVariableGet(statePrefix + "referenceEquity");
   if(GlobalVariableCheck(statePrefix + "strategyRiskLatched"))
      strategyRiskLatched = GlobalVariableGet(statePrefix + "strategyRiskLatched") > 0.5;
   if(GlobalVariableCheck(statePrefix + "strategyStartTime"))
      strategyStartTime = (datetime)GlobalVariableGet(statePrefix + "strategyStartTime");
   if(GlobalVariableCheck(statePrefix + "weekStartStamp"))
      weekStartStamp = (datetime)GlobalVariableGet(statePrefix + "weekStartStamp");
   if(weekStartStamp == ServerWeekStart())
   {
      if(GlobalVariableCheck(statePrefix + "weekStartEquity")) weekStartEquity = GlobalVariableGet(statePrefix + "weekStartEquity");
   }
   else weekStartStamp = 0;
   if(GlobalVariableCheck(statePrefix + "monthStartStamp"))
      monthStartStamp = (datetime)GlobalVariableGet(statePrefix + "monthStartStamp");
   if(monthStartStamp == ServerMonthStart())
   {
      if(GlobalVariableCheck(statePrefix + "monthStartEquity")) monthStartEquity = GlobalVariableGet(statePrefix + "monthStartEquity");
   }
   else monthStartStamp = 0;
   if(!GlobalVariableCheck(statePrefix + "dayStamp") ||
      (datetime)GlobalVariableGet(statePrefix + "dayStamp") != ServerDayStart())
      riskLatched = false;
}

void SavePersistentState()
{
   if(statePrefix == "") return;
   GlobalVariableSet(statePrefix + "martingaleStep", martingaleStep);
   GlobalVariableSet(statePrefix + "recoveryDeficit", recoveryDeficit);
   GlobalVariableSet(statePrefix + "basketPeakEquity", basketPeakEquity);
   GlobalVariableSet(statePrefix + "tradesToday", tradesToday);
   GlobalVariableSet(statePrefix + "closedRecoveryWins", closedRecoveryWins);
   GlobalVariableSet(statePrefix + "dayStartEquity", dayStartEquity);
   GlobalVariableSet(statePrefix + "dayEquityStamp", (double)dayStartEquityDate);
   GlobalVariableSet(statePrefix + "dayStamp", (double)tradesTodayDate);
   GlobalVariableSet(statePrefix + "riskLatched", riskLatched ? 1.0 : 0.0);
   GlobalVariableSet(statePrefix + "dailyRiskLatched", dailyRiskLatched ? 1.0 : 0.0);
   GlobalVariableSet(statePrefix + "strategyRiskLatched", strategyRiskLatched ? 1.0 : 0.0);
   GlobalVariableSet(statePrefix + "basketRiskLatched", basketRiskLatched ? 1.0 : 0.0);
   GlobalVariableSet(statePrefix + "referenceEquity", strategyReferenceEquity);
   GlobalVariableSet(statePrefix + "strategyStartTime", (double)strategyStartTime);
   GlobalVariableSet(statePrefix + "weekStartEquity", weekStartEquity);
   GlobalVariableSet(statePrefix + "weekStartStamp", (double)weekStartStamp);
   GlobalVariableSet(statePrefix + "monthStartEquity", monthStartEquity);
   GlobalVariableSet(statePrefix + "monthStartStamp", (double)monthStartStamp);
   GlobalVariablesFlush();
}

datetime ServerDayStart()
{
   datetime now = TimeTradeServer();
   return now - (now % 86400);
}

datetime ServerWeekStart()
{
   datetime now = TimeTradeServer();
   MqlDateTime parts;
   TimeToStruct(now, parts);
   int daysSinceMonday = (parts.day_of_week + 6) % 7;
   return (now - (now % 86400)) - daysSinceMonday * 86400;
}

datetime ServerMonthStart()
{
   MqlDateTime parts;
   TimeToStruct(TimeTradeServer(), parts);
   parts.day = 1;
   parts.hour = 0;
   parts.min = 0;
   parts.sec = 0;
   return StructToTime(parts);
}

bool UpdateMarketRegime()
{
   datetime signalBar = iTime(_Symbol, EntryTimeframe, 1);
   double adx[2], atr[2], upper[2], lower[2];
   if(CopyBuffer(hADX, 0, 1, 2, adx) != 2 || CopyBuffer(hATR, 0, 1, 2, atr) != 2 ||
      CopyBuffer(hBB, 1, 1, 2, upper) != 2 || CopyBuffer(hBB, 2, 1, 2, lower) != 2)
   {
      marketState = "HIGH_VOLATILITY";
      tradingStatus = "INDICATORS_NOT_READY";
      newEntriesAllowed = false;
      return false;
   }

   double rangeHigh = -DBL_MAX;
   double rangeLow = DBL_MAX;
   for(int shift = 2; shift <= RangeLookbackBars + 1; shift++)
   {
      rangeHigh = MathMax(rangeHigh, iHigh(_Symbol, EntryTimeframe, shift));
      rangeLow = MathMin(rangeLow, iLow(_Symbol, EntryTimeframe, shift));
   }
   if(rangeHigh <= rangeLow || atr[0] <= 0)
      return false;

   double width = rangeHigh - rangeLow;
   double bbWidth = upper[0] - lower[0];
   currentADX = adx[0];
   currentATR = atr[0];
   bool actualRange = width <= atr[0] * RangeMaxWidthATR && bbWidth <= atr[0] * RangeMaxWidthATR;
   bool extremeVolatility = atr[0] > atr[1] * ATR_MaxMultiple;
   double close = iClose(_Symbol, EntryTimeframe, 1);
   double breakoutBuffer = atr[0] * 0.10;
   bool breakout = close > rangeHigh + breakoutBuffer || close < rangeLow - breakoutBuffer;

   if(extremeVolatility)
   {
      rangeConfirmBars = 0;
      trendConfirmBars = 0;
      volatilityPauseBars = MathMax(volatilityPauseBars,3);
      if(signalBar != lastRegimeBar) { recoveryPauseBars = MathMax(recoveryPauseBars, 3); lastRegimeBar=signalBar; }
      marketState = "HIGH_VOLATILITY";
      riskBlockReason = "ATR expansion";
      if(signalBar != lastRegimeBar) { recoveryPauseBars = MathMax(recoveryPauseBars, 3); lastRegimeBar=signalBar; }
      return false;
   }
   if(adx[0] >= ADX_TrendBlock || (adx[0] > ADX_RangeMax && !actualRange) || breakout)
   {
      trendConfirmBars++;
      rangeConfirmBars = 0;
      if(trendConfirmBars < 2)
      {
         marketState = "RECOVERY_PAUSED";
         riskBlockReason = "Awaiting second breakout/trend confirmation bar";
         return false;
      }
      marketState = "TRENDING";
      riskBlockReason = "ADX/range breakout confirmation";
      if(signalBar != lastRegimeBar) { recoveryPauseBars = MathMax(recoveryPauseBars, 3); lastRegimeBar=signalBar; }
      return false;
   }
   if(recoveryPauseBars > 0)
   {
      if(signalBar != lastRegimeBar)
      {
         recoveryPauseBars--;
         lastRegimeBar = signalBar;
      }
      marketState = "RECOVERY_PAUSED";
      return false;
   }
   if(volatilityPauseBars > 0)
   {
      if(signalBar != lastRegimeBar) { volatilityPauseBars--; lastRegimeBar=signalBar; }
      marketState = "RECOVERY_PAUSED";
      return false;
   }
   if(adx[0] <= ADX_RangeMax && actualRange && !breakout)
   {
      rangeConfirmBars++;
      trendConfirmBars=0;
      if(rangeConfirmBars < 2)
      {
         marketState = "RECOVERY_PAUSED";
         riskBlockReason = "Awaiting second range confirmation bar";
         return false;
      }
      marketState = "RANGE_ACTIVE";
      riskBlockReason = "";
      return !riskLatched;
   }

   lastRegimeBar = signalBar;
   marketState = "TRENDING";
   riskBlockReason = "Range not confirmed";
   return false;
}

void LatchRisk(string reason)
{
   if(!riskLatched)
      Print(reason, ". New entries latched off until next server day/EA restart after review.");
   riskLatched = true;
   if(StringFind(reason,"daily equity drawdown") >= 0) dailyRiskLatched = true;
   if(StringFind(reason,"strategy drawdown") >= 0) strategyRiskLatched = true;
   riskBlockReason = reason;
   marketState = "RISK_LIMIT_REACHED";
   tradingStatus = "RISK_LIMIT_REACHED";
   SavePersistentState();
   if(CloseBasketOnRiskLimit)
      CloseBasket();
}

void ManageBasketRisk()
{
   double basket = BasketProfit();
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   static int previousBasketCount = 0;
   int currentBasketCount = BasketPositionCount();
   if(currentBasketCount > 0 && basketPeakEquity <= 0)
      basketPeakEquity = equity;
   if(currentBasketCount == 0 && previousBasketCount > 0)
      basketPeakEquity = equity;
   previousBasketCount = currentBasketCount;

   if(currentBasketCount == 0)
   {
      if(UseBasketTakeProfit && basketRiskLatched)
      {
         martingaleStep=0;
         closedRecoveryWins=0;
         recoveryDeficit=0;
      }
      basketRiskLatched = false;
      SavePersistentState();
      return;
   }
   if(basketPeakEquity <= 0) basketPeakEquity = equity;
   if(basketRiskLatched) return;
   if(basketPeakEquity <= 0) basketPeakEquity = equity;
   if(equity > basketPeakEquity) basketPeakEquity = equity;

   if(currentBasketCount > 0 && UseBasketDrawdown && MaxBasketDrawdownPct > 0 && basketPeakEquity > 0 &&
      (basketPeakEquity-equity)/basketPeakEquity*100.0 >= MaxBasketDrawdownPct)
   {
      LatchRisk("RISK_LIMIT_REACHED: basket peak-equity drawdown");
      if(BasketPositionCount() > 0)
      {
         tradingStatus = "CLOSING_BASKET";
         riskBlockReason = "Basket drawdown breached; closing positions";
      }
      return;
   }

   if(currentBasketCount > 0 && UseBasketTakeProfit && MaxBasketTakeProfit > 0 && basket >= MaxBasketTakeProfit)
   {
      Print("Basket target reached: ", DoubleToString(basket, 2));
      basketRiskLatched = true;
      CloseBasket();
      if(BasketPositionCount() > 0)
      {
         tradingStatus = "CLOSING_BASKET";
         riskBlockReason = "Basket target reached; waiting for close confirmation";
         return;
      }
      if(BasketPositionCount() == 0 && BasketProfit() >= BasketBreakEvenBuffer)
      {
         martingaleStep = 0;
         closedRecoveryWins = 0;
         recoveryDeficit = 0;
         basketRiskLatched = false;
         basketPeakEquity = AccountInfoDouble(ACCOUNT_EQUITY);
         tradesToday = CountEntriesSince(ServerDayStart());
         lastCountedEntryTime = TimeTradeServer();
         SavePersistentState();
      }
   }
   if(currentBasketCount > 0 && UseBasketStopLoss && MaxBasketStopLoss > 0 && basket <= -MaxBasketStopLoss)
   {
      basketRiskLatched = true;
      riskBlockReason = "RISK_LIMIT_REACHED: basket stop "+DoubleToString(basket,2);
      tradingStatus = "RISK_LIMIT_REACHED";
      Print(riskBlockReason);
      if(CloseBasketOnRiskLimit) CloseBasket();
      if(BasketPositionCount() > 0) tradingStatus = "CLOSING_BASKET";
      SavePersistentState();
   }

   if(StrategyDrawdownPct > 0 && strategyReferenceEquity > 0 &&
      (strategyReferenceEquity - equity) / strategyReferenceEquity * 100.0 >= StrategyDrawdownPct)
      LatchRisk("RISK_LIMIT_REACHED: strategy drawdown");

   if(UseNewsFilter && !newsFeedAvailable)
   {
      marketState = "NEWS_BLOCKED";
      tradingStatus = "NEWS_FEED_UNAVAILABLE";
   }
}

double BasketProfit()
{
   double net = 0;
   for(int i=PositionsTotal()-1; i>=0; i--)
      if(positionInfo.SelectByIndex(i) && positionInfo.Symbol()==_Symbol && positionInfo.Magic()==MagicNumber)
         net += positionInfo.Profit() + positionInfo.Swap() + positionInfo.Commission();
   return net;
}

double BasketVolume()
{
   double volume = 0;
   for(int i=PositionsTotal()-1; i>=0; i--)
      if(positionInfo.SelectByIndex(i) && positionInfo.Symbol()==_Symbol && positionInfo.Magic()==MagicNumber)
         volume += positionInfo.Volume();
   return volume;
}

int BasketPositionCount()
{
   int count=0;
   for(int i=PositionsTotal()-1;i>=0;i--)
      if(positionInfo.SelectByIndex(i) && positionInfo.Symbol()==_Symbol && positionInfo.Magic()==MagicNumber) count++;
   return count;
}

void CloseBasket()
{
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol()!=_Symbol ||
         (positionInfo.Magic()!=MagicNumber && !ManageManualPositions)) continue;
      ulong ticket = positionInfo.Ticket();
      if(!trade.PositionClose(ticket) || !IsTradeRetcodeSuccessful())
         Print("Basket close failed ticket=",ticket," retcode=",trade.ResultRetcode()," ",trade.ResultRetcodeDescription());
   }
}

bool IsTradeRetcodeSuccessful()
{
   uint code = trade.ResultRetcode();
   return code == TRADE_RETCODE_DONE || code == TRADE_RETCODE_DONE_PARTIAL || code == TRADE_RETCODE_PLACED;
}

void UpdateStatusPanel()
{
   if(!ShowStatusPanel) return;
   string name = statePrefix + "panel";
   double todayRealized = PeriodRealizedProfit(ServerDayStart());
   double weekRealized = PeriodRealizedProfit(ServerWeekStart());
   double monthRealized = PeriodRealizedProfit(ServerMonthStart());
   double totalRealized = PeriodRealizedProfit(strategyStartTime);
   string text = "NORTHSTAR  /  XAUUSD\n"+
      "Regime: " + marketState + "\n"+
      "New entries: " + (newEntriesAllowed ? "ALLOWED" : "BLOCKED") + "\n"+
      "Spread: " + DoubleToString(currentSpreadPoints,1) + " pt   ADX: " + DoubleToString(currentADX,1) + " ATR: " + DoubleToString(currentATR,_Digits) + "\n"+
      "Recovery: " + IntegerToString(martingaleStep) + "/" + IntegerToString(MaxMartingaleSteps) +
      "   positions/volume: " + IntegerToString(botPositionsCount) + "/" + DoubleToString(BasketVolume(),2) + "\n"+
       "Basket P/L: " + DoubleToString(BasketProfit(),2) + "   P/L day/week: " +
       DoubleToString(todayRealized,2) + "/" + DoubleToString(weekRealized,2) + "\n"+
       "P/L month/total: " + DoubleToString(monthRealized,2) + "/" + DoubleToString(totalRealized,2) + "\n"+
       "DD day/week: " +
       DoubleToString(DailyDrawdownPct(),2) + "/" + DoubleToString(PeriodDrawdownPct(weekStartEquity),2) + "%\n"+
       "DD month: " + DoubleToString(PeriodDrawdownPct(monthStartEquity),2) +
       "%   Total profit: " + DoubleToString(accountEquity-strategyReferenceEquity,2) + "\n"+
      "Block: " + (riskBlockReason=="" ? "none" : riskBlockReason);
   if(ObjectFind(0,name) < 0)
   {
      ObjectCreate(0,name,OBJ_LABEL,0,0,0);
      ObjectSetInteger(0,name,OBJPROP_CORNER,CORNER_LEFT_UPPER);
      ObjectSetInteger(0,name,OBJPROP_XDISTANCE,12);
      ObjectSetInteger(0,name,OBJPROP_YDISTANCE,22);
      ObjectSetInteger(0,name,OBJPROP_COLOR,clrWhite);
      ObjectSetInteger(0,name,OBJPROP_FONTSIZE,9);
      ObjectSetString(0,name,OBJPROP_FONT,"Consolas");
   }
   ObjectSetString(0,name,OBJPROP_TEXT,text);
}

void DeleteStatusPanel()
{
   if(statePrefix != "") ObjectDelete(0,statePrefix+"panel");
}

double iATRValue()
{
   double buffer[1];
   return CopyBuffer(hATR,0,1,1,buffer)==1 ? buffer[0] : 0;
}

double DailyDrawdownPct()
{
   return dayStartEquity > 0 ? MathMax(0,(dayStartEquity-accountEquity)/dayStartEquity*100.0) : 0;
}

double PeriodDrawdownPct(double periodStartEquity)
{
   return periodStartEquity > 0 ? MathMax(0,(periodStartEquity-accountEquity)/periodStartEquity*100.0) : 0;
}

double PeriodRealizedProfit(datetime fromTime)
{
   double total = 0;
   if(fromTime <= 0) fromTime = (strategyStartTime > 0 ? strategyStartTime : (datetime)0);
   if(!HistorySelect(fromTime, TimeTradeServer())) return 0;
   for(int i=0; i<HistoryDealsTotal(); i++)
   {
      ulong deal = HistoryDealGetTicket(i);
      if(deal == 0 || HistoryDealGetInteger(deal, DEAL_MAGIC) != MagicNumber ||
         HistoryDealGetString(deal, DEAL_SYMBOL) != _Symbol) continue;
      total += HistoryDealGetDouble(deal, DEAL_PROFIT) +
               HistoryDealGetDouble(deal, DEAL_COMMISSION) +
               HistoryDealGetDouble(deal, DEAL_SWAP) +
               HistoryDealGetDouble(deal, DEAL_FEE);
   }
   return total;
}

bool IsDuplicateGridLevel(ENUM_ORDER_TYPE type, double price, double distance)
{
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_NETTING)
      return botPositionsCount > 0;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
   if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol()!=_Symbol ||
      (positionInfo.Magic()!=MagicNumber && !ManageManualPositions)) continue;
      ENUM_POSITION_TYPE posType = positionInfo.PositionType();
      if((type==ORDER_TYPE_BUY && posType==POSITION_TYPE_BUY) || (type==ORDER_TYPE_SELL && posType==POSITION_TYPE_SELL))
         if(MathAbs(positionInfo.PriceOpen()-price) < distance) return true;
   }
   return false;
}

bool HasConflictingPosition(ENUM_ORDER_TYPE type)
{
   if(AllowHedgeEntries && AccountInfoInteger(ACCOUNT_MARGIN_MODE) != ACCOUNT_MARGIN_MODE_RETAIL_NETTING) return false;
   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_NETTING && botPositionsCount > 0)
   {
      double avg=0,vol=0;
      int side=GetBasketSide(avg,vol);
      if((type==ORDER_TYPE_BUY && side==POSITION_TYPE_SELL) || (type==ORDER_TYPE_SELL && side==POSITION_TYPE_BUY))
         return true; // Never reduce/reverse a netting basket as a grid recovery.
   }
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol()!=_Symbol || positionInfo.Magic()!=MagicNumber) continue;
      if((type==ORDER_TYPE_BUY && positionInfo.PositionType()==POSITION_TYPE_SELL) ||
         (type==ORDER_TYPE_SELL && positionInfo.PositionType()==POSITION_TYPE_BUY)) return true;
   }
   return false;
}

double CalculateRecoveryLot(double slDistance)
{
   double raw = InitialLotSize * MathPow(MartingaleMultiplier, MathMin(martingaleStep,MaxMartingaleSteps));
   double tickSize = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE_LOSS);
   if(tickValue <= 0) tickValue = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   if(tickSize <= 0 || tickValue <= 0 || slDistance <= 0) return 0;

   double riskCap = AccountInfoDouble(ACCOUNT_EQUITY) * MathMin(MaxRiskPerTradePct, RiskPercentage) / 100.0;
   double lossPerLot = slDistance / tickSize * tickValue;
   if(lossPerLot <= 0) return 0;
   raw = MathMin(raw, riskCap/lossPerLot);
   raw = MathMin(raw, MaxLotPerPosition);
   double remaining = MaxCombinedVolume - BasketVolume();
   if(remaining <= 0) return 0;
   raw = MathMin(raw, remaining);
   return NormalizeLotDown(raw);
}

double NormalizeLotDown(double lot)
{
   double minLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN);
   double maxLot=MathMin(SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX),MaxLotPerPosition);
   double step=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(step<=0 || minLot<=0 || lot<minLot) return 0;
   lot=MathMin(lot,maxLot);
   lot=MathFloor((lot+1e-10)/step)*step;
   int digits=2;
   if(step>=1) digits=0; else if(step>=0.1) digits=1; else if(step<0.01) digits=3;
   return lot>=minLot ? NormalizeDouble(lot,digits) : 0;
}

bool CheckMargin(ENUM_ORDER_TYPE type, double volume, double price)
{
   double required=0;
   if(!OrderCalcMargin(type,_Symbol,volume,price,required))
   {
      Print("OrderCalcMargin failed: ",GetLastError());
      return false;
   }
   double projectedRequired = 0;
   if(!OrderCalcMargin(type,_Symbol,volume,price,projectedRequired))
      return false;
   if(projectedRequired > AccountInfoDouble(ACCOUNT_MARGIN_FREE)*0.8)
   {
      riskBlockReason="RECOVERY_PAUSED: insufficient free margin";
      tradingStatus="INSUFFICIENT_MARGIN";
      return false;
   }
   if(botPositionsCount > 0 && AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_NETTING)
      projectedRequired = 0;
   double projectedMargin = AccountInfoDouble(ACCOUNT_MARGIN) + projectedRequired;
   double projectedLevel = projectedMargin > 0 ? AccountInfoDouble(ACCOUNT_EQUITY)/projectedMargin*100.0 : 0;
   if(projectedMargin >= AccountInfoDouble(ACCOUNT_EQUITY) || (projectedLevel > 0 && projectedLevel < 200.0))
   {
      riskBlockReason="RECOVERY_PAUSED: projected margin level below safety floor";
      tradingStatus="INSUFFICIENT_MARGIN";
      return false;
   }
   return true;
}

//+------------------------------------------------------------------+
double Ask() { return SymbolInfoDouble(_Symbol, SYMBOL_ASK); }
double Bid() { return SymbolInfoDouble(_Symbol, SYMBOL_BID); }

//+------------------------------------------------------------------+
double NormalizeLot(double lot)
{
   return NormalizeLotDown(lot);
}

//+------------------------------------------------------------------+
double CalculateLotSize(double slDistance)
{
   return CalculateRecoveryLot(slDistance);
}

//+------------------------------------------------------------------+
bool GetIndicators(double &rsi, double &bbUpper, double &bbLower, double &atr)
{
   double buf[];

   if(CopyBuffer(hRSI, 0, 1, 1, buf) != 1) return false;
   rsi = buf[0];

   if(CopyBuffer(hBB, 1, 1, 1, buf) != 1) return false;
   bbUpper = buf[0];

   if(CopyBuffer(hBB, 2, 1, 1, buf) != 1) return false;
   bbLower = buf[0];

   if(CopyBuffer(hATR, 0, 1, 1, buf) != 1) return false;
   atr = buf[0];

   return true;
}

//+------------------------------------------------------------------+
void ExecuteStrategy()
{
   switch(Strategy)
   {
      case STRATEGY_SIDEWAYS:
      case STRATEGY_SCALPING:
      case STRATEGY_MARTINGALE_SCALPING: ExecuteMeanReversion(); break;
      case STRATEGY_TREND:    ExecuteMeanReversion(); break;
      case STRATEGY_BREAKOUT: ExecuteMeanReversion(); break;
   }
}

//+------------------------------------------------------------------+
//| Bollinger + RSI mean reversion scalping                          |
//+------------------------------------------------------------------+
void ExecuteMeanReversion()
{
   datetime signalBarTime = iTime(_Symbol, EntryTimeframe, 1);
   if(signalBarTime <= 0 || signalBarTime == lastEvaluatedBar)
      return;
   lastEvaluatedBar = signalBarTime;

   if(botPositionsCount >= MaxConcurrentPos)
   {
      tradingStatus = "MAX_POSITIONS";
      return;
   }

   if(currentSpreadPoints > MaxSpreadPoints)
   {
      tradingStatus = "SPREAD_TOO_HIGH";
      Print("No entry: spread ", DoubleToString(currentSpreadPoints, 1),
            " points exceeds MaxSpreadPoints ", DoubleToString(MaxSpreadPoints, 1));
      return;
   }

   double rsi, bbUpper, bbLower, atr;
   if(!GetIndicators(rsi, bbUpper, bbLower, atr))
   {
      tradingStatus = "INDICATORS_NOT_READY";
      Print("No entry: indicator data unavailable. Check that tester has enough history for ", EnumToString(EntryTimeframe));
      return;
   }

   if(marketState != "RANGE_ACTIVE")
   {
      tradingStatus = "RECOVERY_PAUSED";
      return;
   }

   double close1 = iClose(_Symbol, EntryTimeframe, 1);
   double high1  = iHigh(_Symbol, EntryTimeframe, 1);
   double low1   = iLow(_Symbol, EntryTimeframe, 1);
   if(close1 <= 0 || high1 <= 0 || low1 <= 0 || atr <= 0)
   {
      tradingStatus = "PRICE_DATA_NOT_READY";
      return;
   }

   double minStop = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
   double slDistance = MathMax(atr * ATR_SL_Multiplier, minStop + _Point);
   double tpDistance = slDistance * RewardRiskRatio;

   int    digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   // Check Martingale grid entry conditions first
   bool martingaleBuyTriggered = false;
   bool martingaleSellTriggered = false;
   bool useMartingaleLot = false;

   if(EnableMartingale)
   {
      martingaleBuyTriggered = ShouldOpenBuyGrid(Ask());
      martingaleSellTriggered = ShouldOpenSellGrid(Bid());
   }

   ENUM_ORDER_TYPE orderType = ORDER_TYPE_BUY;
   bool buySignal = false;
   bool sellSignal = false;

   if(EnableMartingale && martingaleBuyTriggered)
   {
      orderType = ORDER_TYPE_BUY;
      useMartingaleLot = true;
      buySignal = true;
      tradingStatus = "MARTINGALE_BUY_GRID";
   }
   else if(EnableMartingale && martingaleSellTriggered)
   {
      orderType = ORDER_TYPE_SELL;
      useMartingaleLot = true;
      sellSignal = true;
      tradingStatus = "MARTINGALE_SELL_GRID";
   }
   else
   {
      double open1 = iOpen(_Symbol, EntryTimeframe, 1);
      bool bullishCandle = (close1 > open1);
      bool bearishCandle = (close1 < open1);
      bool rangeSignalBuy = low1 <= bbLower && rsi <= MinRSIBuy && bullishCandle;
      bool rangeSignalSell = high1 >= bbUpper && rsi >= MaxRSISell && bearishCandle;
      buySignal = rangeSignalBuy;
      sellSignal = rangeSignalSell;

      double gridDistance = MathMax(GridMinPoints * _Point,
                                MathMin(GridMaxPoints * _Point, atr * GridATRMultiplier));
      double avgEntry = 0;
      double basketVolume = 0;
      int basketSide = GetBasketSide(avgEntry, basketVolume);
      if(botPositionsCount > 0)
      {
         buySignal = (basketSide == POSITION_TYPE_BUY && Ask() <= avgEntry - gridDistance && rangeSignalBuy);
         sellSignal = (basketSide == POSITION_TYPE_SELL && Bid() >= avgEntry + gridDistance && rangeSignalSell);
      }
      else if(basketSide == -2)
      {
         tradingStatus = "RECOVERY_PAUSED";
         riskBlockReason = "Mixed basket sides detected; no new orders";
         return;
      }

      if(!buySignal && !sellSignal)
      {
         tradingStatus = "WAITING_FOR_SIGNAL";
         Print("No entry: reversal conditions not met on completed bar.");
         return;
      }
      orderType = buySignal ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   }

   if(orderType == ORDER_TYPE_BUY || orderType == ORDER_TYPE_SELL)
   {
      if(HasConflictingPosition(orderType))
      {
         tradingStatus = "RECOVERY_PAUSED";
         riskBlockReason = "Conflicting exposure exists";
         return;
      }
      double orderPrice = (orderType == ORDER_TYPE_BUY ? Ask() : Bid());
      if(IsDuplicateGridLevel(orderType, orderPrice, MathMax(GridMinPoints * _Point, _Point * 2)))
      {
         tradingStatus = "DUPLICATE_GRID_LEVEL";
         return;
      }
      if(useMartingaleLot)
      {
         int currentBasketCount = (orderType == ORDER_TYPE_BUY) ? CountBuyBasketOrders() : CountSellBasketOrders();
         lot = CalculateMartingaleLot(currentBasketCount);
         if(lot <= 0)
         {
            tradingStatus = "RISK_BELOW_MIN_LOT";
            return;
         }
      }
      else if(lot <= 0)
      {
         lot = CalculateRecoveryLot(slDistance);
         if(lot <= 0)
         {
            tradingStatus = "RISK_BELOW_MIN_LOT";
            return;
         }
      }
      if(!CheckMargin(orderType, lot, orderPrice)) return;

      bool basketPosition = botPositionsCount > 0 || !UsePerPositionStops;
      double sl = basketPosition ? 0 : NormalizeDouble(orderType == ORDER_TYPE_BUY ? orderPrice - slDistance : orderPrice + slDistance, digits);
      double tp = basketPosition ? 0 : NormalizeDouble(orderType == ORDER_TYPE_BUY ? orderPrice + tpDistance : orderPrice - tpDistance, digits);
      if(!ValidateStops(orderType, orderPrice, sl, tp))
      {
         tradingStatus = "INVALID_STOPS";
         riskBlockReason = "Broker stop/freeze distance exceeds configured stop";
         Print(riskBlockReason);
         return;
      }
      if(!TradingAllowed()) return;

      bool sent = buySignal
         ? trade.Buy(lot, _Symbol, 0, sl, tp, "Martingale buy grid")
         : trade.Sell(lot, _Symbol, 0, sl, tp, "Martingale sell grid");
      if(sent && IsTradeRetcodeSuccessful() && ConfirmPositionResult(orderType, lot))
   {
   lastTradeTime = TimeCurrent();
   tradesToday++;
   tradingStatus = "TRADING";
   Print(buySignal ? "BUY" : "SELL", " confirmed deal=", trade.ResultDeal(),
         " lot=", lot, " step=", martingaleStep, " sl=", sl, " tp=", tp,
         " retcode=", trade.ResultRetcodeDescription());
   SavePersistentState();
   }
   else
   {
      tradingStatus = "ORDER_REJECTED";
      Print("Order rejected/uncertain. sent=",sent," retcode=", trade.ResultRetcode(), " ", trade.ResultRetcodeDescription(),
            " volume=", lot, " price=", orderPrice, " sl=", sl, " tp=", tp);
   }
   }
   else
   {
      tradingStatus = "WAITING_FOR_SIGNAL";
      Print("No entry: reversal conditions not met on completed bar.");
   }
}

int GetBasketSide(double &averageEntry, double &volume)
{
   double weightedPrice = 0;
   volume = 0;
   int side = -1;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol()!=_Symbol || positionInfo.Magic()!=MagicNumber) continue;
      int currentSide = (int)positionInfo.PositionType();
      if(side < 0) side = currentSide;
      if(currentSide != side) return -2; // mixed hedge baskets are not recovered
      weightedPrice += positionInfo.PriceOpen() * positionInfo.Volume();
      volume += positionInfo.Volume();
   }
   averageEntry = volume > 0 ? weightedPrice / volume : 0;
   return side;
}

bool TradingAllowed()
{
   // Tester uses simulated trade permissions, not the terminal toolbar state.
   if(MQLInfoInteger(MQL_TESTER))
      return true;

   if(!MQLInfoInteger(MQL_TRADE_ALLOWED) || !TerminalInfoInteger(TERMINAL_TRADE_ALLOWED))
   {
      tradingStatus = "TRADING_NOT_ALLOWED";
      Print("Trading blocked: enable Algo Trading and allow automated trading in EA properties.");
      return false;
   }
   if(!AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) || !AccountInfoInteger(ACCOUNT_TRADE_EXPERT))
   {
      tradingStatus = "ACCOUNT_TRADING_NOT_ALLOWED";
      Print("Trading blocked by account/broker permissions.");
      return false;
   }
   return true;
}

bool ValidateStops(ENUM_ORDER_TYPE type, double price, double sl, double tp)
{
   double minDistance = MathMax((double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL),
                                (double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_FREEZE_LEVEL)) * _Point;
   if(type == ORDER_TYPE_BUY)
      return (sl <= 0 || price-sl >= minDistance) && (tp <= 0 || tp-price >= minDistance);
   return (sl <= 0 || sl-price >= minDistance) && (tp <= 0 || price-tp >= minDistance);
}

bool ConfirmPositionResult(ENUM_ORDER_TYPE type, double requestedVolume)
{
   if(trade.ResultDeal() <= 0 || !HistoryDealSelect(trade.ResultDeal()))
      return false;
   double filled = HistoryDealGetDouble(trade.ResultDeal(), DEAL_VOLUME);
   if(filled <= 0)
      return false;

   if(AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_HEDGING)
   {
      if(!positionInfo.SelectByTicket(trade.ResultOrder()))
      {
         // Deal ticket and position ticket are not guaranteed identical; scan
         // positions by symbol/magic/side and recent open time as confirmation.
         for(int i=PositionsTotal()-1;i>=0;i--)
         {
            if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol()!=_Symbol || positionInfo.Magic()!=MagicNumber) continue;
      bool sideMatches = (type==ORDER_TYPE_BUY && positionInfo.PositionType()==POSITION_TYPE_BUY) ||
                               (type==ORDER_TYPE_SELL && positionInfo.PositionType()==POSITION_TYPE_SELL);
            if(sideMatches && positionInfo.Time() >= (datetime)HistoryDealGetInteger(trade.ResultDeal(),DEAL_TIME) &&
               positionInfo.Volume() + SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP) >= filled)
               return true;
         }
         Print("Order deal exists but matching position not confirmed; requested volume=",requestedVolume,
               " filled=",filled," order=",trade.ResultOrder());
         return false;
      }
   }
   return true;
}

//+------------------------------------------------------------------+
//| Trail stop once trade is in profit                               |
//+------------------------------------------------------------------+
void ManageTrailingStops()
{
   if(!UseTrailingStop) return;
   double atrBuf[];
   double atr = 0;
   if(CopyBuffer(hATR, 0, 0, 1, atrBuf) > 0)
      atr = atrBuf[0];
   if(atr <= 0) return;

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double brokerDistance = MathMax((double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL),
                                   (double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_FREEZE_LEVEL))*_Point;
   double trailDist = MathMax(MathMax(GridMinPoints * _Point,brokerDistance+_Point),
                              MathMin(GridMaxPoints * _Point, atr * TrailingATRMult));

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i)) continue;
      // Automatic trailing remains limited to positions opened by this EA.
      if(positionInfo.Magic() != MagicNumber && !ManageManualPositions) continue;
      if(positionInfo.Symbol() != _Symbol) continue;

      double open  = positionInfo.PriceOpen();
      double sl    = positionInfo.StopLoss();
      double tp    = positionInfo.TakeProfit();
      double price = positionInfo.PriceCurrent();
      double initRisk = MathAbs(open - sl);
      if(initRisk <= 0) initRisk = iATRValue() * ATR_SL_Multiplier;

      if(initRisk <= 0) continue;

      if(UseBreakEven)
      {
         double moved = (positionInfo.PositionType()==POSITION_TYPE_BUY ? price-open : open-price);
         if(moved >= initRisk * BreakEvenAtR)
         {
            double breakEvenSL = NormalizeDouble(open,digits);
            if(positionInfo.PositionType()==POSITION_TYPE_BUY && (sl==0 || sl<breakEvenSL))
               trade.PositionModify(positionInfo.Ticket(),breakEvenSL,tp);
            else if(positionInfo.PositionType()==POSITION_TYPE_SELL && (sl==0 || sl>breakEvenSL))
               trade.PositionModify(positionInfo.Ticket(),breakEvenSL,tp);
         }
      }

      if(positionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         double profitDist = price - open;
         if(profitDist < initRisk * TrailingStartRR) continue;

         double newSL = NormalizeDouble(price - trailDist, digits);
         if(newSL > open && (sl == 0 || newSL > sl + _Point))
            trade.PositionModify(positionInfo.Ticket(), newSL, tp);
      }
      else if(positionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         double profitDist = open - price;
         if(profitDist < initRisk * TrailingStartRR) continue;

         double newSL = NormalizeDouble(price + trailDist, digits);
         if(newSL < open && (sl == 0 || newSL < sl - _Point))
            trade.PositionModify(positionInfo.Ticket(), newSL, tp);
      }
   }
}

//+------------------------------------------------------------------+
//| Send heartbeat                                                   |
//+------------------------------------------------------------------+
string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return s;
}

void OnHeartbeat()
{
   // Strategy Tester does not allow WebRequest. HTTP is only needed for
   // dashboard synchronization during live/demo operation.
   if(MQLInfoInteger(MQL_TESTER)) return;

   UpdateAccountData();

   string strategyName = "SIDEWAYS";
   if(Strategy == STRATEGY_TREND) strategyName = "TREND";
   else if(Strategy == STRATEGY_SCALPING) strategyName = "SCALPING";
   else if(Strategy == STRATEGY_BREAKOUT) strategyName = "BREAKOUT";
   else if(Strategy == STRATEGY_MARTINGALE_SCALPING) strategyName = "MARTINGALE_SCALPING";

   string payload = "{";
   payload += "\"apiKey\":\"" + JsonEscape(ApiKey) + "\",";
   payload += "\"timestamp\":" + IntegerToString((int)TimeCurrent()) + ",";
   payload += "\"state\":{";
   payload += "\"status\":\"" + eaStatus + "\",";
   payload += "\"tradingStatus\":\"" + tradingStatus + "\",";
   payload += "\"activeStrategy\":\"" + strategyName + "\",";
   payload += "\"accountBalance\":" + DoubleToString(accountBalance, 2) + ",";
   payload += "\"accountEquity\":" + DoubleToString(accountEquity, 2) + ",";
   payload += "\"marginLevel\":" + DoubleToString(marginLevel, 2) + ",";
   payload += "\"freeMargin\":" + DoubleToString(freeMargin, 2) + ",";
   payload += "\"openPositionsCount\":" + IntegerToString(openPositionsCount) + ",";
   payload += "\"floatingPnl\":" + DoubleToString(floatingPnl, 2) + ",";
   payload += "\"dailyRealizedPnl\":" + DoubleToString(dailyRealizedPnl, 2) + ",";
   payload += "\"currentSpread\":" + DoubleToString(currentSpreadPoints, 1) + ",";
   payload += "\"marketState\":\"" + marketState + "\",";
   payload += "\"accountNumber\":\"" + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
    payload += "\"server\":\"" + JsonEscape(AccountInfoString(ACCOUNT_SERVER)) + "\",";
    payload += "\"dailyDrawdownPercent\":" + DoubleToString(DailyDrawdownPct(),2) + ",";
    payload += "\"weeklyDrawdownPercent\":" + DoubleToString(PeriodDrawdownPct(weekStartEquity),2) + ",";
    payload += "\"monthlyDrawdownPercent\":" + DoubleToString(PeriodDrawdownPct(monthStartEquity),2) + ",";
    payload += "\"dailyProfit\":" + DoubleToString(PeriodRealizedProfit(ServerDayStart()),2) + ",";
    payload += "\"weeklyProfit\":" + DoubleToString(PeriodRealizedProfit(ServerWeekStart()),2) + ",";
    payload += "\"monthlyProfit\":" + DoubleToString(PeriodRealizedProfit(ServerMonthStart()),2) + ",";
    payload += "\"totalProfit\":" + DoubleToString(PeriodRealizedProfit(strategyStartTime),2) + ",";
    payload += "\"recoveryLevel\":" + IntegerToString(martingaleStep) + ",";
    payload += "\"newEntriesAllowed\":" + (newEntriesAllowed ? "true" : "false") + ",";
    payload += "\"riskBlockReason\":\"" + JsonEscape(riskBlockReason) + "\"";
   payload += "},";

   payload += "\"positions\":[";
   bool firstPos = true;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i)) continue;

      // Report every open position on the account, including manual trades.

      if(!firstPos) payload += ",";

      bool isOurs = (positionInfo.Magic() == MagicNumber);
      string direction = (positionInfo.PositionType() == POSITION_TYPE_BUY ? "BUY" : "SELL");
      payload += "{";
      payload += "\"ticket\":\"" + IntegerToString((long)positionInfo.Ticket()) + "\",";
      payload += "\"symbol\":\"" + positionInfo.Symbol() + "\",";
      payload += "\"direction\":\"" + direction + "\",";
      payload += "\"strategy\":\"" + (isOurs ? strategyName : "MANUAL") + "\",";
      payload += "\"entryPrice\":" + DoubleToString(positionInfo.PriceOpen(), 5) + ",";
      payload += "\"entryTime\":" + IntegerToString((int)positionInfo.Time()) + ",";
      payload += "\"currentPrice\":" + DoubleToString(positionInfo.PriceCurrent(), 5) + ",";
      payload += "\"lotSize\":" + DoubleToString(positionInfo.Volume(), 2) + ",";
      payload += "\"stopLoss\":" + DoubleToString(positionInfo.StopLoss(), 5) + ",";
      payload += "\"takeProfit\":" + DoubleToString(positionInfo.TakeProfit(), 5) + ",";
      payload += "\"floatingPnl\":" + DoubleToString(positionInfo.Profit() + positionInfo.Swap() + positionInfo.Commission(), 2) + ",";
      payload += "\"riskEstimate\":0,";
      payload += "\"magicNumber\":" + IntegerToString(positionInfo.Magic());
      payload += "}";

      firstPos = false;
   }
   payload += "]}";

   if(SendJson("POST", BackendURL + "/api/mt5/heartbeat", payload, "heartbeat"))
   {
      eaStatus = "RUNNING";
   }
}

//+------------------------------------------------------------------+
bool SendJson(string method, string url, string payload, string label)
{
   uchar data[], result[];
   string reqHeaders = "Content-Type: application/json\r\nX-Api-Key: " + ApiKey + "\r\n";
   string resHeaders = "";

   int len = StringToCharArray(payload, data, 0, -1, CP_UTF8) - 1;
   if(len < 0) len = 0;
   ArrayResize(data, len);

   ResetLastError();
   int res = WebRequest(method, url, reqHeaders, 5000, data, result, resHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
      {
         Print("ERROR: WebRequest blocked (", label, "). Add '", BackendURL,
               "' to Tools -> Options -> Expert Advisors -> Allow WebRequest URLs");
      }
      else
      {
         Print("ERROR: ", label, " failed. Error code: ", err);
      }
      return false;
   }

   if(res != 200)
   {
      Print("WARN: ", label, " returned HTTP ", res);
      if(res == 401) eaStatus = "AUTH_ERROR";
   }

   return (res == 200);
}

//+------------------------------------------------------------------+
//| Report a closed trade to the backend                             |
//+------------------------------------------------------------------+
void ReportTrade(string direction, double price, double lot, double sl, double tp, string reason)
{
   string payload = "{";
   payload += "\"apiKey\":\"" + JsonEscape(ApiKey) + "\",";
   payload += "\"trades\":[{";
   payload += "\"ticket\":\"" + IntegerToString((long)TimeCurrent()) + "\",";
   payload += "\"symbol\":\"" + _Symbol + "\",";
   payload += "\"direction\":\"" + direction + "\",";
   payload += "\"strategy\":\"" + EnumToString(Strategy) + "\",";
   payload += "\"entryPrice\":" + DoubleToString(price, 5) + ",";
   payload += "\"entryTime\":" + IntegerToString((int)TimeCurrent()) + ",";
   payload += "\"lotSize\":" + DoubleToString(lot, 2) + ",";
   payload += "\"stopLoss\":" + DoubleToString(sl, 5) + ",";
   payload += "\"takeProfit\":" + DoubleToString(tp, 5) + ",";
   payload += "\"entryReason\":\"" + JsonEscape(reason) + "\"";
   payload += "}]}";

   SendJson("POST", BackendURL + "/api/mt5/trade-update/" + ApiKey, payload, "trade-update");
}

//+------------------------------------------------------------------+
//| Poll and execute backend commands                                |
//+------------------------------------------------------------------+
void ProcessCommands()
{
   // Strategy Tester does not allow WebRequest.
   if(MQLInfoInteger(MQL_TESTER)) return;

   uchar data[], result[];
   string reqHeaders = "Content-Type: application/json\r\nX-Api-Key: " + ApiKey + "\r\n";
   string resHeaders = "";
   string url = BackendURL + "/api/mt5/commands/" + ApiKey;

   ResetLastError();
   int res = WebRequest("GET", url, reqHeaders, 5000, data, result, resHeaders);

   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014)
         Print("ERROR: WebRequest blocked (commands). Add '", BackendURL,
               "' to Tools -> Options -> Expert Advisors -> Allow WebRequest URLs");
      return;
   }

   if(res != 200) return;

   string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);

   if(StringFind(response, "\"type\"") < 0)
      return;

   // Walk every command object in the returned array and execute each one.
   int commandsKey = StringFind(response, "\"commands\"");
   if(commandsKey < 0) return;
   int cursor = StringFind(response, "[", commandsKey);
   if(cursor < 0) return;
   cursor++;
   int guard  = 0;

   while(guard++ < 50)
   {
      int objStart = StringFind(response, "{", cursor);
      if(objStart < 0) break;

      int objEnd = FindMatchingBrace(response, objStart);
      if(objEnd < 0) break;

      string obj = StringSubstr(response, objStart, objEnd - objStart + 1);
      cursor = objEnd + 1;

      string cmdId   = ExtractJsonString(obj, "id");
      string cmdType = ExtractJsonString(obj, "type");
      string params  = ExtractJsonObject(obj, "params");

      if(cmdType == "") continue;

      Print("Command received: ", cmdType, "  id=", cmdId);

      bool   ok     = false;
      string detail = "";

      if(cmdType == "CLOSE_POSITION")
      {
         ulong ticket = (ulong)StringToInteger(ExtractJsonString(params, "ticket"));
         ok     = ClosePositionByTicket(ticket);
         detail = "ticket=" + IntegerToString((long)ticket);
      }
      else if(cmdType == "MODIFY_SL_TP")
      {
         ulong  ticket = (ulong)StringToInteger(ExtractJsonString(params, "ticket"));
         double newSL  = StringToDouble(ExtractJsonNumber(params, "stopLoss"));
         double newTP  = StringToDouble(ExtractJsonNumber(params, "takeProfit"));
         ok     = ModifyPositionSLTP(ticket, newSL, newTP);
         detail = "ticket=" + IntegerToString((long)ticket) +
                  " sl=" + DoubleToString(newSL, 5) +
                  " tp=" + DoubleToString(newTP, 5);
      }
      else if(cmdType == "PAUSE")          { PauseTrading();  ok = true; }
      else if(cmdType == "RESUME")         { ResumeTrading(); ok = true; }
      else if(cmdType == "STOP_EA")        { eaStatus = "STOPPED"; tradingEnabled = false; ok = true; }
      else if(cmdType == "CLOSE_ALL" || cmdType == "CLOSE_ALL_EA") { CloseAllPositions(); ok = true; }
      else if(cmdType == "EMERGENCY_STOP") { EmergencyStop(); ok = true; }
      else
      {
         Print("WARN: Unsupported command type: ", cmdType);
         detail = "unsupported";
      }

      if(cmdId != "")
         ReportCommandResult(cmdId, ok ? "EXECUTED" : "FAILED", detail);
   }
}

//+------------------------------------------------------------------+
//| Index of the brace that closes the one at 'start'                |
//+------------------------------------------------------------------+
int FindMatchingBrace(string s, int start)
{
   int depth = 0;
   int len   = StringLen(s);

   for(int i = start; i < len; i++)
   {
      ushort ch = StringGetCharacter(s, i);
      if(ch == '{') depth++;
      else if(ch == '}')
      {
         depth--;
         if(depth == 0) return i;
      }
   }
   return -1;
}

//+------------------------------------------------------------------+
//| Minimal JSON helpers for flat command payloads                   |
//+------------------------------------------------------------------+
string ExtractJsonString(string json, string key)
{
   string needle = "\"" + key + "\"";
   int p = StringFind(json, needle);
   if(p < 0) return "";

   int colon = StringFind(json, ":", p + StringLen(needle));
   if(colon < 0) return "";

   int q1 = StringFind(json, "\"", colon + 1);
   if(q1 < 0) return "";

   int q2 = StringFind(json, "\"", q1 + 1);
   if(q2 < 0) return "";

   return StringSubstr(json, q1 + 1, q2 - q1 - 1);
}

string ExtractJsonObject(string json, string key)
{
   string needle = "\"" + key + "\"";
   int p = StringFind(json, needle);
   if(p < 0) return "";

   int colon = StringFind(json, ":", p + StringLen(needle));
   if(colon < 0) return "";

   int start = StringFind(json, "{", colon + 1);
   if(start < 0) return "";

   int end = FindMatchingBrace(json, start);
   if(end < 0) return "";

   return StringSubstr(json, start, end - start + 1);
}

string ExtractJsonNumber(string json, string key)
{
   string needle = "\"" + key + "\"";
   int p = StringFind(json, needle);
   if(p < 0) return "0";

   int colon = StringFind(json, ":", p + StringLen(needle));
   if(colon < 0) return "0";

   // Ignore a same-named field inside a nested params object when the
   // requested key belongs to another command section.

   int i   = colon + 1;
   int len = StringLen(json);

   while(i < len)
   {
      ushort ch = StringGetCharacter(json, i);
      if(ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n') break;
      i++;
   }

   int start = i;
   while(i < len)
   {
      ushort ch = StringGetCharacter(json, i);
      if((ch >= '0' && ch <= '9') || ch == '-' || ch == '+' || ch == '.' || ch == 'e' || ch == 'E')
         i++;
      else
         break;
   }

   if(i == start) return "0";
   return StringSubstr(json, start, i - start);
}

//+------------------------------------------------------------------+
//| Report command outcome back to the backend                       |
//+------------------------------------------------------------------+
void ReportCommandResult(string commandId, string status, string detail)
{
   string payload = "{";
   payload += "\"commandId\":\"" + JsonEscape(commandId) + "\",";
   payload += "\"status\":\"" + status + "\",";
   payload += "\"result\":{\"detail\":\"" + JsonEscape(detail) + "\"}";
   payload += "}";

   SendJson("POST", BackendURL + "/api/mt5/command-result/" + ApiKey, payload, "command-result");
}

//+------------------------------------------------------------------+
bool ClosePositionByTicket(ulong ticket)
{
   if(!positionInfo.SelectByTicket(ticket))
   {
      Print("Position not found: ", ticket);
      return false;
   }
   if(positionInfo.Symbol() != _Symbol ||
      (positionInfo.Magic() != MagicNumber && !AllowManualPositionControl))
   {
      Print("Close rejected: ticket outside configured symbol/magic scope: ",ticket);
      return false;
   }
   if(trade.PositionClose(ticket))
   {
      bool ok = IsTradeRetcodeSuccessful();
      if(ok)
      {
         if(positionInfo.SelectByTicket(ticket)) ok = false;
         else
         {
            for(int i=PositionsTotal()-1; i>=0; i--)
               if(positionInfo.SelectByIndex(i) && positionInfo.Ticket()==ticket) ok=false;
         }
      }
      if(ok)
      {
         lastProcessedPositionId = 0;
         if(UseBasketTakeProfit && BasketPositionCount()==0 && BasketProfit()>=BasketBreakEvenBuffer)
         {
            martingaleStep=0;
            recoveryDeficit=0;
            closedRecoveryWins=0;
            basketRiskLatched=false;
         }
         SavePersistentState();
      }
      if(!ok) tradingStatus = "CLOSE_UNCONFIRMED";
      Print("Position close ticket=",ticket," confirmed=",ok," retcode=",trade.ResultRetcodeDescription());
      return ok;
   }
   Print("Close failed: ", ticket, " ", trade.ResultRetcodeDescription());
   return false;
}

//+------------------------------------------------------------------+
bool ModifyPositionSLTP(ulong ticket, double newSL, double newTP)
{
   if(!positionInfo.SelectByTicket(ticket))
   {
      Print("Position not found: ", ticket);
      return false;
   }
   if(positionInfo.Symbol() != _Symbol ||
      (positionInfo.Magic() != MagicNumber && !AllowManualPositionControl))
   {
      Print("Modify rejected: ticket outside configured symbol/magic scope: ",ticket);
      return false;
   }
   // A zero value means that field was omitted: preserve the current value.
   if(newSL == 0) newSL = positionInfo.StopLoss();
   if(newTP == 0) newTP = positionInfo.TakeProfit();
   ENUM_ORDER_TYPE positionSide = positionInfo.PositionType()==POSITION_TYPE_BUY ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
   bool sltpValid = true;
   double minDistance = MathMax((double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_STOPS_LEVEL),
                                (double)SymbolInfoInteger(_Symbol,SYMBOL_TRADE_FREEZE_LEVEL))*_Point;
   if(positionSide==ORDER_TYPE_BUY)
      sltpValid = (newSL==0 || (newSL<positionInfo.PriceCurrent() && positionInfo.PriceCurrent()-newSL>=minDistance)) &&
                  (newTP==0 || (newTP>positionInfo.PriceCurrent() && newTP-positionInfo.PriceCurrent()>=minDistance));
   else
      sltpValid = (newSL==0 || (newSL>positionInfo.PriceCurrent() && newSL-positionInfo.PriceCurrent()>=minDistance)) &&
                  (newTP==0 || (newTP<positionInfo.PriceCurrent() && positionInfo.PriceCurrent()-newTP>=minDistance));
   if(!sltpValid)
   {
      Print("Modify rejected: new SL/TP violates broker stop or freeze distance for ticket ",ticket);
      return false;
   }

   if(trade.PositionModify(ticket, newSL, newTP))
   {
      bool ok = IsTradeRetcodeSuccessful();
      if(ok && !positionInfo.SelectByTicket(ticket)) ok = false;
      if(ok && (MathAbs(positionInfo.StopLoss()-newSL) > _Point || MathAbs(positionInfo.TakeProfit()-newTP) > _Point)) ok = false;
      Print("Position modify ticket=",ticket," confirmed=",ok," retcode=",trade.ResultRetcodeDescription());
      return ok;
   }
   Print("Modify failed: ", ticket, " ", trade.ResultRetcodeDescription());
   return false;
}

//+------------------------------------------------------------------+
void CloseAllPositions()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(positionInfo.SelectByIndex(i) && positionInfo.Symbol() == _Symbol &&
         (positionInfo.Magic() == MagicNumber || AllowManualPositionControl))
         trade.PositionClose(positionInfo.Ticket());
   }
   Print("All positions closed");
}

//+------------------------------------------------------------------+
void PauseTrading()
{
   tradingEnabled = false;
   tradingStatus  = "PAUSED";
   Print("Trading paused");
}

void ResumeTrading()
{
   tradingEnabled = true;
   tradingStatus  = "WAITING_FOR_SIGNAL";
   Print("Trading resumed");
}

void EmergencyStop()
{
   eaStatus       = "STOPPED";
   tradingEnabled = false;
   if(CloseBasketOnRiskLimit) CloseBasket();
   Print("EMERGENCY STOP");
   OnHeartbeat();
}

//+------------------------------------------------------------------+
//| Martingale Grid Calculation Functions                             |
//+------------------------------------------------------------------+

int CountBuyBasketOrders()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_BUY) count++;
   }
   return count;
}

int CountSellBasketOrders()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_SELL) count++;
   }
   return count;
}

double GetBuyBasketProfit()
{
   double profit = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_BUY)
         profit += positionInfo.Profit() + positionInfo.Swap() + positionInfo.Commission();
   }
   return profit;
}

double GetSellBasketProfit()
{
   double profit = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_SELL)
         profit += positionInfo.Profit() + positionInfo.Swap() + positionInfo.Commission();
   }
   return profit;
}

double CalculateMartingaleLot(int currentBasketCount)
{
   double rawLot = InitialLot * MathPow(LotMultiplier, currentBasketCount);
   rawLot = MathMin(rawLot, MaxLotPerOrder);
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   if(step <= 0 || minLot <= 0) return 0;
   rawLot = MathFloor((rawLot + 1e-10) / step) * step;
   rawLot = MathMax(rawLot, minLot);
   return NormalizeDouble(rawLot, 2);
}

bool CheckBasketVolumeLimit(double newLotSize, bool isBuy)
{
   double currentVolume = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if((isBuy && positionInfo.PositionType() == POSITION_TYPE_BUY) || (!isBuy && positionInfo.PositionType() == POSITION_TYPE_SELL))
         currentVolume += positionInfo.Volume();
   }
   if(currentVolume + newLotSize > MaxBasketLots)
   {
      Print("MARTINGALE: Basket volume limit reached.");
      return false;
   }
   return true;
}

double GetGridStepDistance()
{
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(point <= 0) return 0;
   return GridStepPoints * point;
}

bool IsCooldownActive()
{
   if(CooldownAfterBasketCloseMinutes <= 0) return false;
   if(lastBasketCloseTime == 0) return false;
   datetime currentTime = TimeTradeServer();
   int minutesSinceClose = (int)((currentTime - lastBasketCloseTime) / 60);
   if(minutesSinceClose < CooldownAfterBasketCloseMinutes)
   {
      riskBlockReason = "COOLDOWN: " + IntegerToString(CooldownAfterBasketCloseMinutes - minutesSinceClose) + " min remaining";
      return true;
   }
   return false;
}

bool ShouldOpenBuyGrid(double currentPrice)
{
   if(!EnableMartingale || !EnableBuy) return false;
   if(IsCooldownActive()) return false;
   int maxOrders = (MaxOrders > 0) ? MaxOrders : MaxMartingaleSteps;
   int buyCount = CountBuyBasketOrders();
   if(buyCount == 0)
   {
      buyBasketReferencePrice = currentPrice;
      lastBuyGridPrice = currentPrice;
      return true;
   }
   if(buyCount >= maxOrders)
   {
      riskBlockReason = "MARTINGALE: Max BUY orders reached";
      return false;
   }
   double gridDistance = GetGridStepDistance();
   if(gridDistance <= 0) return false;
   double priceDropped = lastBuyGridPrice - currentPrice;
   if(priceDropped >= gridDistance) return true;
   return false;
}

bool ShouldOpenSellGrid(double currentPrice)
{
   if(!EnableMartingale || !EnableSell) return false;
   if(IsCooldownActive()) return false;
   int maxOrders = (MaxOrders > 0) ? MaxOrders : MaxMartingaleSteps;
   int sellCount = CountSellBasketOrders();
   if(sellCount == 0)
   {
      sellBasketReferencePrice = currentPrice;
      lastSellGridPrice = currentPrice;
      return true;
   }
   if(sellCount >= maxOrders)
   {
      riskBlockReason = "MARTINGALE: Max SELL orders reached";
      return false;
   }
   double gridDistance = GetGridStepDistance();
   if(gridDistance <= 0) return false;
   double priceRose = currentPrice - lastSellGridPrice;
   if(priceRose >= gridDistance) return true;
   return false;
}

void CloseAllBuyPositions()
{
   int closed = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_BUY)
      {
         ulong ticket = positionInfo.Ticket();
         if(trade.PositionClose(ticket)) closed++;
      }
   }
   if(closed > 0)
   {
      buyBasketReferencePrice = 0;
      lastBuyGridPrice = 0;
      lastBasketCloseTime = TimeTradeServer();
   }
}

void CloseAllSellPositions()
{
   int closed = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!positionInfo.SelectByIndex(i) || positionInfo.Symbol() != _Symbol || positionInfo.Magic() != MagicNumber) continue;
      if(positionInfo.PositionType() == POSITION_TYPE_SELL)
      {
         ulong ticket = positionInfo.Ticket();
         if(trade.PositionClose(ticket)) closed++;
      }
   }
   if(closed > 0)
   {
      sellBasketReferencePrice = 0;
      lastSellGridPrice = 0;
      lastBasketCloseTime = TimeTradeServer();
   }
}

void CheckMartingaleBasketTakeProfit()
{
   if(!EnableMartingale || BasketTakeProfitMoney <= 0) return;
   if(EnableBuy && CountBuyBasketOrders() > 0)
   {
      double buyProfit = GetBuyBasketProfit();
      if(buyProfit >= BasketTakeProfitMoney) CloseAllBuyPositions();
   }
   if(EnableSell && CountSellBasketOrders() > 0)
   {
      double sellProfit = GetSellBasketProfit();
      if(sellProfit >= BasketTakeProfitMoney) CloseAllSellPositions();
   }
}

void CheckMartingaleBasketStopLoss()
{
   if(!EnableMartingale || BasketStopLossMoney <= 0) return;
   if(EnableBuy && CountBuyBasketOrders() > 0)
   {
      double buyProfit = GetBuyBasketProfit();
      if(buyProfit <= -BasketStopLossMoney) CloseAllBuyPositions();
   }
   if(EnableSell && CountSellBasketOrders() > 0)
   {
      double sellProfit = GetSellBasketProfit();
      if(sellProfit <= -BasketStopLossMoney) CloseAllSellPositions();
   }
}

void CheckMartingaleBasketDrawdown()
{
   if(!EnableMartingale || MaxDrawdownPercent <= 0) return;
   double currentEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   static double buyPeak = 0;
   static double sellPeak = 0;
   if(EnableBuy && CountBuyBasketOrders() > 0)
   {
      if(currentEquity > buyPeak) buyPeak = currentEquity;
      if(buyPeak > 0)
      {
         double drawdownPct = ((buyPeak - currentEquity) / buyPeak) * 100.0;
         if(drawdownPct >= MaxDrawdownPercent) CloseAllBuyPositions();
      }
   }
   if(EnableSell && CountSellBasketOrders() > 0)
   {
      if(currentEquity > sellPeak) sellPeak = currentEquity;
      if(sellPeak > 0)
      {
         double drawdownPct = ((sellPeak - currentEquity) / sellPeak) * 100.0;
         if(drawdownPct >= MaxDrawdownPercent) CloseAllSellPositions();
      }
   }
}
//+------------------------------------------------------------------+
