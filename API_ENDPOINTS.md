# Sri Ram Fashions - Complete API Endpoints Documentation

**Base URL:** 
- Local: `http://localhost:5000/api/v1`
- Production (Render): `https://sri-ram-fashion-final.onrender.com/api/v1`

---

## 🔐 Authentication Endpoints (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/auth/login` | Login with email & password | ❌ |
| POST | `/auth/google` | Google OAuth login | ❌ |
| POST | `/auth/login-phone` | Login with phone number | ❌ |
| POST | `/auth/send-otp` | Send OTP for phone verification | ❌ |
| POST | `/auth/forgot-password` | Request password reset | ❌ |
| POST | `/auth/reset-password` | Reset password with token | ❌ |
| POST | `/auth/register` | Register new user | ❌ |
| GET | `/auth/profile` | Get current user profile | ✅ |

---

## 📊 Dashboard Endpoints (`/dashboard`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/dashboard/overview` | Get dashboard overview (stats, bills, products) | ✅ |
| GET | `/dashboard/notifications` | Get dashboard notifications | ✅ |
| GET | `/dashboard/stats` | Get dashboard statistics | ✅ |
| GET | `/dashboard/recent-bills` | Get recent bills | ✅ |
| GET | `/dashboard/revenue-chart` | Get revenue chart data | ✅ |
| GET | `/dashboard/low-stock-alerts` | Get low stock alerts | ✅ |
| GET | `/dashboard/category-stats` | Get category statistics | ✅ |

---

## 📦 Products Endpoints (`/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/products` | Get all products | ✅ |
| GET | `/products/low-stock` | Get low stock products | ✅ |
| GET | `/products/:id` | Get product by ID | ✅ |
| POST | `/products` | Create new product | ✅ |
| PUT | `/products/:id` | Update product | ✅ |
| DELETE | `/products/:id` | Delete product | ✅ |
| POST | `/products/:id/stock` | Update product stock | ✅ |

---

## 🏷️ Categories Endpoints (`/categories`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/categories` | Get all categories | ✅ |
| POST | `/categories` | Create new category | ✅ |
| PUT | `/categories/:id` | Update category | ✅ |
| DELETE | `/categories/:id` | Delete category | ✅ |

---

## 📄 Bills Endpoints (`/bills`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/bills` | Get all bills | ✅ |
| GET | `/bills/stats` | Get bill statistics | ✅ |
| GET | `/bills/:id` | Get bill by ID | ✅ |
| POST | `/bills` | Create new bill | ✅ |
| PUT | `/bills/:id` | Update bill | ✅ |
| DELETE | `/bills/:id` | Delete bill | ✅ |

---

## 📦 Inventory Endpoints (`/inventory`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/inventory/movements` | Get inventory movements | ✅ |
| POST | `/inventory/movements` | Record inventory movement | ✅ |
| GET | `/inventory/stats` | Get inventory statistics | ✅ |

---

## 👥 Customers Endpoints (`/customers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/customers` | Get all customers | ✅ |
| GET | `/customers/:id` | Get customer by ID | ✅ |
| POST | `/customers` | Create new customer | ✅ |
| PUT | `/customers/:id` | Update customer | ✅ |
| DELETE | `/customers/:id` | Delete customer | ✅ |

---

## 🏢 Suppliers Endpoints (`/suppliers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/suppliers` | Get all suppliers | ✅ |
| GET | `/suppliers/:id` | Get supplier by ID | ✅ |
| POST | `/suppliers` | Create new supplier | ✅ |
| PUT | `/suppliers/:id` | Update supplier | ✅ |
| DELETE | `/suppliers/:id` | Delete supplier | ✅ |

---

## 💳 Payment Endpoints (`/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/payments` | Get all payments | ✅ |
| GET | `/payments/:id` | Get payment by ID | ✅ |
| POST | `/payments` | Create new payment | ✅ |
| PUT | `/payments/:id` | Update payment | ✅ |
| DELETE | `/payments/:id` | Delete payment | ✅ |

---

## 🛍️ Sales Entries Endpoints (`/sales-entries`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/sales-entries` | Get all sales entries | ✅ |
| GET | `/sales-entries/:id` | Get sales entry by ID | ✅ |
| POST | `/sales-entries` | Create new sales entry | ✅ |
| PUT | `/sales-entries/:id` | Update sales entry | ✅ |
| POST | `/sales-entries/:id/generate-bill` | Generate bill from sales entry | ✅ |
| DELETE | `/sales-entries/:id` | Delete sales entry | ✅ |

