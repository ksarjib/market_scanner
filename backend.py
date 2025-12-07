import yfinance as yf
import pandas as pd
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# DATABASE & CONFIG
# -------------------------
DB_FILE = "market_data_v3.db"

def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tickers (
                symbol TEXT PRIMARY KEY,
                in_watchlist INTEGER DEFAULT 0,
                in_portfolio INTEGER DEFAULT 0,
                is_ignored INTEGER DEFAULT 0,
                custom_sector TEXT
            )
        """)
        cursor.execute("CREATE TABLE IF NOT EXISTS ignored_sectors (sector TEXT PRIMARY KEY)")
        cursor.execute("CREATE TABLE IF NOT EXISTS ignored_sections (section TEXT PRIMARY KEY)")
        
        cursor.execute("SELECT count(*) FROM tickers")
        if cursor.fetchone()[0] == 0:
            defaults = ["PLUG", "RR", "CRML", "UAMY", "TSLA", "NVDA", "PLTR", "SOFI", "AMZN", "MSFT"]
            for sym in defaults:
                cursor.execute("INSERT OR IGNORE INTO tickers (symbol, in_watchlist) VALUES (?, 1)", (sym,))
        conn.commit()

init_db()

NAME_CACHE = {}

BASE_SECTORS = {
    "AI & Tech": ["NVDA", "MSFT", "GOOGL", "META", "AMD", "AVGO", "TSM", "PLTR", "ORCL", "SMCI"],
    "Quantum":   ["IONQ", "RGTI", "QBTS", "QUBT", "IBM"],
    "Energy":    ["PLUG", "BE", "EOG", "SLB", "OXY", "PSX"],
    "Retail":    ["WMT", "COST", "AMZN", "TGT", "TJX", "LULU", "NKE"],
    "Financial": ["JPM", "BAC", "GS", "SOFI", "HOOD"],
    "Robotics":  ["RR","ISRG", "ROK", "TER", "PATH", "IRBT"],
    "Minerals":  ["CRML","UAMY","BHP", "RIO", "GOLD"],
    "Automotive":["TM", "STLA", "F", "GM", "HMC", "NIO"], 
    "EV":        ["TSLA", "RIVN", "LCID", "LI", "XPEV"],
    "Space/Sat": ["RKLB", "ASTS", "PL", "IRDM", "GSAT"]
}

class TickerRequest(BaseModel):
    symbol: str = ""
    target: str = "watchlist" 

class SectorRequest(BaseModel):
    sector: str

class SectionRequest(BaseModel):
    section: str

# -------------------------
# HELPER FUNCTIONS
# -------------------------
def get_db_state():
    watchlist = []
    portfolio = []
    ignored_stocks = set()
    ignored_sectors = set()
    ignored_sections = []
    custom_market = {}
    
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT symbol, in_watchlist, in_portfolio, is_ignored, custom_sector FROM tickers")
        for sym, w, p, i, sec in cursor.fetchall():
            sym = sym.upper()
            if w: watchlist.append(sym)
            if p: portfolio.append(sym)
            if i: ignored_stocks.add(sym)
            if sec: custom_market[sym] = sec
            
        cursor.execute("SELECT sector FROM ignored_sectors")
        for row in cursor.fetchall(): ignored_sectors.add(row[0])

        cursor.execute("SELECT section FROM ignored_sections")
        for row in cursor.fetchall(): ignored_sections.append(row[0])
            
    return watchlist, portfolio, ignored_stocks, ignored_sectors, ignored_sections, custom_market

def get_company_name(symbol):
    if symbol in NAME_CACHE: return NAME_CACHE[symbol]
    try:
        ticker = yf.Ticker(symbol)
        name = ticker.info.get('shortName') or symbol
        name = name.replace(" Inc.", "").replace(" Corporation", "").replace(" Corp", "").replace(" Limited", "")
        NAME_CACHE[symbol] = name
        return name
    except:
        return symbol

def get_sector(symbol):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        check_str = (info.get('sector', '') + " " + info.get('industry', '')).title()
        if "Auto" in check_str or "Vehicle" in check_str: return "Automotive"
        if "Solar" in check_str or "Clean Energy" in check_str: return "Energy"
        if "Semiconductor" in check_str or "Software" in check_str or "Technology" in check_str: return "AI & Tech"
        if "Bank" in check_str or "Financial" in check_str: return "Financial"
        if "Retail" in check_str or "Consumer" in check_str: return "Retail"
        return info.get('sector', 'Other')
    except: return "Other"

def calculate_technical_score(df, symbol):
    try:
        if len(df) < 50: return None
        
        ema12 = df["Close"].ewm(span=12, adjust=False).mean()
        ema26 = df["Close"].ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()

        delta = df["Close"].diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean().replace(0, 1e-10)
        rsi = 100 - (100 / (1 + gain / loss))

        sma20 = df["Close"].rolling(window=20).mean()
        std20 = df["Close"].rolling(window=20).std()
        upper_bb = sma20 + (std20 * 2)
        lower_bb = sma20 - (std20 * 2)
        vol_avg = df["Volume"].rolling(window=20).mean()

        curr = df.iloc[-1]
        prev = df.iloc[-2]
        
        price = float(curr["Close"])
        curr_rsi = float(curr.get("RSI", rsi.iloc[-1]))
        curr_vol = float(curr["Volume"])
        
        macd_val = float(macd.iloc[-1])
        sig_val = float(signal.iloc[-1])
        prev_macd = float(macd.iloc[-2])
        
        macd_bullish = macd_val > sig_val
        macd_bearish = macd_val < sig_val
        strong_volume = curr_vol > (float(vol_avg.iloc[-1]) * 1.1)
        
        l_bb = lower_bb.iloc[-1]
        u_bb = upper_bb.iloc[-1]

        status = "Hold"
        reason = ""
        speech = ""
        is_buy = False
        is_sell = False
        score = 0
        company = get_company_name(symbol)
        price_speech = f"{price:.2f} dollars"

        if (price <= l_bb * 1.02) and (curr_rsi < 45) and macd_bullish and strong_volume:
            status = "💎 TRINITY BUY"
            score = 100
            is_buy = True
            reason = f"Strong Reversal: Price hit Lower Band, RSI recovering, MACD Bullish & High Volume."
            speech = f"Strong Trinity Buy signal for {company} at {price_speech}."
        elif macd_bullish and (curr_rsi < 60) and (macd_val > prev_macd):
            status = "Buy"
            score = 50
            is_buy = True
            reason = "Momentum Buy: MACD rising with healthy RSI."
            speech = f"Buy signal for {company} at {price_speech}."
        elif (price >= u_bb * 0.98) and (curr_rsi > 70):
            status = "⚠️ TRINITY SELL"
            score = -100
            is_sell = True
            reason = f"Top Signal: Price hitting Upper Band with Overbought RSI."
            speech = f"Strong Sell warning for {company} at {price_speech}."
        elif macd_bearish and (curr_rsi > 60):
            status = "Sell"
            score = -50
            is_sell = True
            reason = "Trend Weakening: MACD crossed bearish."
            speech = f"Sell signal for {company} at {price_speech}."

        return {
            "price": price, "rsi": curr_rsi, "macd": macd_val, "macd_sig": sig_val,
            "status": status, "reason": reason, "speech": speech, 
            "is_buy": is_buy, "is_sell": is_sell, "score": score,
            "volume": curr_vol, "company_name": company
        }
    except Exception: return None

def analyze_market():
    watchlist, portfolio, ignored_stocks, ignored_sectors, ignored_sections, custom_market = get_db_state()

    ticker_map = {}
    for sector, tickers in BASE_SECTORS.items():
        for t in tickers: ticker_map[t] = sector
    for t, sector in custom_market.items():
        ticker_map[t] = sector
    for t in set(watchlist + portfolio):
        if t not in ticker_map: ticker_map[t] = "Other"
    
    unique_list = list(ticker_map.keys())
    
    try:
        data = yf.download(unique_list, period="3mo", interval="1d", group_by='ticker', auto_adjust=True, progress=False, threads=True)
    except Exception: return [], []

    results = []

    for symbol in unique_list:
        sector = ticker_map.get(symbol, "Other")
        
        is_stock_ignored = symbol in ignored_stocks
        is_sector_ignored = sector in ignored_sectors
        in_portfolio = symbol in portfolio
        in_watchlist = symbol in watchlist

        try:
            if len(unique_list) == 1: df_ticker = data.copy()
            else:
                if symbol not in data.columns.levels[0]: continue
                df_ticker = data[symbol].copy()
            
            df_ticker.dropna(subset=['Close'], inplace=True)
            
            analysis = calculate_technical_score(df_ticker, symbol)
            if not analysis: continue

            # --- CRITICAL FILTER LOGIC ---
            
            # 1. STOCK LEVEL IGNORE: Absolute Block
            if is_stock_ignored:
                analysis["is_buy"] = False
                analysis["is_sell"] = False
                analysis["status"] = "Ignored"
                analysis["score"] = -999

            # 2. SECTOR LEVEL IGNORE: Conditional Block
            # If sector is ignored, suppress signal UNLESS stock is in Portfolio/Watchlist
            elif is_sector_ignored:
                if not in_portfolio and not in_watchlist:
                    analysis["is_buy"] = False
                    analysis["is_sell"] = False
                    analysis["status"] = "Ignored (Sector)"
                    analysis["score"] = -999
                # If it IS in portfolio/watchlist, we allow the signal to pass through
                # The frontend will then decide based on Section visibility

            results.append({
                "symbol": symbol,
                **analysis,
                "is_watched": in_watchlist,
                "is_in_portfolio": in_portfolio,
                "sector": sector,
                "is_ignored": is_stock_ignored,
                "is_sector_ignored": is_sector_ignored
            })
            
        except Exception: continue
    
    return sorted(results, key=lambda x: abs(x['score']), reverse=True), ignored_sections

# -------------------------
# ENDPOINTS
# -------------------------
@app.get("/scan")
def get_scan():
    data, ignored_sections = analyze_market()
    return {"data": data, "settings": {"ignored_sections": ignored_sections}}

@app.post("/add")
def add(req: TickerRequest):
    s = req.symbol.upper()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO tickers (symbol) VALUES (?)", (s,))
        if req.target == 'watchlist':
            cursor.execute("UPDATE tickers SET in_watchlist = 1 WHERE symbol = ?", (s,))
        elif req.target == 'market':
            sector = get_sector(s)
            cursor.execute("UPDATE tickers SET custom_sector = ? WHERE symbol = ?", (sector, s))
        conn.commit()
    return {"status": "ok"}

@app.post("/remove")
def remove(req: TickerRequest):
    s = req.symbol.upper()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE tickers SET in_watchlist = 0 WHERE symbol = ?", (s,))
        # Cleanup
        cursor.execute("DELETE FROM tickers WHERE symbol = ? AND in_watchlist = 0 AND in_portfolio = 0 AND custom_sector IS NULL", (s,))
        conn.commit()
    return {"status": "ok"}

@app.post("/portfolio/add")
def add_portfolio(req: TickerRequest):
    s = req.symbol.upper()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO tickers (symbol) VALUES (?)", (s,))
        cursor.execute("UPDATE tickers SET in_portfolio = 1 WHERE symbol = ?", (s,))
        conn.commit()
    return {"status": "ok"}

@app.post("/portfolio/remove")
def remove_portfolio(req: TickerRequest):
    s = req.symbol.upper()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE tickers SET in_portfolio = 0 WHERE symbol = ?", (s,))
        cursor.execute("DELETE FROM tickers WHERE symbol = ? AND in_watchlist = 0 AND in_portfolio = 0 AND custom_sector IS NULL", (s,))
        conn.commit()
    return {"status": "ok"}

@app.post("/ignore/stock")
def ignore_stock(req: TickerRequest):
    s = req.symbol.upper()
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO tickers (symbol) VALUES (?)", (s,))
        cursor.execute("SELECT is_ignored FROM tickers WHERE symbol = ?", (s,))
        new_val = 0 if cursor.fetchone()[0] else 1
        cursor.execute("UPDATE tickers SET is_ignored = ? WHERE symbol = ?", (new_val, s))
        conn.commit()
    return {"status": "ok"}

@app.post("/ignore/sector")
def ignore_sector(req: SectorRequest):
    sec = req.sector
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM ignored_sectors WHERE sector = ?", (sec,))
        if cursor.fetchone():
            cursor.execute("DELETE FROM ignored_sectors WHERE sector = ?", (sec,))
        else:
            cursor.execute("INSERT INTO ignored_sectors (sector) VALUES (?)", (sec,))
        conn.commit()
    return {"status": "ok"}

@app.post("/ignore/section")
def ignore_section(req: SectionRequest):
    sec = req.section
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM ignored_sections WHERE section = ?", (sec,))
        if cursor.fetchone():
            cursor.execute("DELETE FROM ignored_sections WHERE section = ?", (sec,))
        else:
            cursor.execute("INSERT INTO ignored_sections (section) VALUES (?)", (sec,))
        conn.commit()
    return {"status": "ok"}