# WealthTrack Backend API

RESTful API backend for the WealthTrack personal wealth tracking application. Built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

### Implemented
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

- ✅ **Database**
  - PostgreSQL with Prisma ORM
  - Secure password storage
  - Relational data model
  - Database migrations

### Coming Soon
- 📊 Real-time price fetching from external APIs
- 📈 Portfolio analytics endpoints
- 🔔 Price alerts system
- 📱 WebSocket support for live updates
- 🔐 Two-factor authentication

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Deployment**: Railway
- **Environment**: dotenv

## 📋 Prerequisites

- Node.js 16+
- PostgreSQL 13+
- npm or yarn
- Railway account (for deployment)

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/mahyar-jbr/wealthtrack-backend.git
cd wealthtrack-backend
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
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

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the development server
```bash
npm run dev
# or
yarn dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
wealthtrack-backend/
├── src/
│   ├── routes/           # API route handlers
│   │   ├── auth.ts      # Authentication routes
│   │   ├── users.ts     # User routes
│   │   └── assets.ts    # Asset management routes
│   ├── middleware/      # Express middleware
│   │   └── auth.ts      # JWT authentication middleware
│   ├── services/        # Business logic services
│   │   └── database.ts  # Prisma client instance
│   └── index.ts         # Application entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── .env                 # Environment variables
├── .env.example         # Environment variables example
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
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
  quantity       Decimal
  purchase_price Decimal
  purchase_date  DateTime
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
  user           User      @relation(fields: [user_id], references: [id])
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

## 🚀 Deployment (Railway)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize project
```bash
railway link
```

### 4. Set environment variables
```bash
railway variables set JWT_SECRET="your-secret-key"
railway variables set NODE_ENV="production"
```

### 5. Deploy
```bash
railway up
```

The database URL will be automatically configured by Railway.

## 🧪 Testing

### Run Prisma Studio (Database GUI)
```bash
npx prisma studio
```

### Test API Endpoints
Use tools like:
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [Thunder Client](https://www.thunderclient.com/) (VS Code extension)
- curl (command line)

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

### Railway Deployment Issues
```bash
# Check logs
railway logs

# Restart deployment
railway up --detach
```

## 📈 Performance

- Uses connection pooling for database
- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)
- CORS configured for production

## 🔗 Related Repositories

- [Mobile App](https://github.com/mahyar-jbr/wealthtrack-mobile) - React Native mobile app

## 👥 Author

**Mahyar Jbr**
- GitHub: [@mahyar-jbr](https://github.com/mahyar-jbr)

## 🙏 Acknowledgments

- Express.js team
- Prisma team for the excellent ORM
- Railway for seamless deployment
