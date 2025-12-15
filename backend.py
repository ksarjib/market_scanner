# backend.py
import os
import time
import random
import requests
import logging
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 1. Load Env Vars
load_dotenv()
API_KEY = os.getenv("FINNHUB_API_KEY")  # Ensure this is in your .env file

app = FastAPI()

# 2. CORS (Allow Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. IN-MEMORY DATABASE (Persists as long as server runs)
MOCK_DB = [
    {"symbol": "AAPL", "company_name": "Apple Inc.", "price": 228.00, "is_buy": True, "status": "SWEET SPOT", "rsi": 42, "macd": 1.2, "volume": 50000000, "sector": "Technology", "is_in_portfolio": True, "is_watched": False, "reason": "Strong support bounce"},
    {"symbol": "TSLA", "company_name": "Tesla Inc.", "price": 380.00, "is_sell": True, "status": "OVERBOUGHT", "rsi": 82, "macd": -0.5, "volume": 80000000, "sector": "Consumer Cyclical", "is_in_portfolio": False, "is_watched": True, "reason": "RSI divergence detected"},
    {"symbol": "NVDA", "company_name": "NVIDIA Corp", "price": 135.00, "is_buy": True, "status": "TRINITY BUY", "rsi": 60, "macd": 5.4, "volume": 45000000, "sector": "Technology", "is_in_portfolio": True, "is_watched": True, "reason": "AI trend continuation"},
    {"symbol": "MSFT", "company_name": "Microsoft", "price": 450.00, "is_buy": False, "is_sell": False, "status": "NEUTRAL", "rsi": 50, "macd": 0.1, "volume": 20000000, "sector": "Technology", "is_in_portfolio": False, "is_watched": True, "reason": "Consolidating"},
    {"symbol": "AMZN", "company_name": "Amazon", "price": 226.10, "is_buy": True, "status": "MOMENTUM", "rsi": 35, "macd": 0.5, "volume": 30000000, "sector": "Consumer Cyclical", "is_in_portfolio": False, "is_watched": True, "reason": "Oversold bounce likely"},
]

WHEEL_HISTORY = [
    {"id": 1, "symbol": "AMD", "type": "CSP", "date": "2025-10-15", "strike": 95, "premium": 1.20, "status": "Assigned", "expiry": "2025-11-15"},
    {"id": 2, "symbol": "AMD", "type": "CC", "date": "2025-11-20", "strike": 105, "premium": 0.85, "status": "Open", "expiry": "2025-12-20"}
]

# --- MODELS ---
class TickerAction(BaseModel):
    symbol: str
    target: str = "watchlist"  # 'portfolio' or 'watchlist'

class TradeLog(BaseModel):
    symbol: str
    type: str
    strike: float
    premium: float
    expiry: str

# --- HELPERS ---
def fetch_quote(symbol):
    logger.info(f"Fetching quote for symbol: {symbol}")
    if not API_KEY:
        logger.warning("API_KEY is not set. Cannot fetch live data.")
        return None
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={API_KEY}"
        r = requests.get(url)
        logger.info(f"Response for {symbol}: {r.status_code} - {r.text}")
        if r.status_code == 429:
            logger.warning(f"⚠️ Rate Limit hit for {symbol}")
            return None
        data = r.json()
        if data.get('c', 0) == 0:
            logger.warning(f"No valid data found for {symbol}")
            return None
        return data
    except Exception as e:
        logger.error(f"Error fetching {symbol}: {e}")
        return None

# Simplify summarize_news to sort by datetime and return top 5 news
def summarize_news(news_list):
    # Sort news by datetime in descending order
    sorted_news = sorted(news_list, key=lambda x: x.get('datetime', 0), reverse=True)

    # Return the top 5 news items as they are
    summarized_news = [
        {
            'title': news.get('headline', 'No Title'),
            'summary': news.get('summary', ''),
            'url': news.get('url', '#'),
            'source': news.get('source', 'Unknown'),
            'image': news.get('image', None),
            'datetime': news.get('datetime', 0)  # Include datetime for context
        }
        for news in sorted_news[:5]
    ]

    return summarized_news

