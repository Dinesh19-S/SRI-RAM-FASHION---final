import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Bill from './models/Bill.js';
import Settings from './models/Settings.js';

const MONGODB_URI = process.env.MONGODB_URI;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@sriramfashions.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME?.trim() || 'Admin User';
const SEED_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE?.trim() || '9876543210';

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is missing in .env file');
    process.exit(1);
}

if (!SEED_ADMIN_PASSWORD) {
    console.error('ERROR: SEED_ADMIN_PASSWORD is missing in .env file');
    process.exit(1);
}

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // WARNING: this is destructive and clears all existing data.
        await User.deleteMany({});
        await Category.deleteMany({});
        await Product.deleteMany({});
        await Bill.deleteMany({});
        await Settings.deleteMany({});
        console.log('Cleared existing data');

        const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
        const admin = await User.create({
            name: SEED_ADMIN_NAME,
            email: SEED_ADMIN_EMAIL,
            password: hashedPassword,
            phone: SEED_ADMIN_PHONE,
            role: 'admin',
            isActive: true
        });
        console.log('Admin user created');

        const categories = await Category.insertMany([
            { name: 'Sarees', description: 'Traditional and designer sarees' },
            { name: 'Kurtas', description: 'Men and women kurtas' },
            { name: 'Lehengas', description: 'Bridal and party wear lehengas' },
            { name: 'Dupattas', description: 'Silk and cotton dupattas' },
            { name: 'Suits', description: 'Salwar suits and dress materials' }
        ]);
        console.log('Categories created');

        const products = await Product.insertMany([
            // Sarees (Category 0)
            { name: 'Banarasi Silk Saree - Red', sku: 'SAR001', category: categories[0]._id, mrp: 4500, sellingPrice: 3999, stock: 15, gstRate: 12, hsn: '5007', lowStockThreshold: 5 },
            { name: 'Kanjivaram Silk Saree - Gold', sku: 'SAR002', category: categories[0]._id, mrp: 8500, sellingPrice: 7499, stock: 8, gstRate: 12, hsn: '5007', lowStockThreshold: 3 },
            { name: 'Cotton Saree - Blue', sku: 'SAR003', category: categories[0]._id, mrp: 1800, sellingPrice: 1499, stock: 25, gstRate: 5, hsn: '5208', lowStockThreshold: 10 },
            { name: 'Georgette Saree - Pink', sku: 'SAR004', category: categories[0]._id, mrp: 2500, sellingPrice: 2199, stock: 3, gstRate: 12, hsn: '5407', lowStockThreshold: 5 },
            { name: 'Silk Saree - Green', sku: 'SAR005', category: categories[0]._id, mrp: 5500, sellingPrice: 4799, stock: 12, gstRate: 12, hsn: '5007', lowStockThreshold: 4 },
            { name: 'Cotton Saree - Red', sku: 'SAR006', category: categories[0]._id, mrp: 2000, sellingPrice: 1699, stock: 18, gstRate: 5, hsn: '5208', lowStockThreshold: 7 },
            { name: 'Chiffon Saree - Yellow', sku: 'SAR007', category: categories[0]._id, mrp: 2800, sellingPrice: 2399, stock: 9, gstRate: 12, hsn: '5407', lowStockThreshold: 4 },
            
            // Kurtas (Category 1)
            { name: 'Silk Kurta - Blue', sku: 'KUR001', category: categories[1]._id, mrp: 1200, sellingPrice: 999, stock: 30, gstRate: 12, hsn: '6206', lowStockThreshold: 8 },
            { name: 'Cotton Kurta Set - White', sku: 'KUR002', category: categories[1]._id, mrp: 1500, sellingPrice: 1299, stock: 20, gstRate: 5, hsn: '6206', lowStockThreshold: 5 },
            { name: 'Designer Kurta - Maroon', sku: 'KUR003', category: categories[1]._id, mrp: 2200, sellingPrice: 1899, stock: 4, gstRate: 12, hsn: '6206', lowStockThreshold: 5 },
            { name: 'Cotton Kurta - Black', sku: 'KUR004', category: categories[1]._id, mrp: 1400, sellingPrice: 1199, stock: 22, gstRate: 5, hsn: '6206', lowStockThreshold: 6 },
            { name: 'Silk Kurta - Orange', sku: 'KUR005', category: categories[1]._id, mrp: 1300, sellingPrice: 1099, stock: 16, gstRate: 12, hsn: '6206', lowStockThreshold: 5 },
            
            // Lehengas (Category 2)
            { name: 'Bridal Lehenga - Red Gold', sku: 'LEH001', category: categories[2]._id, mrp: 25000, sellingPrice: 21999, stock: 5, gstRate: 12, hsn: '6204', lowStockThreshold: 2 },
            { name: 'Party Lehenga - Purple', sku: 'LEH002', category: categories[2]._id, mrp: 8500, sellingPrice: 7499, stock: 7, gstRate: 12, hsn: '6204', lowStockThreshold: 3 },
            { name: 'Wedding Lehenga - Golden', sku: 'LEH003', category: categories[2]._id, mrp: 30000, sellingPrice: 26999, stock: 3, gstRate: 12, hsn: '6204', lowStockThreshold: 1 },
            { name: 'Party Lehenga - Blue', sku: 'LEH004', category: categories[2]._id, mrp: 9000, sellingPrice: 7999, stock: 6, gstRate: 12, hsn: '6204', lowStockThreshold: 2 },
            
            // Dupattas (Category 3)
            { name: 'Chiffon Dupatta - Multi', sku: 'DUP001', category: categories[3]._id, mrp: 600, sellingPrice: 499, stock: 50, gstRate: 5, hsn: '6214', lowStockThreshold: 15 },
            { name: 'Silk Dupatta - Gold', sku: 'DUP002', category: categories[3]._id, mrp: 1200, sellingPrice: 999, stock: 25, gstRate: 12, hsn: '6214', lowStockThreshold: 8 },
            { name: 'Cotton Dupatta - Red', sku: 'DUP003', category: categories[3]._id, mrp: 500, sellingPrice: 399, stock: 60, gstRate: 5, hsn: '6214', lowStockThreshold: 20 },
            { name: 'Silk Dupatta - Pink', sku: 'DUP004', category: categories[3]._id, mrp: 1100, sellingPrice: 899, stock: 30, gstRate: 12, hsn: '6214', lowStockThreshold: 10 },
            
            // Suits (Category 4)
            { name: 'Anarkali Suit - Green', sku: 'SUT001', category: categories[4]._id, mrp: 3500, sellingPrice: 2999, stock: 12, gstRate: 12, hsn: '6204', lowStockThreshold: 4 },
            { name: 'Salwar Suit - Blue', sku: 'SUT002', category: categories[4]._id, mrp: 2800, sellingPrice: 2399, stock: 14, gstRate: 5, hsn: '6204', lowStockThreshold: 5 },
            { name: 'Designer Suit - Pink', sku: 'SUT003', category: categories[4]._id, mrp: 4200, sellingPrice: 3699, stock: 8, gstRate: 12, hsn: '6204', lowStockThreshold: 3 },
            { name: 'Cotton Suit - Cream', sku: 'SUT004', category: categories[4]._id, mrp: 2200, sellingPrice: 1899, stock: 18, gstRate: 5, hsn: '6204', lowStockThreshold: 6 }
        ]);
        console.log('Products created (25 items)');

        const generateBillNumber = () => {
            const date = new Date();
            const y = date.getFullYear().toString().slice(-2);
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `SRF${y}${m}${r}`;
        };

        const sampleBills = [
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Ramesh Kumar', phone: '9876543211', address: 'Chennai' },
                items: [
                    { product: products[0]._id, productName: products[0].name, sku: products[0].sku, quantity: 1, price: 3999, gstRate: 12, gstAmount: 480, total: 4479 }
                ],
                subtotal: 3999,
                discountAmount: 0,
                taxableAmount: 3999,
                cgst: 240,
                sgst: 240,
                totalTax: 480,
                grandTotal: 4479,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Priya Sharma', phone: '9876543212', address: 'Mumbai' },
                items: [
                    { product: products[7]._id, productName: products[7].name, sku: products[7].sku, quantity: 2, price: 999, gstRate: 12, gstAmount: 240, total: 2238 },
                    { product: products[17]._id, productName: products[17].name, sku: products[17].sku, quantity: 1, price: 499, gstRate: 5, gstAmount: 25, total: 524 }
                ],
                subtotal: 2497,
                discountAmount: 0,
                taxableAmount: 2497,
                cgst: 132,
                sgst: 133,
                totalTax: 265,
                grandTotal: 2762,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Anjali Verma', phone: '9876543213', address: 'Bangalore' },
                items: [
                    { product: products[1]._id, productName: products[1].name, sku: products[1].sku, quantity: 1, price: 7499, gstRate: 12, gstAmount: 900, total: 8399 }
                ],
                subtotal: 7499,
                discountAmount: 500,
                taxableAmount: 6999,
                cgst: 420,
                sgst: 420,
                totalTax: 840,
                grandTotal: 7839,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Deepak Singh', phone: '9876543214', address: 'Delhi' },
                items: [
                    { product: products[12]._id, productName: products[12].name, sku: products[12].sku, quantity: 1, price: 21999, gstRate: 12, gstAmount: 2640, total: 24639 }
                ],
                subtotal: 21999,
                discountAmount: 1000,
                taxableAmount: 20999,
                cgst: 1260,
                sgst: 1260,
                totalTax: 2520,
                grandTotal: 23519,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Meera Patel', phone: '9876543215', address: 'Ahmedabad' },
                items: [
                    { product: products[8]._id, productName: products[8].name, sku: products[8].sku, quantity: 3, price: 1199, gstRate: 12, gstAmount: 432, total: 3840 },
                    { product: products[18]._id, productName: products[18].name, sku: products[18].sku, quantity: 2, price: 399, gstRate: 5, gstAmount: 40, total: 838 }
                ],
                subtotal: 3597,
                discountAmount: 200,
                taxableAmount: 3397,
                cgst: 204,
                sgst: 204,
                totalTax: 408,
                grandTotal: 3805,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Varsha Iyer', phone: '9876543216', address: 'Kochi' },
                items: [
                    { product: products[3]._id, productName: products[3].name, sku: products[3].sku, quantity: 2, price: 2199, gstRate: 12, gstAmount: 528, total: 4926 }
                ],
                subtotal: 4398,
                discountAmount: 0,
                taxableAmount: 4398,
                cgst: 264,
                sgst: 264,
                totalTax: 528,
                grandTotal: 4926,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Sunita Gupta', phone: '9876543217', address: 'Pune' },
                items: [
                    { product: products[13]._id, productName: products[13].name, sku: products[13].sku, quantity: 1, price: 7999, gstRate: 12, gstAmount: 960, total: 8959 }
                ],
                subtotal: 7999,
                discountAmount: 0,
                taxableAmount: 7999,
                cgst: 480,
                sgst: 480,
                totalTax: 960,
                grandTotal: 8959,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Nikita Deshpande', phone: '9876543218', address: 'Kolkata' },
                items: [
                    { product: products[4]._id, productName: products[4].name, sku: products[4].sku, quantity: 1, price: 4799, gstRate: 12, gstAmount: 576, total: 5375 },
                    { product: products[19]._id, productName: products[19].name, sku: products[19].sku, quantity: 1, price: 899, gstRate: 12, gstAmount: 108, total: 1007 }
                ],
                subtotal: 5698,
                discountAmount: 300,
                taxableAmount: 5398,
                cgst: 324,
                sgst: 324,
                totalTax: 648,
                grandTotal: 6046,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Rekha Desai', phone: '9876543219', address: 'Surat' },
                items: [
                    { product: products[2]._id, productName: products[2].name, sku: products[2].sku, quantity: 3, price: 1499, gstRate: 5, gstAmount: 225, total: 4722 }
                ],
                subtotal: 4497,
                discountAmount: 0,
                taxableAmount: 4497,
                cgst: 112,
                sgst: 112,
                totalTax: 224,
                grandTotal: 4721,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Pooja Malhar', phone: '9876543220', address: 'Hyderabad' },
                items: [
                    { product: products[20]._id, productName: products[20].name, sku: products[20].sku, quantity: 1, price: 2999, gstRate: 12, gstAmount: 360, total: 3359 }
                ],
                subtotal: 2999,
                discountAmount: 100,
                taxableAmount: 2899,
                cgst: 174,
                sgst: 174,
                totalTax: 348,
                grandTotal: 3247,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Ritika Singh', phone: '9876543221', address: 'Jaipur' },
                items: [
                    { product: products[5]._id, productName: products[5].name, sku: products[5].sku, quantity: 2, price: 1699, gstRate: 5, gstAmount: 170, total: 3568 }
                ],
                subtotal: 3398,
                discountAmount: 0,
                taxableAmount: 3398,
                cgst: 85,
                sgst: 85,
                totalTax: 170,
                grandTotal: 3568,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Divya Nair', phone: '9876543222', address: 'Lucknow' },
                items: [
                    { product: products[9]._id, productName: products[9].name, sku: products[9].sku, quantity: 1, price: 999, gstRate: 12, gstAmount: 120, total: 1119 },
                    { product: products[15]._id, productName: products[15].name, sku: products[15].sku, quantity: 1, price: 26999, gstRate: 12, gstAmount: 3240, total: 30239 }
                ],
                subtotal: 27998,
                discountAmount: 1000,
                taxableAmount: 26998,
                cgst: 1620,
                sgst: 1620,
                totalTax: 3240,
                grandTotal: 30238,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Swati Menon', phone: '9876543223', address: 'Vadodara' },
                items: [
                    { product: products[6]._id, productName: products[6].name, sku: products[6].sku, quantity: 2, price: 2399, gstRate: 12, gstAmount: 576, total: 5374 }
                ],
                subtotal: 4798,
                discountAmount: 0,
                taxableAmount: 4798,
                cgst: 288,
                sgst: 288,
                totalTax: 576,
                grandTotal: 5374,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Harshita Goel', phone: '9876543224', address: 'Indore' },
                items: [
                    { product: products[11]._id, productName: products[11].name, sku: products[11].sku, quantity: 1, price: 1099, gstRate: 12, gstAmount: 132, total: 1231 }
                ],
                subtotal: 1099,
                discountAmount: 0,
                taxableAmount: 1099,
                cgst: 66,
                sgst: 66,
                totalTax: 132,
                grandTotal: 1231,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Amrita Chatterjee', phone: '9876543225', address: 'Nagpur' },
                items: [
                    { product: products[21]._id, productName: products[21].name, sku: products[21].sku, quantity: 2, price: 2399, gstRate: 5, gstAmount: 240, total: 5038 }
                ],
                subtotal: 4798,
                discountAmount: 0,
                taxableAmount: 4798,
                cgst: 120,
                sgst: 120,
                totalTax: 240,
                grandTotal: 5038,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Kavya Reddy', phone: '9876543226', address: 'Mysore' },
                items: [
                    { product: products[14]._id, productName: products[14].name, sku: products[14].sku, quantity: 1, price: 7499, gstRate: 12, gstAmount: 900, total: 8399 }
                ],
                subtotal: 7499,
                discountAmount: 500,
                taxableAmount: 6999,
                cgst: 420,
                sgst: 420,
                totalTax: 840,
                grandTotal: 7839,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Sneha Rao', phone: '9876543227', address: 'Nashik' },
                items: [
                    { product: products[10]._id, productName: products[10].name, sku: products[10].sku, quantity: 1, price: 999, gstRate: 12, gstAmount: 120, total: 1119 }
                ],
                subtotal: 999,
                discountAmount: 0,
                taxableAmount: 999,
                cgst: 60,
                sgst: 60,
                totalTax: 120,
                grandTotal: 1119,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Yukti Mishra', phone: '9876543228', address: 'Guwahati' },
                items: [
                    { product: products[22]._id, productName: products[22].name, sku: products[22].sku, quantity: 1, price: 3699, gstRate: 12, gstAmount: 444, total: 4143 }
                ],
                subtotal: 3699,
                discountAmount: 0,
                taxableAmount: 3699,
                cgst: 222,
                sgst: 222,
                totalTax: 444,
                grandTotal: 4143,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Shreya Chopra', phone: '9876543229', address: 'Ludhiana' },
                items: [
                    { product: products[16]._id, productName: products[16].name, sku: products[16].sku, quantity: 3, price: 399, gstRate: 5, gstAmount: 60, total: 1257 }
                ],
                subtotal: 1197,
                discountAmount: 0,
                taxableAmount: 1197,
                cgst: 30,
                sgst: 30,
                totalTax: 60,
                grandTotal: 1257,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Nimisha Kulkarni', phone: '9876543230', address: 'Ranchi' },
                items: [
                    { product: products[23]._id, productName: products[23].name, sku: products[23].sku, quantity: 2, price: 1899, gstRate: 5, gstAmount: 190, total: 3988 }
                ],
                subtotal: 3798,
                discountAmount: 200,
                taxableAmount: 3598,
                cgst: 90,
                sgst: 90,
                totalTax: 180,
                grandTotal: 3778,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Sophia Khan', phone: '9876543231', address: 'Visakhapatnam' },
                items: [
                    { product: products[0]._id, productName: products[0].name, sku: products[0].sku, quantity: 1, price: 3999, gstRate: 12, gstAmount: 480, total: 4479 }
                ],
                subtotal: 3999,
                discountAmount: 0,
                taxableAmount: 3999,
                cgst: 240,
                sgst: 240,
                totalTax: 480,
                grandTotal: 4479,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Zara Malik', phone: '9876543232', address: 'Srinagar' },
                items: [
                    { product: products[7]._id, productName: products[7].name, sku: products[7].sku, quantity: 1, price: 999, gstRate: 12, gstAmount: 120, total: 1119 },
                    { product: products[16]._id, productName: products[16].name, sku: products[16].sku, quantity: 2, price: 399, gstRate: 5, gstAmount: 40, total: 838 }
                ],
                subtotal: 1798,
                discountAmount: 0,
                taxableAmount: 1798,
                cgst: 108,
                sgst: 108,
                totalTax: 216,
                grandTotal: 2014,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Sakshi Patel', phone: '9876543233', address: 'Bhopal' },
                items: [
                    { product: products[1]._id, productName: products[1].name, sku: products[1].sku, quantity: 1, price: 7499, gstRate: 12, gstAmount: 900, total: 8399 }
                ],
                subtotal: 7499,
                discountAmount: 500,
                taxableAmount: 6999,
                cgst: 420,
                sgst: 420,
                totalTax: 840,
                grandTotal: 7839,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Aisha Begum', phone: '9876543234', address: 'Patna' },
                items: [
                    { product: products[12]._id, productName: products[12].name, sku: products[12].sku, quantity: 1, price: 21999, gstRate: 12, gstAmount: 2640, total: 24639 }
                ],
                subtotal: 21999,
                discountAmount: 1500,
                taxableAmount: 20499,
                cgst: 1230,
                sgst: 1230,
                totalTax: 2460,
                grandTotal: 22959,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Tanvi Reddy', phone: '9876543235', address: 'Chandigarh' },
                items: [
                    { product: products[8]._id, productName: products[8].name, sku: products[8].sku, quantity: 2, price: 1299, gstRate: 12, gstAmount: 312, total: 2910 }
                ],
                subtotal: 2598,
                discountAmount: 0,
                taxableAmount: 2598,
                cgst: 156,
                sgst: 156,
                totalTax: 312,
                grandTotal: 2910,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Neha Saxena', phone: '9876543236', address: 'Lucknow' },
                items: [
                    { product: products[18]._id, productName: products[18].name, sku: products[18].sku, quantity: 4, price: 399, gstRate: 5, gstAmount: 80, total: 1676 }
                ],
                subtotal: 1596,
                discountAmount: 0,
                taxableAmount: 1596,
                cgst: 40,
                sgst: 40,
                totalTax: 80,
                grandTotal: 1676,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Vidya Sharma', phone: '9876543237', address: 'Meerut' },
                items: [
                    { product: products[2]._id, productName: products[2].name, sku: products[2].sku, quantity: 2, price: 1499, gstRate: 5, gstAmount: 150, total: 3148 }
                ],
                subtotal: 2998,
                discountAmount: 100,
                taxableAmount: 2898,
                cgst: 72,
                sgst: 72,
                totalTax: 144,
                grandTotal: 3042,
                paymentMethod: 'cash',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Priya Nair', phone: '9876543238', address: 'Kottayam' },
                items: [
                    { product: products[20]._id, productName: products[20].name, sku: products[20].sku, quantity: 1, price: 2999, gstRate: 12, gstAmount: 360, total: 3359 }
                ],
                subtotal: 2999,
                discountAmount: 0,
                taxableAmount: 2999,
                cgst: 180,
                sgst: 180,
                totalTax: 360,
                grandTotal: 3359,
                paymentMethod: 'card',
                paymentStatus: 'paid',
                createdBy: admin._id
            },
            {
                billNumber: generateBillNumber(),
                customer: { name: 'Ritika Verma', phone: '9876543239', address: 'Thane' },
                items: [
                    { product: products[11]._id, productName: products[11].name, sku: products[11].sku, quantity: 1, price: 1099, gstRate: 12, gstAmount: 132, total: 1231 },
                    { product: products[17]._id, productName: products[17].name, sku: products[17].sku, quantity: 1, price: 499, gstRate: 5, gstAmount: 25, total: 524 }
                ],
                subtotal: 1598,
                discountAmount: 0,
                taxableAmount: 1598,
                cgst: 79,
                sgst: 79,
                totalTax: 158,
                grandTotal: 1756,
                paymentMethod: 'upi',
                paymentStatus: 'paid',
                createdBy: admin._id
            }
        ];

        await Bill.insertMany(sampleBills);
        console.log('Sample bills created (30 bills)');

        await Settings.create({
            company: {
                name: 'SRI RAM FASHIONS',
                address1: '61C9, Anupparpalayam Puthur, Tirupur. 641652',
                address2: '81 K, Madurai Raod, SankerNager, Tirunelveli Dt. 627357',
                city: 'Tirupur',
                state: 'Tamilnadu',
                stateCode: '33',
                pincode: '641652',
                phone: '9080573831',
                phone2: '9442807770',
                email: 'sriramfashionstrp@gmail.com',
                gstin: '33AZRPM4425F2ZA'
            },
            bank: {
                accountHolderName: 'SRI RAM FASHIONS',
                bankName: 'SOUTH INDIAN BANK',
                accountNumber: '0338073000002328',
                ifscCode: 'SIBL0000338',
                branchName: 'TIRUPUR'
            },
            tax: {
                cgstRate: 2.5,
                sgstRate: 2.5,
                enableGst: true
            },
            billTerms: 'Cheques made in favour of SRI RAM FASHIONS to be send toTrinelveli Address\nAll disputes are subjected toTrinelveli Jurisdiction',
            billFooter: 'Certified that above particulars are true and correct\nFor SRI RAM FASHIONS'
        });
        console.log('Settings created');

        console.log('\nDatabase seeded successfully.');
        console.log('\nLogin Credentials:');
        console.log(`   Email: ${SEED_ADMIN_EMAIL}`);
        console.log('   Password: [from SEED_ADMIN_PASSWORD env var]\n');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedDatabase();
