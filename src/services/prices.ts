import axios from 'axios';
import yahooFinance from 'yahoo-finance2';
import prisma from './database';

// CoinGecko API (free, no key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache duration in minutes
const CACHE_DURATION_MINUTES = 5;

// Crypto symbol to CoinGecko ID mapping
const CRYPTO_MAPPINGS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'SHIB': 'shiba-inu',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin'
};

// Stock symbols we support (expandable)
const SUPPORTED_STOCKS = [
  'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 
  'META', 'NVDA', 'AMD', 'NFLX', 'DIS',
  'JPM', 'V', 'WMT', 'PG', 'MA',
  'PYPL', 'INTC', 'CSCO', 'PFE', 'KO'
];

interface PriceData {
  symbol: string;
  price: number;
  change24h?: number;
  changePercent24h?: number;
  lastUpdated: Date;
  source: 'coingecko' | 'yahoo' | 'manual';
}

export class PriceService {
  /**
   * Get price for a single symbol
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    const upperSymbol = symbol.toUpperCase();
    
    // Check cache first
    const cachedPrice = await this.getCachedPrice(upperSymbol);
    if (cachedPrice) {
      console.log(`Price for ${upperSymbol} found in cache`);
      return cachedPrice;
    }

    // Determine if it's crypto or stock
    if (CRYPTO_MAPPINGS[upperSymbol]) {
      return await this.fetchCryptoPrice(upperSymbol);
    } else if (this.isStockSymbol(upperSymbol)) {
      return await this.fetchStockPrice(upperSymbol);
    }

    console.log(`Symbol ${upperSymbol} not supported`);
    return null;
  }

  /**
   * Get prices for multiple symbols
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData | null>> {
    const prices = new Map<string, PriceData | null>();
    
    // Separate crypto and stocks
    const cryptoSymbols = symbols.filter(s => CRYPTO_MAPPINGS[s.toUpperCase()]);
    const stockSymbols = symbols.filter(s => this.isStockSymbol(s.toUpperCase()));

    // Fetch crypto prices in batch (more efficient)
    if (cryptoSymbols.length > 0) {
      const cryptoPrices = await this.fetchCryptoPricesBatch(cryptoSymbols);
      cryptoPrices.forEach((price, symbol) => prices.set(symbol, price));
    }

    // Fetch stock prices individually (Yahoo Finance doesn't support batch in free tier)
    for (const symbol of stockSymbols) {
      const price = await this.getPrice(symbol);
      prices.set(symbol.toUpperCase(), price);
    }

    return prices;
  }

  /**
   * Check if symbol is a stock (basic check - any non-crypto symbol)
   */
  private isStockSymbol(symbol: string): boolean {
    // Check if it's in our supported list OR 
    // if it looks like a stock symbol (1-5 uppercase letters, not in crypto map)
    return SUPPORTED_STOCKS.includes(symbol) || 
           (/^[A-Z]{1,5}$/.test(symbol) && !CRYPTO_MAPPINGS[symbol]);
  }

  /**
   * Fetch single crypto price from CoinGecko
   */
  private async fetchCryptoPrice(symbol: string): Promise<PriceData | null> {
    try {
      const coinId = CRYPTO_MAPPINGS[symbol];
      if (!coinId) return null;

      console.log(`Fetching ${symbol} price from CoinGecko...`);
      
      const response = await axios.get(
        `${COINGECKO_API}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true
          }
        }
      );

      const data = response.data[coinId];
      if (!data) return null;

      const priceData: PriceData = {
        symbol,
        price: data.usd,
        change24h: data.usd_24h_change,
        changePercent24h: data.usd_24h_change,
        lastUpdated: new Date(),
        source: 'coingecko'
      };

      // Cache the price
      await this.cachePrice(priceData);

      return priceData;
    } catch (error) {
      console.error(`Error fetching ${symbol} price from CoinGecko:`, error);
      return null;
    }
  }

  /**
   * Fetch stock price from Yahoo Finance
   */
  private async fetchStockPrice(symbol: string): Promise<PriceData | null> {
    try {
      console.log(`Fetching ${symbol} price from Yahoo Finance...`);
      
      // Yahoo Finance quote includes real-time price data
      const quote = await yahooFinance.quote(symbol);
      
      if (!quote || !quote.regularMarketPrice) {
        console.log(`No price data available for ${symbol}`);
        return null;
      }

      const priceData: PriceData = {
        symbol: symbol.toUpperCase(),
        price: quote.regularMarketPrice,
        change24h: quote.regularMarketChange || 0,
        changePercent24h: quote.regularMarketChangePercent || 0,
        lastUpdated: new Date(),
        source: 'yahoo'
      };

      // Cache the price
      await this.cachePrice(priceData);

      console.log(`Fetched ${symbol} at $${quote.regularMarketPrice} from Yahoo Finance`);
      return priceData;
    } catch (error: any) {
      console.error(`Error fetching ${symbol} price from Yahoo Finance:`, error.message);
      
      // Fall back to manual/mock price if Yahoo fails
      return this.fetchManualStockPrice(symbol);
    }
  }

  /**
   * Fallback manual stock price (when Yahoo Finance fails)
   */
  private async fetchManualStockPrice(symbol: string): Promise<PriceData> {
    // Generate consistent mock price based on symbol
    const mockPrices: Record<string, number> = {
      'AAPL': 182.50,
      'GOOGL': 142.30,
      'MSFT': 378.90,
      'TSLA': 245.60,
      'AMZN': 155.20,
      'META': 362.40,
      'NVDA': 487.30,
      'AMD': 167.80,
      'NFLX': 445.60,
      'DIS': 92.30
    };

    const price = mockPrices[symbol] || 100;
    const priceData: PriceData = {
      symbol,
      price,
      change24h: 0,
      changePercent24h: 0,
      lastUpdated: new Date(),
      source: 'manual'
    };

    await this.cachePrice(priceData);
    return priceData;
  }

  /**
   * Fetch multiple crypto prices in one request (more efficient)
   */
  private async fetchCryptoPricesBatch(symbols: string[]): Promise<Map<string, PriceData | null>> {
    const prices = new Map<string, PriceData | null>();
    
    try {
      // Convert symbols to CoinGecko IDs
      const coinIds = symbols
        .map(s => CRYPTO_MAPPINGS[s.toUpperCase()])
        .filter(id => id !== undefined);

      if (coinIds.length === 0) return prices;

      console.log(`Fetching batch prices for cryptos: ${symbols.join(', ')}`);

      const response = await axios.get(
        `${COINGECKO_API}/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true
          }
        }
      );

