import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';

// Pre-load all models to ensure they are registered with mongoose
import '../models/Category.js';
import '../models/Customer.js';
import '../models/HSN.js';
import '../models/Payment.js';
import '../models/Product.js';
import '../models/PurchaseEntry.js';
import '../models/SalesEntry.js';
import '../models/StockMovement.js';
import '../models/Supplier.js';
import '../models/Bill.js';
import '../models/Settings.js';

const router = express.Router();

// List of all models to backup
const MODEL_NAMES = [
    'Category',
    'Customer',
    'HSN',
    'Payment',
    'Product',
    'PurchaseEntry',
    'SalesEntry',
    'StockMovement',
    'Supplier',
    'Bill',
    'Settings'
];

/**
 * @route   GET /api/v1/backup/export
 * @desc    Export all collection data as JSON
 * @access  Private (Admin)
 */
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const backupData = {};
        
        for (const modelName of MODEL_NAMES) {
            const Model = mongoose.model(modelName);
            const data = await Model.find({}).lean();
            backupData[modelName.toLowerCase()] = data;
        }

        res.json({
            success: true,
            message: 'Backup data exported successfully',
            data: backupData
        });
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/v1/backup/import
 * @desc    Import JSON data into collections (Clears existing data)
 * @access  Private (Admin)
 */
router.post('/import', authenticateToken, async (req, res) => {
    try {
        const { backupData } = req.body;
        if (!backupData) {
            return res.status(400).json({ success: false, message: 'No backup data provided' });
        }

        const results = {};

        // Use a transaction if possible, but for simplicity and compatibility 
        // we'll process models one by one.
        for (const modelName of MODEL_NAMES) {
            const key = modelName.toLowerCase();
            const data = backupData[key];
            
            if (data && Array.isArray(data) && data.length > 0) {
                const Model = mongoose.model(modelName);
                
                // 1. Clear existing data
                await Model.deleteMany({});
                
                // 2. Insert backup data
                // We use insertMany which is efficient
                await Model.insertMany(data);
                
                results[key] = `Restored ${data.length} records`;
            }
        }

        res.json({
            success: true,
            message: 'Data restored successfully',
            results
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
