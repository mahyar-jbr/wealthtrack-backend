import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../services/database';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

// Get all assets for authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const assets = await prisma.asset.findMany({
      where: {
        user_id: userId
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Convert Decimal types to numbers for response
    const formattedAssets = assets.map(asset => ({
      id: asset.id,
      user_id: asset.user_id,
      type: asset.type,
      symbol: asset.symbol,
      name: asset.name,
      quantity: Number(asset.quantity),
      purchase_price: Number(asset.purchase_price),
      purchase_date: asset.purchase_date,
      created_at: asset.created_at,
      updated_at: asset.updated_at
    }));

    res.json({ assets: formattedAssets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Get single asset by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const assetId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        user_id: userId
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const formattedAsset = {
      id: asset.id,
      user_id: asset.user_id,
      type: asset.type,
      symbol: asset.symbol,
      name: asset.name,
      quantity: Number(asset.quantity),
      purchase_price: Number(asset.purchase_price),
      purchase_date: asset.purchase_date,
      created_at: asset.created_at,
      updated_at: asset.updated_at
    };

    res.json({ asset: formattedAsset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// Create new asset
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { symbol, name, quantity, purchase_price, type, purchase_date } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!symbol || !name || quantity === undefined || purchase_price === undefined || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: symbol, name, quantity, purchase_price, and type are required' 
      });
    }

    // Validate asset type
    const validTypes = ['STOCK', 'CRYPTO', 'ETF', 'BOND', 'OTHER'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid asset type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate quantity is positive
    if (parseFloat(quantity) <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }

    // Validate purchase price is non-negative
    if (parseFloat(purchase_price) < 0) {
      return res.status(400).json({ 
        error: 'Purchase price cannot be negative' 
      });
    }

    // Create the asset
    const asset = await prisma.asset.create({
      data: {
        user_id: userId,
        symbol: symbol.toUpperCase(),
        name,
        quantity: new Decimal(quantity),
        purchase_price: new Decimal(purchase_price),
        type,
        purchase_date: purchase_date ? new Date(purchase_date) : new Date()
      }
    });

    // Convert Decimal fields to numbers for response
    const responseAsset = {
      id: asset.id,
      user_id: asset.user_id,
      type: asset.type,
      symbol: asset.symbol,
      name: asset.name,
      quantity: Number(asset.quantity),
      purchase_price: Number(asset.purchase_price),
      purchase_date: asset.purchase_date,
      created_at: asset.created_at,
      updated_at: asset.updated_at
    };

    res.status(201).json({ 
      message: 'Asset created successfully', 
      asset: responseAsset 
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// Delete asset
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const assetId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if asset exists and belongs to user
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        user_id: userId
      }
    });

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Delete the asset
    await prisma.asset.delete({
      where: {
        id: assetId
      }
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;