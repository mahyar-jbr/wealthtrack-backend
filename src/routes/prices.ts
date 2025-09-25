import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../services/database';
import { priceService } from '../services/prices';

const router = Router();

/**
 * Get current price for a single symbol
 * GET /api/prices/:symbol
 */
router.get('/:symbol', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    const priceData = await priceService.getPrice(symbol);
    
    if (!priceData) {
      return res.status(404).json({ 
        error: `Price data not available for ${symbol}` 
      });
    }

    res.json(priceData);
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({ error: 'Failed to fetch price data' });
  }
});

/**
 * Get current portfolio value with price updates
 * GET /api/prices/portfolio/value
 */
router.get('/portfolio/value', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's assets
    const assets = await prisma.asset.findMany({
      where: { user_id: userId }
    });

    if (assets.length === 0) {
      return res.json({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        assets: []
      });
    }

    // Get unique symbols
    const symbols = [...new Set(assets.map(a => a.symbol))];
    
    // Fetch current prices
    const prices = await priceService.getPrices(symbols);

    // Calculate portfolio values
    let totalValue = 0;
    let totalCost = 0;
    const assetsWithPrices = assets.map(asset => {
      const quantity = Number(asset.quantity);
      const purchasePrice = Number(asset.purchase_price);
      const cost = quantity * purchasePrice;
      
      const priceData = prices.get(asset.symbol);
      const currentPrice = priceData?.price || purchasePrice; // Fallback to purchase price
      const currentValue = quantity * currentPrice;
      const gainLoss = currentValue - cost;
      const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0;

      totalValue += currentValue;
      totalCost += cost;

      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        quantity: quantity,
        purchasePrice: purchasePrice,
        currentPrice: currentPrice,
        cost: cost,
        currentValue: currentValue,
        gainLoss: gainLoss,
        gainLossPercent: gainLossPercent,
        lastPriceUpdate: priceData?.lastUpdated || null,
        priceSource: priceData?.source || 'manual'
      };
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    res.json({
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      assets: assetsWithPrices
    });
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    res.status(500).json({ error: 'Failed to calculate portfolio value' });
  }
});

/**
 * Update prices for all assets in the database
 * POST /api/prices/update-all
 * (Admin or scheduled job endpoint)
 */
router.post('/update-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await priceService.updateAllAssetPrices();
    res.json({ message: 'Price update initiated' });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

/**
 * Get cached prices for multiple symbols
 * POST /api/prices/batch
 * Body: { symbols: string[] }
 */
router.post('/batch', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }

    const prices = await priceService.getPrices(symbols);
    
    // Convert Map to object for JSON response
    const pricesObject: any = {};
    prices.forEach((value, key) => {
      pricesObject[key] = value;
    });

    res.json(pricesObject);
  } catch (error) {
    console.error('Error fetching batch prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

export default router;