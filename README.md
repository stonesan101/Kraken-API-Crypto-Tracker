# Cryptocurrency Price Tracker

A real-time cryptocurrency price tracking application that monitors multiple trading pairs simultaneously using the Kraken API. Track price movements, set target sell prices, and get visual alerts when your targets are reached.

## Features

- **Real-time Price Updates**: Fetches live cryptocurrency prices every second from Kraken
- **Multiple Trackers**: Monitor multiple cryptocurrency pairs simultaneously
- **Historical Data**: Tracks up to 5 minutes of price history for trend analysis
- **Price Statistics**: 
  - Current price and percentage change from start
  - 1-minute and 5-minute percentage changes
  - Session high and low prices
  - Elapsed tracking time
- **Target Alerts**: 
  - Set target sell prices with custom markup percentages
  - Set buy-in price thresholds
  - Visual indicators when targets are reached
- **Portfolio Value**: Calculates current and target portfolio values based on your holdings
- **Cryptocurrency Logos**: Displays coin logos fetched from CoinGecko API

## How It Works

### RecordKeeper Class

The core of the application is the `RecordKeeper` class, which manages individual cryptocurrency trackers:

```javascript
new RecordKeeper(units, increase, pairName, id, html, buyIn)
```

**Parameters:**
- `units` - Number of cryptocurrency units you own
- `increase` - Markup multiplier for target price (e.g., 1.05 = 5% profit target)
- `pairName` - Trading pair name (e.g., "BTC/USD", "ETH/USD")
- `id` - Unique identifier for the tracker instance
- `html` - HTML template for the tracker UI
- `buyIn` - Target buy-in price for purchase alerts

### Key Functionality

- **Price Fetching**: Connects to Kraken's public API to retrieve real-time ticker data
- **Time Management**: Uses wall-clock synchronization to maintain accurate 1-second update intervals
- **History Tracking**: Maintains a rolling buffer of 300 price points (5 minutes of data)
- **Statistics Calculation**: Computes percentage changes, high/low ranges, and portfolio values
- **Visual Alerts**: Applies CSS classes for buy/sell indicators when thresholds are met

## API Integration

### Kraken API
- **Endpoint**: `https://api.kraken.com/0/public/Ticker`
- **Purpose**: Fetches current cryptocurrency prices
- **Rate**: Called every second per tracker

### CoinGecko API
- **Endpoint**: `https://api.coingecko.com/api/v3/search`
- **Purpose**: Retrieves cryptocurrency logos
- **Rate**: Called once per tracker initialization

## Usage

1. **Select a Cryptocurrency**: Choose from available USD-quoted trading pairs
2. **Set Parameters**:
   - Enter the number of units you own
   - Set your target profit percentage
   - (Optional) Set a buy-in price threshold
3. **Add Tracker**: Click the add button to start monitoring
4. **Monitor**: Watch real-time updates for:
   - Current price and value
   - Percentage changes over different time periods
   - High/low ranges
   - Target sell price

## Code Structure

```
├── RecordKeeper Class
│   ├── constructor() - Initializes tracker with parameters
│   ├── initialize() - Fetches starting price and begins updates
│   ├── getCurrent() - Fetches current price from Kraken
│   ├── getPrice() - Main update loop (runs every second)
│   ├── getTotals() - Updates all display values
│   ├── setTargetValue() - Updates tracker parameters
│   ├── percentage() - Calculates percentage changes
│   └── format() - Formats currency values
├── getPairs() - Fetches available trading pairs
├── getCryptoLogo() - Fetches cryptocurrency logos
└── Event Listener - Handles add/update button clicks
```

## Technical Details

### Time Tracking
The tracker uses a sophisticated timing mechanism to maintain accurate 1-second intervals:
- Records start time as a timestamp
- Calculates drift on each update
- Schedules next update to align with second boundaries
- Prevents timing drift from API latency

### Data Management
- **History Buffer**: Fixed-size array (300 entries) with automatic rotation
- **Price Comparison**: Tracks previous price to detect changes
- **High/Low Tracking**: Updates session extremes on each price fetch
- **Memoization**: Caches starting price and investment values

### Visual Indicators
- **Sell Alert**: Triggered when current value ≥ target value
- **Buy Alert**: Triggered when current value ≤ buy-in threshold
- Applied via CSS class toggling on the tracker section

## Browser Compatibility

- Requires modern browser with ES6+ support
- Uses async/await syntax
- Fetch API for network requests
- DOM manipulation APIs

## Dependencies

- **External APIs**:
  - Kraken API (no authentication required)
  - CoinGecko API (no authentication required)
- **No npm packages required** - Pure vanilla JavaScript

## Limitations

- Requires active internet connection
- Historical data resets on page refresh

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
