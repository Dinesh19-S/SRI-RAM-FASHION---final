import mongoose from 'mongoose';
import 'dotenv/config';
import FabricPurchase from '../models/FabricPurchase.js';
import FabricPurchaseItem from '../models/FabricPurchaseItem.js';
import calculateTotals from './calculateTotals.js';

const MONGODB_URI = process.env.MONGODB_URI;

const samplePurchases = [
  {
    supplier_name: 'Vardhaman Fabrics',
    gstin: '33AAACV1234A1Z1',
    mobile: '9876543210',
    invoice_number: 'INV/FAB/001',
    invoice_date: new Date('2026-05-10'),
    transport: 'Safe Express',
    vehicle_number: 'TN 37 AB 1234',
    lr_number: 'LR123456',
    items: [
      { fabric_name: 'Cotton Jersey', color: 'Navy Blue', gsm: 180, roll_no: 'R01', weight_kg: 25.5, rate_per_kg: 450 },
      { fabric_name: 'Cotton Jersey', color: 'White', gsm: 180, roll_no: 'R02', weight_kg: 24.8, rate_per_kg: 450 }
    ]
  },
  {
    supplier_name: 'Luthra Textiles',
    gstin: '24BBBDL5678B2Z2',
    mobile: '9988776655',
    invoice_number: 'LT/2026/987',
    invoice_date: new Date('2026-05-12'),
    transport: 'Gati',
    vehicle_number: 'MH 12 CD 5678',
    lr_number: 'GATI9876',
    items: [
      { fabric_name: 'Polyester Interlock', color: 'Red', gsm: 160, roll_no: 'R101', weight_kg: 30.2, rate_per_kg: 280 },
      { fabric_name: 'Polyester Interlock', color: 'Black', gsm: 160, roll_no: 'R102', weight_kg: 29.5, rate_per_kg: 280 }
    ]
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing fabric data
    await FabricPurchase.deleteMany({});
    await FabricPurchaseItem.deleteMany({});
    console.log('Cleared existing fabric purchases and items');

    for (const data of samplePurchases) {
      const { items, ...purchaseData } = data;
      const { total_rolls, total_weight, total_amount, items: processedItems } = calculateTotals(items);

      const purchase = await FabricPurchase.create({
        ...purchaseData,
        total_rolls,
        total_weight,
        total_amount
      });

      const itemsToSave = processedItems.map(item => ({
        ...item,
        purchase_id: purchase._id
      }));

      await FabricPurchaseItem.insertMany(itemsToSave);
      console.log(`Seeded purchase: ${purchase.invoice_number}`);
    }

    console.log('Successfully seeded fabric purchase data!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