      // Process response and map back to symbols
      for (const symbol of symbols) {
        const upperSymbol = symbol.toUpperCase();
        const coinId = CRYPTO_MAPPINGS[upperSymbol];
        
        if (coinId && response.data[coinId]) {
          const data = response.data[coinId];
          const priceData: PriceData = {
            symbol: upperSymbol,
            price: data.usd,
            change24h: data.usd_24h_change,
            changePercent24h: data.usd_24h_change,
            lastUpdated: new Date(),
            source: 'coingecko'
          };
          
          await this.cachePrice(priceData);
          prices.set(upperSymbol, priceData);
        } else {
          prices.set(upperSymbol, null);
        }
      }
    } catch (error) {
      console.error('Error fetching batch crypto prices:', error);
      // Return nulls for all symbols on error
      symbols.forEach(s => prices.set(s.toUpperCase(), null));
    }

    return prices;
  }

  /**
   * Get cached price from database
   */
  private async getCachedPrice(symbol: string): Promise<PriceData | null> {
    try {
      const cached = await prisma.priceCache.findUnique({
        where: { symbol }
      });

      if (!cached) return null;

      // Check if cache is still valid
      const cacheAge = Date.now() - cached.updated_at.getTime();
      const maxAge = CACHE_DURATION_MINUTES * 60 * 1000;

      if (cacheAge > maxAge) {
        console.log(`Cache for ${symbol} is expired`);
        return null;
      }

      // Determine source based on symbol type
      const source = CRYPTO_MAPPINGS[symbol] ? 'coingecko' : 'yahoo';

      return {
        symbol: cached.symbol,
        price: Number(cached.current_price),
        lastUpdated: cached.updated_at,
        source: source as 'coingecko' | 'yahoo'
      };
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  /**
   * Cache price in database
   */
  private async cachePrice(priceData: PriceData): Promise<void> {
    try {
      await prisma.priceCache.upsert({
        where: { symbol: priceData.symbol },
        create: {
          symbol: priceData.symbol,
          current_price: priceData.price
        },
        update: {
          current_price: priceData.price,
          updated_at: new Date()
        }
      });
      console.log(`Cached price for ${priceData.symbol}: $${priceData.price.toFixed(2)}`);
    } catch (error) {
      console.error('Error caching price:', error);
    }
  }

  /**
   * Update prices for all unique symbols in user assets
   */
  async updateAllAssetPrices(): Promise<void> {
    try {
      // Get all unique symbols from assets
      const assets = await prisma.asset.findMany({
        select: { symbol: true },
        distinct: ['symbol']
      });

      const symbols = assets.map(a => a.symbol);
      console.log(`Updating prices for ${symbols.length} unique symbols`);

      // Fetch prices in batch
      await this.getPrices(symbols);
      
      console.log('Price update complete');
    } catch (error) {
      console.error('Error updating all asset prices:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const expirationTime = new Date(Date.now() - CACHE_DURATION_MINUTES * 60 * 1000);
      
      await prisma.priceCache.deleteMany({
        where: {
          updated_at: {
            lt: expirationTime
          }
        }
      });
      
      console.log('Expired cache entries cleared');
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}

// Export singleton instance
export const priceService = new PriceService();