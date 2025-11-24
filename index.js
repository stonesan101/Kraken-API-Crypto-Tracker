const templateHTML = document.querySelector('section').innerHTML
const appendDiv = document.getElementById('crypto')
const select = document.getElementById('selectCrypto');
const recordKeepers = {}

/**
 * A class that tracks and monitors cryptocurrency price data over time.
 * Fetches price data from Kraken API and maintains historical records with statistics.
 */
class RecordKeeper {
    /**
     * Creates a new RecordKeeper instance for tracking cryptocurrency prices.
     * @param {number} units - The number of cryptocurrency units being tracked
     * @param {number} increase - The markup multiplier for target price calculation (e.g., 1.05 for 5% markup)
     * @param {string} pairName - The cryptocurrency trading pair name (e.g., "BTC/USD")
     * @param {string} id - Unique identifier for the DOM section element
     * @param {string} html - HTML template string for rendering the tracker UI
     * @param {number} buyIn - Target buy-in price threshold for purchase alerts
     */
    constructor(units, increase, pairName, id, html, buyIn) {
        /** @type {number} Previous price value for comparison to detect changes */
        this.oldTotal = 0;

        /** @type {number} Target buy-in price for purchase alerts */
        this.targetBuyIn = buyIn;

        /** @type {number[]} Array of historical price values (max 300 entries, represents 5 minutes at 1-second intervals) */
        this.history = [];

        /** @type {number} Markup multiplier for target sell price calculation */
        this.markup = increase;

        /** @type {string} Trading pair name (e.g., "BTC/USD", "ETH/USD") */
        this.pairName = pairName;

        /** @type {HTMLElement} Section element container for this tracker instance */
        this.section = document.createElement('section');
        this.section.id = id;
        this.section.innerHTML = html;
        appendDiv.appendChild(this.section);

        /** @type {boolean} Flag indicating if tracker has been running for over 1 minute */
        this.over1Min = false;

        /** @type {HTMLInputElement} Input element displaying elapsed time */
        this.timeElapsed = document.querySelector(`#${id} .timeElapsed`)

        /** @type {HTMLInputElement} Input element displaying current price */
        this.currentPrice = document.querySelector(`#${id} .currentPrice`)

        /** @type {HTMLInputElement} Input element displaying percentage change from start */
        this.percentFromStart = document.querySelector(`#${id} .percentFromStart`)

        /** @type {HTMLInputElement} Input element displaying 1-minute change percentage */
        this.oneMinChange = document.querySelector(`#${id} .oneMinChange`)

        /** @type {HTMLInputElement} Input element displaying 5-minute change percentage */
        this.fiveMinChange = document.querySelector(`#${id} .fiveMinChange`)

        /** @type {HTMLInputElement} Input element displaying current portfolio value */
        this.currentValue = document.querySelector(`#${id} .currentValue`)

        /** @type {HTMLInputElement} Input element displaying target sell value */
        this.targetValue = document.querySelector(`#${id} .targetValue`)

        /** @type {HTMLInputElement} Input element displaying low and high price range */
        this.lowHigh = document.querySelector(`#${id} .lowHigh`)

        /**
         * Memoized values for investment tracking
         * @type {{starting: number, units: number, value: number}}
         * @property {number} starting - Initial price when tracking started
         * @property {number} units - Number of cryptocurrency units owned
         * @property {number} value - Current value of the investment
         */
        this.memo = {
            starting: 0, units, value: 0
        };

        /**
         * Time tracking object with formatting utilities
         * @type {{hour: number, min: number, sec: number, incrementTime: Function, leftPad: Function, format: Function}}
         * @property {number} hour - Current hour count
         * @property {number} min - Current minute count
         * @property {number} sec - Current second count
         * @property {Function} incrementTime - Increments time by one second with rollovers
         * @property {Function} leftPad - Pads single-digit numbers with leading zero
         * @property {Function} format - Returns formatted time string
         */
        this.time = {
            /** @type {number} Current hour */
            hour: 0,
            /** @type {number} Current minute */
            min: 0,
            /** @type {number} Current second */
            sec: 0,

            /**
             * Increments the time by one second, handling minute and hour rollovers
             * @returns {void}
             */
            incrementTime() {
                if (++this.sec === 60) {
                    this.sec = 0;
                    if (++this.min === 60) {
                        this.min = 0;
                        ++this.hour;
                    }
                }
            },

            /**
             * Pads single-digit time values with leading zero
             * @param {number} time - The time value to pad
             * @returns {string|number} Padded time string (e.g., "09") or original number if >= 10
             */
            leftPad(time) {
                return time >= 10 ? time : '0' + time;
            },

            /**
             * Formats the current time as HH:MM'SS
             * @returns {string} Formatted time string (e.g., "01:23'45")
             */
            format() {
                return `${this.leftPad(this.hour)}:${this.leftPad(this.min)}'${this.leftPad(this.sec)}`;
            }
        };

        /** @type {number} Highest price recorded since tracking started */
        this.high = 0;

        /** @type {number} Lowest price recorded since tracking started */
        this.low = Infinity;

        /** @type {number} Most recent price fetched from API */
        this.current = 0;

        /** @type {number} Timestamp (milliseconds) when tracking started, used for accurate timing */
        this.startTime = 0;

        // Start the updates
        this.initialize();
    }

