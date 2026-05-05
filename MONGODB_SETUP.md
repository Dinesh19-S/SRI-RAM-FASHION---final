# MongoDB Setup Guide for Sri Ram Fashions

## Overview
Your application has been configured to use MongoDB as the primary database. This guide will help you get MongoDB running with your data.

## 📋 Prerequisites

1. **MongoDB Atlas Account** (Cloud)
   - Already configured with URI in `.env`
   - MongoDB Cluster: `cluster0.hepq0h5`
   - Database: `sri-ram-fashions`

2. **Node.js** (v22.x recommended)
   - Already installed on your system

## 🚀 Quick Start

### Step 1: Test MongoDB Connection
```bash
npm run test:mongodb
```

This will:
- Verify MongoDB connection
- Display connected database name
- Show existing collections and document counts
- Provide troubleshooting steps if connection fails

### Step 2: Initialize MongoDB with Data
```bash
npm run setup:mongodb
```

This will:
- Create all necessary indexes for optimal performance
- Check if data already exists
- Seed initial data (admin user, categories, products, HSN codes) if empty
- Set up shop settings

### Step 3: Start the Application
```bash
npm run dev
```

The server will:
- Connect to MongoDB on startup
- Create an admin user if needed
- Initialize scheduler services
- Start listening on port 5000

## 📊 Environment Configuration

Your `.env` file already contains:
```
MONGODB_URI=mongodb+srv://dineshknight19_db_user:dinesh1910@cluster0.hepq0h5.mongodb.net/sri-ram-fashions
JWT_SECRET=your_jwt_secret_here
```

### Optional Seed Configuration
Add these to `.env` to customize initial admin user:
```
SEED_ADMIN_EMAIL=admin@sriramfashions.com
SEED_ADMIN_PASSWORD=YourSecurePassword@123
SEED_ADMIN_NAME=Admin User
SEED_ADMIN_PHONE=9876543210
```

## 🗄️ Database Schema

The application uses these MongoDB collections:

| Collection | Purpose |
|-----------|---------|
| `users` | Admin and user accounts |
| `categories` | Product categories |
| `products` | Inventory items |
| `customers` | Customer information |
| `suppliers` | Supplier details |
| `bills` | Sales transactions |
| `payments` | Payment records |
| `purchaseentries` | Purchase orders |
| `salesentries` | Sales entries |
| `hsns` | HSN/SAC codes for GST |
| `stockmovements` | Inventory tracking |
| `settings` | Shop configuration |

## 🔐 Indexes Created

The setup script automatically creates:
- Unique index on `users.email`
- Unique index on `products.sku`
- Unique index on `categories.name`
- Unique index on `bills.billNumber`
- Unique index on `hsn.code`
- Standard indexes for phone fields

## 🐛 Troubleshooting

### Connection Failed Error
**Problem**: `MongoDB connection failed`

**Solutions**:
1. Check internet connection
2. Verify MongoDB URI is correct in `.env`
3. Check MongoDB Atlas IP whitelist - add your IP address
4. Ensure MongoDB cluster is not paused

### Collections Not Created
**Problem**: `Unable to find collections`

**Solution**:
Run `npm run setup:mongodb` to initialize collections and indexes

### Admin User Already Exists
**Problem**: `E11000: duplicate key error`

**Solution**: 
The admin user already exists. You can proceed to start the server with `npm run dev`

## 📝 Data Migration (from Supabase)

If you have existing data in Supabase:

1. Export data from Supabase as JSON/CSV
2. Create a migration script in `migrations/` folder
3. Use Mongoose models to import the data
4. Run migration script before starting server

Example migration:
```bash
node migrations/migrate-from-supabase.js
```

## ✨ Running the Full Application

```bash
# Terminal 1: Start Backend API
npm run dev

# Terminal 2: Start Frontend (if needed)
cd frontend-new
npm run dev
```

Backend will be available at: `http://localhost:5000`

## 🎯 Verification Checklist

- [ ] Run `npm run test:mongodb` - Connection successful
- [ ] Run `npm run setup:mongodb` - Data initialized
- [ ] Run `npm run dev` - Server starts without errors
- [ ] Check logs show "Connected to MongoDB"
- [ ] Can login with admin credentials
- [ ] Can see categories and products in dashboard

## 📞 Support

If you encounter issues:
1. Check MongoDB cluster status in Atlas console
2. Verify environment variables in `.env`
3. Check server logs for specific error messages
4. Ensure no other service is using port 5000

## 🔗 Useful Links

- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Mongoose Docs: https://mongoosejs.com/
- Your Cluster: https://cloud.mongodb.com/

---
**Last Updated**: May 5, 2026
**MongoDB Version**: 8.0.3
**Mongoose Version**: 8.0.3