---

## 📥 Purchase Entries Endpoints (`/purchase-entries`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/purchase-entries` | Get all purchase entries | ✅ |
| GET | `/purchase-entries/:id` | Get purchase entry by ID | ✅ |
| POST | `/purchase-entries` | Create new purchase entry | ✅ |
| PUT | `/purchase-entries/:id` | Update purchase entry | ✅ |
| DELETE | `/purchase-entries/:id` | Delete purchase entry | ✅ |

---

## 📊 Reports Endpoints (`/reports`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/reports/sales-summary` | Get sales summary report | ✅ |
| GET | `/reports/sales-trend` | Get sales trend report | ✅ |
| GET | `/reports/top-products` | Get top products report | ✅ |
| GET | `/reports/category-performance` | Get category performance | ✅ |
| GET | `/reports/payment-methods` | Get payment methods report | ✅ |
| GET | `/reports/stock` | Get stock report | ✅ |
| GET | `/reports/sales-report` | Get detailed sales report | ✅ |
| GET | `/reports/purchase-report` | Get detailed purchase report | ✅ |
| GET | `/reports/stock-report` | Get detailed stock report | ✅ |
| GET | `/reports/auditor-sales` | Get auditor sales report | ✅ |
| GET | `/reports/auditor-purchase` | Get auditor purchase report | ✅ |

---

## 🏫 HSN Endpoints (`/hsn`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/hsn` | Get all HSN codes | ✅ |
| GET | `/hsn/:id` | Get HSN code by ID | ✅ |
| POST | `/hsn` | Create new HSN code | ✅ |
| PUT | `/hsn/:id` | Update HSN code | ✅ |
| DELETE | `/hsn/:id` | Delete HSN code | ✅ |

---

## ⚙️ Settings Endpoints (`/settings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/settings` | Get application settings | ✅ |
| PUT | `/settings` | Update settings (admin only) | ✅ |
| POST | `/settings/logo` | Upload company logo (admin only) | ✅ |

---

## 📧 Email Endpoints (`/email`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| GET | `/email/status` | Get email configuration status | ✅ |
| POST | `/email/test` | Send test email | ✅ |
| POST | `/email/daily-summary` | Send daily summary email | ✅ |
| POST | `/email/send-report` | Send report via email | ✅ |
| POST | `/email/send-bill/:billId` | Send bill via email | ✅ |

---

## 🤖 AI Endpoints (`/ai`) - DISABLED

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/ai/chat` | Chat with AI assistant | ✅ |
| GET | `/ai/insights` | Get AI insights | ✅ |
| GET | `/ai/inventory-predictions` | Get inventory predictions | ✅ |
| POST | `/ai/search` | Smart search with AI | ✅ |
| POST | `/ai/action` | Execute AI actions | ✅ |
| GET | `/ai/health` | AI service health check | ✅ |

**Note:** AI endpoints are currently disabled (services not available)

---

## 📌 Quick Reference

### Total Endpoints: **91**

**Breakdown by Category:**
- Authentication: 8 endpoints
- Dashboard: 7 endpoints
- Products: 7 endpoints
- Categories: 4 endpoints
- Bills: 6 endpoints
- Inventory: 3 endpoints
- Customers: 5 endpoints
- Suppliers: 5 endpoints
- Payments: 5 endpoints
- Sales Entries: 6 endpoints
- Purchase Entries: 5 endpoints
- Reports: 11 endpoints
- HSN: 5 endpoints
- Settings: 3 endpoints
- Email: 5 endpoints
- AI: 6 endpoints

---

## 🔑 Authentication

All endpoints (except `/auth`) require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

**Get a token:**
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "admin@sriramfashions.com",
  "password": "Admin@123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔄 Real-Time Features

- ✅ Dashboard auto-refreshes every 30 seconds
- ✅ Revenue charts update in real-time
- ✅ Inventory levels sync automatically
- ✅ Stock alerts refresh automatically
- ✅ Order statuses update live

---

## 📱 Status

- **Local Backend:** ✅ Running on port 5000
- **Production Backend (Render):** ✅ https://sri-ram-fashion-final.onrender.com
- **Frontend (Vercel):** ✅ https://sri-ram-fashion-final-dinesh19-s-projects.vercel.app

