import axios from 'axios';
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
  'SHIB': 'shiba-inu'
};

// Stock symbols we support (Yahoo Finance will be added later)
const SUPPORTED_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'AMD', 'NFLX', 'DIS'];

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
    } else if (SUPPORTED_STOCKS.includes(upperSymbol)) {
      // For now, return mock data for stocks (Yahoo Finance in next step)
      return await this.fetchMockStockPrice(upperSymbol);
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
    const stockSymbols = symbols.filter(s => SUPPORTED_STOCKS.includes(s.toUpperCase()));

    // Fetch crypto prices in batch (more efficient)
    if (cryptoSymbols.length > 0) {
      const cryptoPrices = await this.fetchCryptoPricesBatch(cryptoSymbols);
      cryptoPrices.forEach((price, symbol) => prices.set(symbol, price));
    }

    // Fetch stock prices (mock for now)
    for (const symbol of stockSymbols) {
      const price = await this.getPrice(symbol);
      prices.set(symbol.toUpperCase(), price);
    }

    return prices;
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
      console.error(`Error fetching ${symbol} price:`, error);
      return null;
    }
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

      console.log(`Fetching batch prices for: ${symbols.join(', ')}`);

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
   * Mock stock price (will be replaced with Yahoo Finance)
   */
  private async fetchMockStockPrice(symbol: string): Promise<PriceData> {
    // Generate mock price based on symbol (consistent but fake)
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
      change24h: Math.random() * 10 - 5, // Random change between -5 and +5
      changePercent24h: ((Math.random() * 10 - 5) / price) * 100,
      lastUpdated: new Date(),
      source: 'manual'
    };

    await this.cachePrice(priceData);
    return priceData;
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

      return {
        symbol: cached.symbol,
        price: Number(cached.current_price),
        lastUpdated: cached.updated_at,
        source: 'coingecko' // Will be stored in DB in future update
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
      console.log(`Cached price for ${priceData.symbol}: $${priceData.price}`);
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
}

// Export singleton instance
export const priceService = new PriceService();