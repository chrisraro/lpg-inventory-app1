# LPG Inventory Management System - Technical Architecture

## Project Overview
The LPG Inventory Management System is designed to track LPG cylinders through their entire lifecycle from registration to dispatch, delivery, and return. The system will feature QR code scanning for rapid inventory operations and real-time updates across all user devices.

## Core Entities

1. **Cylinders**
   - Unique serial numbers
   - Status tracking (Registered, In Stock, Dispatched, Delivered, Returned, Damaged, Retired)
   - Size/type information
   - Current location/customer assignment

2. **Customers**
   - Business and residential customers
   - Location details
   - Contact information

3. **Staff**
   - Delivery personnel
   - Warehouse staff
   - Administrative users

4. **Transactions**
   - Immutable log of all cylinder status changes
   - Timestamps and responsible parties

## Technical Architecture

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS with custom theme
- **UI Components**: Shadcn/ui with Radix Primitives
- **State Management**: React Context API with optional Zustand for complex state
- **Data Fetching**: TanStack Query for server state management
- **Real-time**: Supabase Realtime subscriptions
- **QR Code**: `html5-qrcode` for scanning, `react-qr-code` for generation

### Backend
- **Platform**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Database**: PostgreSQL with custom schemas
- **Authentication**: Supabase Auth with custom claims for roles
- **Authorization**: Row Level Security (RLS) policies
- **Business Logic**: 
  - PostgreSQL functions/triggers for complex operations
  - Next.js Route Handlers for API endpoints
- **Validation**: Zod for schema validation

### DevOps
- **Deployment**: Vercel for frontend, Supabase for backend
- **CI/CD**: GitHub Actions integrated with Vercel
- **Monitoring**: Vercel Analytics, Supabase Logs

## Application Structure
```
src/
├── app/                 # Next.js app router pages
│   ├── api/             # API routes
│   ├── (auth)/          # Authentication pages
│   ├── dashboard/       # Main application dashboard
│   ├── cylinders/       # Cylinder management
│   ├── customers/       # Customer management
│   ├── dispatch/        # Dispatch operations
│   └── scan/            # QR code scanning interface
├── components/          # Shared React components
├── lib/                 # Business logic and utilities
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
└── utils/               # Utility functions
```

## Key Features
1. **Rapid Scan Mode**: Camera-based QR code scanning for quick inventory operations
2. **Real-time Dashboard**: Live updates of inventory status
3. **Role-based Access**: Different UI and permissions for warehouse, delivery, and admin staff
4. **Transaction Logging**: Immutable audit trail of all cylinder movements
5. **Offline Support**: PWA capabilities for basic functionality without connectivity

## Implementation Roadmap
1. Database schema design and implementation
2. Authentication and authorization setup
3. Core entity management (CRUD operations)
4. QR code scanning interface
5. Real-time dashboard
6. Dispatch and delivery workflows
7. Reporting and analytics
8. Testing and optimization