# --- ROUTES ---

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed.")
    return {"status": "Terminal Backend Online"}

@app.get("/scan")
def scan_market(strategy: str = "MOMENTUM"):
    logger.info(f"🔄 Scanning Market... Strategy: {strategy}")
    
    for stock in MOCK_DB:
        time.sleep(0.1)
        quote = fetch_quote(stock['symbol'])
        if quote:
            stock['price'] = quote['c']
            stock['rsi'] = max(0, min(100, stock['rsi'] + (1 if quote['c'] > stock['price'] else -1) + (random.random() - 0.5)))
            stock['volume'] = int(random.random() * 1000000 + 500000)
        else:
            stock['price'] = stock['price'] * (1 + (random.random() * 0.02 - 0.01))
    
    results = [s.copy() for s in MOCK_DB]
    if strategy == "WHEEL":
        for stock in results:
            stock['wheel_suggestion'] = None
            if stock['rsi'] < 45:
                stock['wheel_suggestion'] = {
                    "type": "CSP",
                    "strike": int(stock['price'] * 0.95),
                    "expiry": "30-45 DTE",
                    "premium": round(stock['price'] * 0.02, 2),
                    "reason": f"RSI {int(stock['rsi'])} (Oversold) - Good entry for Puts"
                }
            elif stock['rsi'] > 55:
                stock['wheel_suggestion'] = {
                    "type": "CC",
                    "strike": int(stock['price'] * 1.05),
                    "expiry": "30 DTE",
                    "premium": round(stock['price'] * 0.015, 2),
                    "reason": f"RSI {int(stock['rsi'])} (High) - Harvest Premium"
                }

    logger.info("Market scan completed.")
    return {
        "data": results,
        "history": WHEEL_HISTORY,
        "settings": {"ignored_sections": []}
    }

@app.get("/search")
def search_ticker(q: str):
    logger.info(f"Searching for ticker: {q}")
    if not API_KEY:
        logger.warning("API_KEY is not set. Cannot perform search.")
        return []
    try:
        r = requests.get(f"https://finnhub.io/api/v1/search?q={q}&token={API_KEY}")
        data = r.json()
        results = [
            {"symbol": item["displaySymbol"], "name": item["description"]}
            for item in data.get("result", [])
            if "." not in item["displaySymbol"]
        ][:10]
        logger.info(f"Search results: {results}")
        return results
    except Exception as e:
        logger.error(f"Error during search: {e}")
        return []

@app.post("/ticker")
def add_ticker(action: TickerAction):
    logger.info(f"Adding ticker: {action.symbol} to {action.target}")
    sym = action.symbol.upper()
    existing = next((s for s in MOCK_DB if s["symbol"] == sym), None)
    
    if not existing:
        quote = fetch_quote(sym)
        price = quote['c'] if quote else (random.random() * 100 + 20)
        new_stock = {
            "symbol": sym, "company_name": sym, "price": price,
            "is_buy": False, "is_sell": False, "status": "WATCHING",
            "rsi": 50, "macd": 0, "volume": 0, "sector": "Unknown",
            "is_in_portfolio": False, "is_watched": False,
            "reason": "Added to list"
        }
        MOCK_DB.append(new_stock)
        existing = new_stock

    if action.target == "portfolio":
        existing["is_in_portfolio"] = True
    else:
        existing["is_watched"] = True
        
    logger.info(f"Ticker {sym} added to {action.target}")
    return {"success": True, "msg": f"{sym} added to {action.target}"}