    /**
     * Initializes the tracker by fetching the starting price, setting initial values,
     * loading the cryptocurrency logo, and beginning the update loop
     * @async
     * @returns {Promise<void>}
     */
    async initialize() {
        const startPrice = await this.getCurrent();
        this.memo.starting = startPrice;
        this.memo.value = startPrice;
        this.high = startPrice;
        this.low = startPrice;
        this.current = startPrice;
        this.startTime = Date.now();
        const coinURL = await getCryptoLogo(this.pairName.split('/')[0])
        this.section.querySelector('div').innerHTML = `<img src=${coinURL}>${this.section.querySelector('div').innerHTML}`
        this.section.querySelector('h1').textContent = `${this.pairName} Price Tracker`
        this.getPrice();
    }

    /**
     * Fetches the current price for the trading pair from Kraken API
     * @async
     * @returns {Promise<number>} Current price of the cryptocurrency in USD
     */
    async getCurrent() {
        const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${this.pairName}`);
        const data = await response.json();
        const price = +data.result[this.pairName].c[0];
        return price;
    }

    /**
     * Calculates percentage change between two values
     * @param {number} start - Starting value (base for comparison)
     * @param {number} now - Current value
     * @param {boolean} [removeBonus=false] - If true, subtracts the markup percentage from result
     * @returns {string} Formatted percentage string with sign (e.g., "+5.123%" or "-2.456%")
     */
    percentage(start, now, removeBonus = false) {
        let returnVal = ((now - start) / start * 100).toFixed(3);
        if (removeBonus) {
            returnVal -= ~~((this.markup - 1) * 100);
            returnVal = returnVal.toFixed(3);
        }
        if (returnVal >= 0) {
            returnVal = '+' + returnVal;
        }
        return returnVal + '%';
    }

    /**
     * Formats a number as US dollar currency
     * @param {number} money - The amount to format
     * @returns {string} Formatted currency string with thousands separators (e.g., "$1,234.56")
     */
    format(money) {
        return '$' + money.toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }

    /**
     * Updates all display elements with current price statistics and investment values.
     * Shows time elapsed, current/target prices, high/low range, percentage changes,
     * and investment value. Also toggles CSS classes for buy/sell alerts.
     * @returns {void}
     */
    getTotals() {
        if (this.history.length === 0) return;
        if (!this.oldTotal) {
            this.targetValue.value = this.format(this.current * this.markup * this.memo.units)
        }
        this.currentPrice.value = '$' + this.current
        this.percentFromStart.value = this.percentage(this.memo.starting, this.current)
        this.oneMinChange.value = this.percentage(this.history[Math.max(0, this.history.length - 60)], this.current)
        this.fiveMinChange.value = this.percentage(this.history[0], this.current)
        this.currentValue.value = this.format(this.memo.units * this.current)
        this.lowHigh.value = `$${this.low} | $${this.high}`

        this.section.classList.toggle('sell', this.currentValue.value >= this.targetValue.value)
        this.section.classList.toggle('buy', this.currentValue.value <= this.targetBuyIn)
    }

    /**
     * Updates the target value parameters and recalculates display values
     * @param {number} markup - New markup multiplier for target price
     * @param {number} units - New number of cryptocurrency units
     * @param {number} buyIn - New target buy-in price threshold
     * @returns {void}
     */
    setTargetValue(markup, units, buyIn) {
        this.markup = markup;
        this.memo.units = units;
        this.targetBuyIn = buyIn
        this.targetValue.value = this.format(this.current * this.markup * this.memo.units)
        this.getTotals()
    }

    /**
     * Main update loop that fetches current price, updates statistics, and schedules next update.
     * Uses wall-clock time to maintain accurate 1-second intervals regardless of API latency.
     * Maintains up to 300 historical price points (5 minutes of data).
     * @async
     * @returns {Promise<void>}
     */
    async getPrice() {
        this.current = await this.getCurrent();
        this.time.incrementTime();
        this.history.push(this.current);

        if (this.history.length > 300) {
            this.history.shift();
        }

        if (this.current > this.high) {
            this.high = this.current;
        }
        if (this.current < this.low) {
            this.low = this.current;
        }

        if (this.current !== this.oldTotal) {
            this.getTotals();
        }

        this.oldTotal = this.current;
        this.timeElapsed.value = this.time.format()

        // Calculate how long until the next second boundary
        const elapsed = Date.now() - this.startTime;
        const nextTick = Math.ceil(elapsed / 1000) * 1000;
        const delay = nextTick - elapsed;

        setTimeout(() => this.getPrice(), delay);
    }
}

/**
 * Fetches available cryptocurrency trading pairs from Kraken API
 * and populates the select dropdown with USD-quoted pairs
 * @async
 * @returns {Promise<void>}
 */
async function getPairs() {
    let result = await fetch('https://api.kraken.com/0/public/AssetPairs')
    let data = await result.json();
    const entries = Object.entries(data.result)
    for await (const entry of entries) {
        if (entry[1].quote === 'ZUSD' || entry[1].quote === 'USD1') {
            const pairName = entry[1].wsname !== 'XBT/USD1' ? entry[1].wsname : 'BTC/USD'
            select.innerHTML += `<option value="${entry[0]}">${pairName}</option>`
        }
    }
}

/**
 * Fetches the logo URL for a cryptocurrency from CoinGecko API
 * @async
 * @param {string} symbol - The cryptocurrency symbol (e.g., "BTC", "ETH")
 * @returns {Promise<string|null>} URL of the cryptocurrency logo (large size) or null if not found
 */
async function getCryptoLogo(symbol) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
        const data = await response.json();
        if (data.coins && data.coins.length > 0) {
            // Return the logo URL (large, small, or thumb)
            return data.coins[0].large; // or .small, .thumb
        }
        return null;
    } catch (error) {
        console.error('Error fetching crypto logo:', error);
        return null;
    }
}

// Initialize the application by fetching available trading pairs
getPairs()

/**
 * Event listener for adding or updating a cryptocurrency tracker
 * Creates a new RecordKeeper instance or updates an existing one with new parameters
 */
document.getElementById('addCrypto').addEventListener('click', (event) => {
    const units = document.getElementById('inputAmount').value || 2
    const buyIn = document.getElementById('buyIn').value || 0
    const increase = 1 + (+document.getElementById('targetIncrease').value / 100 || .05)
    if (recordKeepers[select.value]) {
        recordKeepers[select.value].setTargetValue(increase, units, buyIn)
        document.getElementById(select.value).classList.remove('hidden');
    } else {
        if (units <= 0 || increase <= 0) return
        recordKeepers[select.value] = new RecordKeeper(units, increase, select.selectedOptions[0].text, select.value, templateHTML, buyIn)
    }
})