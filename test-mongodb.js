import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const testMongoDB = async () => {
    try {
        if (!MONGODB_URI) {
            console.error('❌ MONGODB_URI is not configured in .env file');
            process.exit(1);
        }

        console.log('🔄 Testing MongoDB connection...');
        console.log(`📍 URI: ${MONGODB_URI.split('@')[1] || 'local'}`);

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 30000,
        });

        console.log('✅ Connected to MongoDB successfully!');
        console.log(`📦 Database: ${mongoose.connection.name}`);

        // Get database stats
        const db = mongoose.connection.getClient().db();
        const collections = await db.listCollections().toArray();
        
        console.log('\n📊 Collections in database:');
        if (collections.length === 0) {
            console.log('   (empty - no collections created yet)');
        } else {
            for (const collection of collections) {
                try {
                    const count = await db.collection(collection.name).countDocuments();
                    console.log(`   ✓ ${collection.name}: ${count} documents`);
                } catch (err) {
                    console.log(`   ✓ ${collection.name}: (unable to count)`);
                }
            }
        }

        console.log('\n✨ MongoDB is ready to use!');
        console.log('\n💡 Next steps:');
        console.log('   1. Run: npm run setup    (to initialize data)');
        console.log('   2. Run: npm run dev      (to start the server)');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Verify MONGODB_URI in .env file');
        console.error('   2. Check your internet connection');
        console.error('   3. Ensure MongoDB cluster is accessible');
        console.error('   4. Check IP whitelist in MongoDB Atlas');
        process.exit(1);
    }
};

testMongoDB();
