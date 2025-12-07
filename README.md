# Quick Setup

## Backend Setup

### macOS/Linux
1. **Install Python** (if not already installed):
   - macOS: Install Python using Homebrew:
     ```bash
     brew install python
     ```
   - Verify Python installation:
     ```bash
     python3 --version
     ```
2. Open a terminal and navigate to the project directory:
   ```bash
   cd /path/to/Stocks
   ```
3. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the script:
   ```bash
   python3 market_scanner.py
   ```

### Windows
1. **Install Python** (if not already installed):
   - Download Python from the [official website](https://www.python.org/downloads/).
   - During installation, ensure you check the box to "Add Python to PATH."
   - Verify Python installation:
     ```cmd
     python --version
     ```
2. Open Command Prompt or PowerShell and navigate to the project directory:
   ```cmd
   cd \path\to\Stocks
   ```
3. Create and activate a virtual environment:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```
4. Install the required dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
5. Run the script:
   ```cmd
   python market_scanner.py
   ```

---

# Market Scanner

This Python script scans the stock market for potential buy and sell signals based on technical indicators like RSI (Relative Strength Index) and MACD (Moving Average Convergence Divergence). It also provides audio alerts and fetches recent news for the stocks in your watchlist.

## Features
- Scans multiple sectors and tickers for buy/sell signals.
- Uses RSI and MACD indicators for technical analysis.
- Provides audio alerts for significant signals.
- Fetches recent news headlines for stocks.
- Customizable watchlist and sectors.
- API integration for seamless data fetching.

## Prerequisites
1. **Python 3.7 or higher**
2. **pip** (Python package manager)
3. **Virtual Environment** (recommended)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/Stocks.git
cd Stocks
```

### 2. Set Up a Virtual Environment (Recommended)
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate  # macOS/Linux
# For Windows:
# venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

If you don't have a `requirements.txt` file, manually install the required packages:
```bash
pip install yfinance pandas tabulate
```

## Configuration

### 1. Customize Watchlist
Edit the `MY_WATCHLIST` variable in the script to include your preferred stock tickers:
```python
MY_WATCHLIST = ["AAPL", "TSLA", "AMZN", "MSFT"]
```

### 2. Adjust Scan Period and Refresh Rate
Modify the `PERIOD` and `REFRESH_SECONDS` variables to set the data period and scan frequency:
```python
PERIOD = "1y"  # Data period (e.g., "1y", "6mo", "1mo")
REFRESH_SECONDS = 300  # Refresh rate in seconds
```

## Running the Script

### 1. Activate the Virtual Environment (if applicable)
```bash
source venv/bin/activate  # macOS/Linux
# For Windows:
# venv\Scripts\activate
```

### 2. Run the Script
```bash
python3 market_scanner.py
```

## Notes
- The script uses the `yfinance` library to fetch stock data.
- Ensure you have a stable internet connection while running the script.
- Audio alerts require `say` (macOS), `PowerShell` (Windows), or `espeak` (Linux) to be installed.

## Troubleshooting
- **ModuleNotFoundError**: Ensure all dependencies are installed in the correct environment.
- **Permission Denied**: Check if you have the necessary permissions to execute the script.
- **Audio Alerts Not Working**: Ensure the required text-to-speech tool is installed for your OS.

## License
This project is licensed under the MIT License.