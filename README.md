# WealthTrack Backend API

RESTful API backend for the WealthTrack personal wealth tracking application. Built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- ✅ **User Authentication**
  - User registration with password hashing (bcrypt)
  - JWT-based authentication
  - Protected routes middleware
  - User profile endpoints

- ✅ **Asset Management**
  - Full CRUD operations for assets
  - Support for multiple asset types (Stocks, Crypto, ETFs, Bonds)
  - Asset validation and error handling
  - User-specific asset isolation

- ✅ **Real-time Price Fetching**
  - Yahoo Finance integration for stock prices
  - CoinGecko API for cryptocurrency prices
  - Price caching to reduce API calls
  - Automatic price updates

- ✅ **Portfolio Analytics**
  - Portfolio value calculation
  - Gain/loss tracking
  - Asset performance metrics
  - Historical purchase data

- ✅ **Database**
  - PostgreSQL with Prisma ORM
  - Secure password storage
  - Relational data model
  - Database migrations

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Price APIs**: Yahoo Finance, CoinGecko
- **Deployment**: Railway
- **Environment**: dotenv

## 📋 Prerequisites

- Node.js 16+
- PostgreSQL 13+
- npm or yarn
- Railway account (optional, for deployment)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/wealthtrack-backend.git
cd wealthtrack-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/wealthtrack?schema=public"

# JWT Secret (generate a strong random string)
JWT_SECRET="your-super-secret-jwt-key-here"

# Server
PORT=3000
NODE_ENV=development
```

### 4. Set up the database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 5. Start the development server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
wealthtrack-backend/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── auth.ts      # Authentication routes
│   │   ├── users.ts     # User routes
│   │   ├── assets.ts    # Asset management routes
│   │   └── prices.ts    # Price fetching routes
│   ├── middleware/      # Express middleware
│   │   └── auth.ts      # JWT authentication middleware
│   ├── services/        # Business logic services
│   │   ├── database.ts  # Prisma client instance
│   │   └── prices.ts    # Price fetching service
│   └── index.ts         # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── .env                 # Environment variables (not in git)
├── .gitignore          # Git ignore rules
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |

### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user | ✅ |

### Assets
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/assets` | Get all user assets | ✅ |
| GET | `/api/assets/:id` | Get single asset | ✅ |
| POST | `/api/assets` | Create new asset | ✅ |
| PUT | `/api/assets/:id` | Update asset | ✅ |
| DELETE | `/api/assets/:id` | Delete asset | ✅ |

### Prices
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/prices/portfolio` | Get portfolio value with current prices | ✅ |

### Health Check
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | API info | ❌ |
| GET | `/health` | Health check | ❌ |

## 📊 Database Schema

### User Model
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password_hash String
  first_name    String?
  last_name     String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  assets        Asset[]

  @@map("users")
}
```

### Asset Model
```prisma
model Asset {
  id             String    @id @default(cuid())
  user_id        String
  type           AssetType
  symbol         String
  name           String
  quantity       Decimal   @db.Decimal(20, 8)
  purchase_price Decimal   @db.Decimal(20, 2)
  purchase_date  DateTime
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
  user           User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("assets")
}
```

### Price Cache Model
```prisma
model PriceCache {
  symbol        String   @id
  current_price Decimal  @db.Decimal(20, 8)
  updated_at    DateTime @default(now())

  @@map("price_cache")
}
```

### Asset Types
```prisma
enum AssetType {
  STOCK
  CRYPTO
  ETF
  BOND
  OTHER
}
```

## 🔑 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

### Using Protected Routes
Include the JWT token in the Authorization header:
```bash
curl -X GET http://localhost:3000/api/assets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 💰 Price Fetching

The API fetches real-time prices from:
- **Yahoo Finance**: For stocks, ETFs
- **CoinGecko**: For cryptocurrencies

Prices are cached to minimize API calls and improve performance.

## 🚀 Deployment

### Railway (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway link
```

3. Set environment variables:
```bash
railway variables set JWT_SECRET="your-secret-key"
railway variables set NODE_ENV="production"
```

4. Deploy:
```bash
railway up
```

The database URL will be automatically configured by Railway.

## 🧪 Development

### Run Prisma Studio (Database GUI)
```bash
npx prisma studio
```

### Build for production
```bash
npm run build
npm start
```

### Test API Endpoints
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [Thunder Client](https://www.thunderclient.com/) (VS Code extension)

## 🐛 Common Issues

### Port Already in Use
```bash
# Find and kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Prisma Client Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
```

## 📈 Performance & Security

- Database connection pooling
- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (10 rounds)
- CORS configured for production
- Price caching with timestamps
- SQL injection prevention via Prisma

## 🔗 Related Repositories

- [WealthTrack Mobile](https://github.com/mahyar-jbr/wealthtrack-mobile) - React Native mobile app

## 📝 License

MIT

## 👨‍💻 Author

Built by Mahyar Jaberi
