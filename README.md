# Logistics, Inventory & Warehouse Management System
A robust, secure, scalable microservices architecture for efficient warehouse and logistics management, powered by an integrated Retrieval-Augmented Generation (RAG) system for AI-driven context-aware insights.
## Architecture Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                              │
│                    React 19 + TypeScript + Tailwind                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Products   │  Inventory  │  Orders  │  Warehouse  │  Reports  │ Notifications│
└────────────┴────────────┴──────────┴────────────┴──────────┴────────────┘
                                     │
                                    API Gateway (via client)
                                     │
┌──────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Render)                                    │
│         Spring Boot 3.3 Microservices on Java 21                        │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   User      │ │  Inventory  │ │  Warehouse │ │   Order    │  │
│  │ Identity   │ │  Service   │ │  Service   │ │ Management│  │
│  │ Service    │ │   (8082)   │ │   (8083)   │ │  Service   │  │
│  │   (8081)   │ │            │ │            │ │   (8084)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐         │
│  │ Procurement │ │ Notification│ │    Reporting        │         │
│  │  Service    │ │  Service    │ │     Service          │         │
│  │   (8085)    │ │   (8086)     │ │      (8087)          │         │
│  └──────────────┘ └──────────────┘ └──────────────────────┘         │
│                           │                                           │
├───────────────────────────┼───────────────────────────────────────────┤
│     DATA LAYER            │  MESSAGE   │   CACHE                       │
│  PostgreSQL (Multi-Schema)│  Kafka     │  Redis                        │
│  ┌────────────────┐      │ ┌────────┐ │ ┌────────┐                   │
│  │ user_identity  │      │ │Events  │ │ │Sessions│                   │
│  │ inventory     │      │ └────────┘ │ └────────┘                   │
│  │ warehouse    │                                                       │
│  │ order_mgmt   │                                                       │
│  │ procurement │                                                       │
│  │ reporting   │                                                       │
│  │ notification│                                                       │
│  └────────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```
## Tech Stack
### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel
### Backend
- **Framework**: Spring Boot 3.3
- **Language**: Java 21
- **Database**: PostgreSQL (shared with multi-schema per service)
- **ORM**: Hibernate + Spring Data JPA
- **Migrations**: Flyway
- **Security**: PASETO (stateless tokens)
- **Cache**: Redis
- **Message Queue**: Apache Kafka
- **Deployment**: Render
## Services
### User Identity Service (8081)
- User registration and authentication
- Role-based access control (ADMIN, WAREHOUSE_STAFF, VIEWER)
- Company/tenant management
- Warehouse-scoped permissions
- Token management with PASETO
### Inventory Service (8082)
- Product catalog management
- Stock level tracking
- SKU management
- Inventory alerts
### Warehouse Service (8083)
- Warehouse operations
- Location management
- Goods receipt and dispatch
### Order Management Service (8084)
- Order creation and tracking
- Order status workflow
- Customer management
### Procurement Service (8085)
- Purchase order management
- Supplier management
- Requisition workflow
### Notification Service (8086)
- Multi-channel notifications
- Event-driven alerts
### Reporting Service (8087)
- Business intelligence
- Analytics dashboards
- Data aggregation
## Security
### Authentication
- Stateless token-based authentication using **PASETO v4**
- Access tokens (1-hour expiry) + refresh tokens (7-day expiry)
- Role-based access control (RBAC) with warehouse-scoped permissions
### Authorization Levels
| Role | Permissions |
|------|-------------|
| ADMIN | Full system access |
| WAREHOUSE_STAFF | Operational access within assigned warehouse |
| VIEWER | Read-only access |
## Database Schema
### Multi-Schema Architecture
Each service operates in its own PostgreSQL schema:
- `user_identity` - User and authentication data
- `inventory` - Product and stock data
- `warehouse` - Warehouse and location data
- `order_management` - Orders and customers
- `procurement` - Purchase orders
- `reporting` - Analytics data
- `notification` - Notification records
## API Design
### RESTful Endpoints
All services expose RESTful APIs following consistent conventions:
- `GET /api/v1/{service}/{resource}` - List
- `GET /api/v1/{service}/{resource}/{id}` - Get by ID
- `POST /api/v1/{service}/{resource}` - Create
- `PUT /api/v1/{service}/{resource}/{id}` - Update
- `DELETE /api/v1/{service}/{resource}/{id}` - Delete
## RAG System
The system includes an integrated **Retrieval-Augmented Generation** service that:
- Processes natural language queries about logistics data
- Provides AI-driven insights from warehouse and inventory data
- Supports decision-making with contextual information
## Getting Started
### Prerequisites
- Node.js 21+
- Java 21+
- Maven 3.9+
### Frontend Setup
```bash
cd system-frontend2
npm install
npm run dev
```
### Backend Setup
```bash
cd system-backend
mvn clean install
mvn spring-boot:run
```
### Environment Variables
**Backend (Render)**
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| DB_USER | Database username |
| DB_PASSWORD | Database password |
| REDIS_HOST | Redis host |
| REDIS_PASSWORD | Redis password |
| PASETO_SECRET_KEY | Secret key for token signing |
| KAFKA_BOOTSTRAP_SERVERS | Kafka broker address |
**Frontend (Vercel)**
Configured automatically via environment variables in Vercel project settings.
## Deployment
### Frontend
- **Platform**: Vercel
- **Branch**: Auto-deploys on push to connected branches
### Backend
- **Platform**: Render
- **Services**: Separate web services for each microservice
- **Database**: Single PostgreSQL instance with multi-schema
## License
Proprietary - All rights reserved.

