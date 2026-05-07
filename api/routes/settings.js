import express from 'express';
import Settings from '../models/Settings.js';
// authorizeRoles removed — any authenticated user can manage settings

const router = express.Router();

// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(req.body);
        } else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload logo
router.post('/logo', async (req, res) => {
    try {
        // In production, handle file upload with multer
        res.json({ success: true, message: 'Logo uploaded' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
