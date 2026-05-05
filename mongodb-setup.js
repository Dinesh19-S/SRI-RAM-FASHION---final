import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import all models
import User from './api/models/User.js';
import Category from './api/models/Category.js';
import Product from './api/models/Product.js';
import Customer from './api/models/Customer.js';
import Bill from './api/models/Bill.js';
import Payment from './api/models/Payment.js';
import PurchaseEntry from './api/models/PurchaseEntry.js';
import SalesEntry from './api/models/SalesEntry.js';
import Settings from './api/models/Settings.js';
import StockMovement from './api/models/StockMovement.js';
import Supplier from './api/models/Supplier.js';
import HSN from './api/models/HSN.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is missing in .env file');
    process.exit(1);
}

const setupMongoDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 30000,
        });
        console.log('✅ Connected to MongoDB successfully');
        console.log(`📦 Database: ${mongoose.connection.name}`);

        // Create indexes for all models
        console.log('\n🔧 Creating indexes...');
        
        await User.collection.createIndex({ email: 1 }, { unique: true });
        console.log('✓ User indexes created');
        
        await Product.collection.createIndex({ sku: 1 }, { unique: true });
        console.log('✓ Product indexes created');
        
        await Category.collection.createIndex({ name: 1 }, { unique: true });
        console.log('✓ Category indexes created');
        
        await Bill.collection.createIndex({ billNumber: 1 }, { unique: true });
        console.log('✓ Bill indexes created');
        
        await Customer.collection.createIndex({ phone: 1 });
        console.log('✓ Customer indexes created');
        
        await Supplier.collection.createIndex({ phone: 1 });
        console.log('✓ Supplier indexes created');
        
        await HSN.collection.createIndex({ code: 1 }, { unique: true });
        console.log('✓ HSN indexes created');

        // Check if database has existing data
        console.log('\n📊 Checking existing data...');
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();

        console.log(`📌 Users: ${userCount}`);
        console.log(`📌 Products: ${productCount}`);
        console.log(`📌 Categories: ${categoryCount}`);

        if (userCount === 0) {
            console.log('\n🌱 Database is empty. Seeding initial data...');
            await seedInitialData();
        } else {
            console.log('\n✅ Database already contains data. Skipping seed.');
        }

        console.log('\n✨ MongoDB setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up MongoDB:', error.message);
        process.exit(1);
    }
};

const seedInitialData = async () => {
    try {
        // Create default admin user
        const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@sriramfashions.com';
        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
        const adminName = process.env.SEED_ADMIN_NAME?.trim() || 'Admin User';
        const adminPhone = process.env.SEED_ADMIN_PHONE?.trim() || '9876543210';

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const admin = await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            phone: adminPhone,
            role: 'admin',
            isActive: true
        });
        console.log('✓ Admin user created');

        // Create default categories
        const categories = await Category.insertMany([
            { name: 'Sarees', description: 'Traditional and designer sarees' },
            { name: 'Kurtas', description: 'Men and women kurtas' },
            { name: 'Lehengas', description: 'Bridal and party wear lehengas' },
            { name: 'Dupattas', description: 'Silk and cotton dupattas' },
            { name: 'Suits', description: 'Salwar suits and dress materials' }
        ]);
        console.log('✓ Categories created');

        // Create HSN entries
        const hsns = await HSN.insertMany([
            { code: '5007', description: 'Silk fabrics', applicableGST: 12 },
            { code: '5208', description: 'Cotton fabrics', applicableGST: 5 },
            { code: '5407', description: 'Synthetic fabrics', applicableGST: 12 },
            { code: '6206', description: 'Apparel - Men', applicableGST: 12 },
            { code: '6204', description: 'Apparel - Women', applicableGST: 12 },
            { code: '6214', description: 'Accessories', applicableGST: 5 }
        ]);
        console.log('✓ HSN entries created');

        // Create default products
        const products = await Product.insertMany([
            {
                name: 'Banarasi Silk Saree - Red',
                sku: 'SAR001',
                category: categories[0]._id,
                mrp: 4500,
                sellingPrice: 3999,
                stock: 15,
                gstRate: 12,
                hsn: hsns[0]._id,
                lowStockThreshold: 5,
                isActive: true
            },
            {
                name: 'Kanjivaram Silk Saree - Gold',
                sku: 'SAR002',
                category: categories[0]._id,
                mrp: 8500,
                sellingPrice: 7499,
                stock: 8,
                gstRate: 12,
                hsn: hsns[0]._id,
                lowStockThreshold: 3,
                isActive: true
            },
            {
                name: 'Cotton Saree - Blue',
                sku: 'SAR003',
                category: categories[0]._id,
                mrp: 1800,
                sellingPrice: 1499,
                stock: 25,
                gstRate: 5,
                hsn: hsns[1]._id,
                lowStockThreshold: 10,
                isActive: true
            },
            {
                name: 'Silk Kurta - Blue',
                sku: 'KUR001',
                category: categories[1]._id,
                mrp: 1200,
                sellingPrice: 999,
                stock: 30,
                gstRate: 12,
                hsn: hsns[4]._id,
                lowStockThreshold: 8,
                isActive: true
            },
            {
                name: 'Bridal Lehenga - Red Gold',
                sku: 'LEH001',
                category: categories[2]._id,
                mrp: 25000,
                sellingPrice: 21999,
                stock: 5,
                gstRate: 12,
                hsn: hsns[4]._id,
                lowStockThreshold: 2,
                isActive: true
            }
        ]);
        console.log('✓ Sample products created');

        // Create default settings
        await Settings.create({
            shopName: 'Sri Ram Fashions',
            shopAddress: 'Your Shop Address',
            shopPhone: '9876543210',
            shopEmail: 'shop@sriramfashions.com',
            gstNumber: 'YOUR_GST_NUMBER',
            createdBy: admin._id
        });
        console.log('✓ Shop settings created');

        console.log('\n✅ Initial data seeded successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
        throw error;
    }
};

// Run setup
setupMongoDB();
