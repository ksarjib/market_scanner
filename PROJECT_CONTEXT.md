# Market Scanner Context

## Product Goal
- Deliver a real-time, voice-assisted equities terminal (TERMINAL.PRO) that surfaces actionable buy/sell alerts and options “Wheel” trade opportunities.
- Give traders a single dashboard to monitor portfolio holdings, curated watchlists, and broader market movers with instant access to charts and curated news summaries.
- Reduce decision latency with spoken alerts, quick toggles for portfolio/watchlist management, and integrated trade logging for options income strategies.

## Current Capabilities
- **Signal Scanner (Momentum Strategy)**  
  - Fetches ticker snapshots from a FastAPI backend (`/scan`) seeded by an in-memory store and optionally refreshed with Finnhub quotes.  
  - Calculates delta metrics (price/volume changes) and highlights RSI/MACD driven statuses such as “Sweet Spot”, “Trinity Buy”, or “Overbought”.  
  - Splits results into portfolio, watchlist, and market sections; supports per-section ignoring to declutter the feed.
- **Voice Automation**  
  - Browser speech synthesis announces priority alerts with configurable content (price, signal, reason) and scope filters (portfolio/watchlist/market).  
  - Countdown-based auto-refresh plus manual refresh to immediately re-trigger scans.
- **Interactive Controls**  
  - Global strategy selector (Momentum vs. Wheel) and refresh interval picker.  
  - `TickerSearch` component uses `/search` to auto-complete tickers and batch add/remove them from portfolio or watchlist targets.  
  - Shared `StockActionsMenu` enables quick portfolio/watchlist toggles, ignoring symbols, and launching chart/news modals.
- **Options Wheel Mode**  
  - Backend marks oversold/overbought tickers with `wheel_suggestion` payloads (CSP/CC).  
  - `WheelSignalCard` surfaces strikes, target premium, and expiries, with a one-click “Log This Trade” control that posts to `/wheel/log`.  
  - `WheelHistory` table displays logged trades including strike, premium, expiry, and assignment status.
- **Contextual Intelligence**  
  - `ChartModal` renders an embedded TradingView chart per symbol.  
  - `NewsModal` queries `/news/{symbol}`, which wraps Finnhub’s company-news feed, filters for symbol relevance, builds an AI-style summary, and shows the latest articles sorted by recency.

## Architecture Overview
- **Frontend:** React 19 + Create React App, TailwindCSS 3 styling, Framer Motion for animation, Lucide icons, browser SpeechSynthesis API for audio. Organized into `components/common`, `components/layout`, and `components/dashboard`, with services (`api.js`) and utilities (`speech.js`) abstractions.
- **Backend:** FastAPI app (`backend.py`) with CORS enabled. Currently leverages an in-memory mock database for tickers and wheel history, plus Finnhub REST APIs (`quote`, `search`, `company-news`) for optional live data. Uses `requests`, `pydantic`, `.env` configuration via `python-dotenv`, and logs via the standard `logging` module.
- **Data Flow:**  
  1. Frontend polls `/scan?strategy=<mode>` at the configured cadence.  
  2. Backend optionally enriches each mock ticker with Finnhub quotes, calculates wheel suggestions, and returns `{ data, history, settings }`.  
  3. Frontend derives price/volume deltas, updates local caches, and conditionally triggers speech announcements.  
  4. User interactions (portfolio/watchlist edits, wheel trade logging, ticker search) are persisted by hitting the relevant REST endpoints.

## Tooling & Dependencies
- **Frontend Toolchain:** Node/NPM, React Scripts, Tailwind/PostCSS pipeline, Axios (installed but unused so far), Testing Library + Jest DOM scaffolding.  
- **Backend Toolchain:** Python 3.11+, FastAPI/Uvicorn, yfinance & pandas (listed in README for future data ingestion), tabulate for CLI outputs, Finnhub API key loaded from `.env`, optional SQLite DB placeholder (`market_data_v3.db`).  
- **Dev Experience:** README files detail Python virtualenv setup, dependency installation, and `uvicorn backend:app --reload` for backend plus `npm start` for the CRA frontend.

## Open Questions / Next Enhancements
- Replace the mock ticker array with persisted storage (SQLite/PostgreSQL) and true indicator calculations (RSI/MACD via pandas or ta-lib).  
- Implement persistence for ignore lists and audio settings server-side rather than in-memory.  
- Harden Finnhub integration (rate limiting, retries, caching) or add alternative data providers.  
- Expand automated tests (current repo only includes placeholder CRA tests and a jest test scaffold for `StockActionsMenu`).  
- Containerize backend/frontend for reproducible deployments and consider websocket streams for near real-time updates.
