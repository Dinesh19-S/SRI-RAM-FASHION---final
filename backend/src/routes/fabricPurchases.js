import express from 'express';
import { body } from 'express-validator';
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  searchPurchases
} from '../controllers/fabricPurchaseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const purchaseValidation = [
  body('supplier_name').notEmpty().withMessage('Supplier name is required'),
  body('invoice_number').notEmpty().withMessage('Invoice number is required'),
  body('invoice_date').notEmpty().withMessage('Invoice date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.fabric_name').notEmpty().withMessage('Fabric name is required for each item'),
  body('items.*.weight_kg').isNumeric().withMessage('Weight must be a number'),
  body('items.*.rate_per_kg').isNumeric().withMessage('Rate must be a number')
];

// Routes
router.route('/search').get(authenticateToken, searchPurchases);

router.route('/')
  .get(authenticateToken, getPurchases)
  .post(authenticateToken, purchaseValidation, validate, createPurchase);

router.route('/:id')
  .get(authenticateToken, getPurchaseById)
  .put(authenticateToken, purchaseValidation, validate, updatePurchase)
  .delete(authenticateToken, deletePurchase);

export default router;
