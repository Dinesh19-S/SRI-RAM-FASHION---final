import FabricPurchase from '../models/FabricPurchase.js';
import FabricPurchaseItem from '../models/FabricPurchaseItem.js';
import Bill from '../models/Bill.js';
import calculateTotals from '../utils/calculateTotals.js';
import { emitEvent } from '../services/socketService.js';
import mongoose from 'mongoose';

// @desc    Create new purchase
// @route   POST /api/fabric-purchases
// @access  Public
export const createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { items, ...purchaseData } = req.body;

    // Check if invoice number already exists
    const existingInvoice = await FabricPurchase.findOne({ invoice_number: purchaseData.invoice_number });
    if (existingInvoice) {
      return res.status(400).json({ success: false, message: 'Invoice number already exists' });
    }

    // Calculate totals
    const { total_rolls, total_weight, total_amount, items: processedItems } = calculateTotals(items);

    let purchase;
    await session.withTransaction(async () => {
      // Create purchase record
      purchase = await FabricPurchase.create([{
        ...purchaseData,
        total_rolls,
        total_weight,
        total_amount
      }], { session });
      purchase = purchase[0];

      // Create items and link to purchase
      const itemsToSave = processedItems.map(item => ({
        ...item,
        purchase_id: purchase._id
      }));

      await FabricPurchaseItem.insertMany(itemsToSave, { session });

      // Generate corresponding Bill
      const billCount = await Bill.countDocuments({ billType: 'PURCHASE' }).session(session);
      const billNumber = `PUR-FB-${(billCount + 1).toString().padStart(4, '0')}`;

      const bill = new Bill({
        billNumber,
        billType: 'PURCHASE',
        date: purchaseData.invoice_date || new Date(),
        referenceInvoiceNumber: purchaseData.invoice_number,
        partyName: purchaseData.supplier_name,
        customer: {
          name: purchaseData.supplier_name,
          phone: purchaseData.mobile || '',
          gstin: purchaseData.gstin || '',
          state: 'Tamilnadu',
          stateCode: '33'
        },
        items: processedItems.map(item => ({
            productName: item.fabric_name,
            quantity: item.weight_kg,
            price: item.rate_per_kg,
            total: item.amount,
            gstRate: 5 // Default for fabric
        })),
        subtotal: total_amount,
        taxableAmount: total_amount,
        grandTotal: total_amount,
        totalTax: 0,
        paymentStatus: 'paid',
        notes: `Fabric Purchase: ${processedItems.length} rolls, ${total_weight}kg`
      });

      await bill.save({ session });
      
      emitEvent('purchase:created', { data: purchase });
      emitEvent('bill:created', { data: bill });
    });

    res.status(201).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all purchases with pagination and search
// @route   GET /api/fabric-purchases
// @access  Public
export const getPurchases = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { supplier_name: { $regex: search, $options: 'i' } },
        { invoice_number: { $regex: search, $options: 'i' } }
      ];
    }

    const purchases = await FabricPurchase.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRecords = await FabricPurchase.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      data: purchases,
      pagination: {
        page,
        limit,
        totalPages,
        totalRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase by ID
// @route   GET /api/fabric-purchases/:id
// @access  Public
export const getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await FabricPurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    const items = await FabricPurchaseItem.find({ purchase_id: purchase._id });

    res.status(200).json({
      success: true,
      data: {
        ...purchase._doc,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase
// @route   PUT /api/fabric-purchases/:id
// @access  Public
export const updatePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { items, ...purchaseData } = req.body;
    
    let purchase = await FabricPurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    await session.withTransaction(async () => {
      // If invoice_number is changing, check if new one already exists
      const oldInvoiceNumber = purchase.invoice_number;
      if (purchaseData.invoice_number && purchaseData.invoice_number !== oldInvoiceNumber) {
        const existingInvoice = await FabricPurchase.findOne({ invoice_number: purchaseData.invoice_number }).session(session);
        if (existingInvoice) {
          throw new Error('New invoice number already exists');
        }
      }

      let processedItems = [];
      // If items are provided, recalculate and replace
      if (items && Array.isArray(items) && items.length > 0) {
        const totals = calculateTotals(items);
        processedItems = totals.items;
        
        purchaseData.total_rolls = totals.total_rolls;
        purchaseData.total_weight = totals.total_weight;
        purchaseData.total_amount = totals.total_amount;

        // Remove old items
        await FabricPurchaseItem.deleteMany({ purchase_id: purchase._id }, { session });

        // Add new items
        const itemsToSave = processedItems.map(item => ({
          ...item,
          purchase_id: purchase._id
        }));
        await FabricPurchaseItem.insertMany(itemsToSave, { session });
      }

      purchase = await FabricPurchase.findByIdAndUpdate(req.params.id, purchaseData, {
        new: true,
        runValidators: true,
        session
      });

      // Update corresponding Bill
      const bill = await Bill.findOne({ referenceInvoiceNumber: oldInvoiceNumber, billType: 'PURCHASE' }).session(session);
      if (bill) {
        bill.partyName = purchase.supplier_name;
        bill.customer.name = purchase.supplier_name;
        bill.customer.phone = purchase.mobile || bill.customer.phone;
        bill.customer.gstin = purchase.gstin || bill.customer.gstin;
        bill.referenceInvoiceNumber = purchase.invoice_number;
        bill.grandTotal = purchase.total_amount;
        bill.subtotal = purchase.total_amount;
        bill.taxableAmount = purchase.total_amount;
        bill.notes = `Fabric Purchase: ${purchase.total_rolls} rolls, ${purchase.total_weight}kg`;
        
        if (processedItems.length > 0) {
            bill.items = processedItems.map(item => ({
                productName: item.fabric_name,
                quantity: item.weight_kg,
                price: item.rate_per_kg,
                total: item.amount,
                gstRate: 5
            }));
        }

        await bill.save({ session });
        emitEvent('bill:updated', { id: bill._id, data: bill });
      }

      emitEvent('purchase:updated', { id: req.params.id, data: purchase });
    });

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Delete purchase
// @route   DELETE /api/fabric-purchases/:id
// @access  Public
export const deletePurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const purchase = await FabricPurchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    await session.withTransaction(async () => {
      // Delete associated Bill
      await Bill.deleteOne({ referenceInvoiceNumber: purchase.invoice_number, billType: 'PURCHASE' }, { session });
      
      // Delete associated items
      await FabricPurchaseItem.deleteMany({ purchase_id: purchase._id }, { session });
      
      // Delete purchase
      await purchase.deleteOne({ session });

      emitEvent('purchase:deleted', { id: req.params.id });
      emitEvent('bill:deleted', { reference: purchase.invoice_number });
    });

    res.status(200).json({
      success: true,
      message: 'Purchase and related records removed'
    });
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Search purchases
// @route   GET /api/fabric-purchases/search
// @access  Public
export const searchPurchases = async (req, res, next) => {
  try {
    const queryTerm = req.query.q || '';
    
    const purchases = await FabricPurchase.find({
      $or: [
        { supplier_name: { $regex: queryTerm, $options: 'i' } },
        { invoice_number: { $regex: queryTerm, $options: 'i' } }
      ]
    }).limit(20);

    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    next(error);
  }
};
