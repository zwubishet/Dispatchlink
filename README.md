# DispatchLink — Distributor Operations Platform

A full-stack B2B distribution management system. Distributors manage orders, products, inventory, shops, and drivers from a single dashboard.

## Stack

- **Backend** — Node.js + Express, PostgreSQL (direct queries + Hasura GraphQL)
- **GraphQL** — Hasura GraphQL Engine (auto-generated API + actions)
- **Database** — PostgreSQL 15
- **Frontend** — React + Vite + Tailwind CSS
- **Infrastructure** — Docker Compose

---

## Project Structure

```
dispatchlink/
├── docker-compose.yml        # PostgreSQL + Hasura + Express
├── .env                      # Environment variables
├── database/
│   └── init.sql              # Schema + seed data
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config/           # db.js, hasura.js, jwt.js
│   │   ├── middleware/       # auth, error
│   │   └── routes/           # auth, orders, products, shops, drivers, inventory, dashboard
│   ├── package.json
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── pages/            # Dashboard, Orders, Products, Inventory, Shops, Drivers
    │   ├── components/       # Layout, UI components
    │   ├── context/          # AuthContext
    │   └── lib/              # api.js, utils.js
    └── package.json
```

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend dev)

### 1. Start the backend services

```bash
cd dispatchlink
docker compose up -d
```

This starts:
- PostgreSQL on port **5433**
- Hasura GraphQL Engine on port **8080**
- Express API on port **4000**

Wait ~15 seconds for all services to be healthy.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

### 3. Login

| Field    | Value          |
|----------|----------------|
| Phone    | `0900000000`   |
| Password | `admin123`     |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders` | List orders (filter by status, shop) |
| GET | `/api/orders/:id` | Order detail with history |
| POST | `/api/orders` | Create order |
| PATCH | `/api/orders/:id/status` | Update order status |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Deactivate product |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/inventory` | List inventory |
| POST | `/api/inventory/adjust` | Stock in/out/adjustment |
| GET | `/api/inventory/movements` | Stock movement history |

### Shops & Drivers
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/shops` | List / create shops |
| GET/POST | `/api/drivers` | List / create drivers |
| PATCH | `/api/drivers/:id/availability` | Toggle driver availability |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Order counts + revenue |
| GET | `/api/dashboard/recent-orders` | Last 10 orders |
| GET | `/api/dashboard/top-products` | Best-selling products |

---

## Order State Machine

```
PENDING → CONFIRMED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
        ↘ REJECTED   ↘ CANCELLED
```

Every transition is logged in `order_status_history` with actor and timestamp.

---

## Hasura Console

Access the Hasura console at **http://localhost:8080/console**

Admin secret: `dispatchlink_admin_secret`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `dispatchlink` | Database name |
| `POSTGRES_USER` | `dispatchlink_user` | DB user |
| `POSTGRES_PASSWORD` | `dispatchlink_pass` | DB password |
| `HASURA_GRAPHQL_ADMIN_SECRET` | `dispatchlink_admin_secret` | Hasura admin secret |
| `JWT_SECRET` | see `.env` | JWT signing key (min 32 chars) |
| `EXPRESS_PORT` | `4000` | API port |

---

## Useful Commands

```bash
# View logs
docker compose logs -f dispatchlink_express
docker compose logs -f dispatchlink_hasura

# Restart a service
docker compose restart dispatchlink_express

# Stop everything
docker compose down

# Stop and remove volumes (wipes database)
docker compose down -v
```