@app.delete("/ticker/{symbol}")
def remove_ticker(symbol: str):
    logger.info(f"Removing ticker: {symbol}")
    sym = symbol.upper()
    for stock in MOCK_DB:
        if stock["symbol"] == sym:
            stock["is_watched"] = False
            logger.info(f"Ticker {sym} removed from watchlist.")
            return {"success": True}
    logger.warning(f"Ticker {sym} not found.")
    return {"success": False}

@app.post("/portfolio/{symbol}")
def add_portfolio(symbol: str):
    logger.info(f"Adding ticker {symbol} to portfolio.")
    for stock in MOCK_DB:
        if stock["symbol"] == symbol.upper():
            stock["is_in_portfolio"] = True
            logger.info(f"Ticker {symbol} added to portfolio.")
            return {"success": True}
    logger.warning(f"Ticker {symbol} not found.")
    return {"success": False}

@app.delete("/portfolio/{symbol}")
def remove_portfolio(symbol: str):
    logger.info(f"Removing ticker {symbol} from portfolio.")
    for stock in MOCK_DB:
        if stock["symbol"] == symbol.upper():
            stock["is_in_portfolio"] = False
            logger.info(f"Ticker {symbol} removed from portfolio.")
            return {"success": True}
    logger.warning(f"Ticker {symbol} not found.")
    return {"success": False}

@app.post("/wheel/log")
def log_trade(trade: TradeLog):
    logger.info(f"Logging new trade: {trade}")
    new_trade = trade.model_dump()
    new_trade["id"] = int(time.time() * 1000)
    new_trade["status"] = "Open"
    new_trade["date"] = time.strftime("%Y-%m-%d")
    WHEEL_HISTORY.insert(0, new_trade)
    logger.info(f"Trade logged: {new_trade}")
    return {"success": True}

# --- NEWS ENDPOINT ---
@app.get("/news/{symbol}")
def get_company_news(symbol: str):
    if not API_KEY: return {"summary": "API Key missing.", "feed": []}
    try:
        # 1. Fetch data from Finnhub (Last 7 days for relevance)
        today = datetime.now().strftime("%Y-%m-%d")
        last_week = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        url = f"https://finnhub.io/api/v1/company-news?symbol={symbol}&from={last_week}&to={today}&token={API_KEY}"
        r = requests.get(url)
        data = r.json()
        
        if not isinstance(data, list):
            return {"summary": "Unable to load news feed.", "feed": []}

        # 2. Filter Logic
        filtered_news = [item for item in data if is_relevant(item, symbol)]
        
        # 3. Generate Summary
        summary_text = generate_summary(filtered_news, symbol)

        # 4. Return Object
        return {
            "summary": summary_text,
            "feed": filtered_news[:15]
        }

    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")
        return {"summary": "Error loading news summary.", "feed": []}
    
def is_relevant(news_item, symbol):
    """
    Returns True if the news item is specifically about the symbol.
    """
    headline = news_item.get('headline', '').upper()
    summary = news_item.get('summary', '').upper()
    sym = symbol.upper()
    # Check if symbol is in headline or summary (with spacing to avoid partial matches like 'TSLA' in 'TSLAW')
    if sym in headline or f" {sym} " in f" {summary} ": 
        return True
    return False

def generate_summary(news_items, symbol):
    """
    Generates a synthetic summary paragraph from the top headlines.
    """
    if not news_items:
        return f"No recent news found for {symbol}. Market activity appears quiet."
    
    # Take top 3 most relevant headlines
    top_stories = news_items[:3]
    headlines = [item.get('headline', '').strip() for item in top_stories]
    
    summary = f"Latest developments for {symbol}: "
    
    if len(headlines) >= 1:
        summary += f"Reports indicate {headlines[0]}"
        if not summary.endswith('.'): summary += "."
        
    if len(headlines) >= 2:
        summary += f" In other news, {headlines[1]}"
        if not summary.endswith('.'): summary += "."
        
    if len(headlines) >= 3:
        summary += f" Traders are also monitoring reports that {headlines[2]}"
        if not summary.endswith('.'): summary += "."
        
    return summary