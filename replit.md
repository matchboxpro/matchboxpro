# MATCHBOX - Sticker Trading Web Application

## Overview

MATCHBOX is a mobile-first web application designed for trading Panini stickers between users. The platform connects collectors based on location proximity and album compatibility to facilitate efficient sticker exchanges. Users can manage their sticker collections, find compatible trading partners through an intelligent matching system, and communicate through integrated chat functionality.

## User Preferences

Preferred communication style: Simple, everyday language in Italian.

### Brand Colors (FIXED PALETTE)
- Azzurro: #05637b (primary brand color)
- Bianco: #fff4d6 (background/light color) 
- Giallo: #f8b400 (accent/action color)
- Nero: #052b3e (text/dark color)

Note: These exact color codes must ALWAYS be maintained throughout the app.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Styling**: Tailwind CSS with custom design system variables for brand consistency
- **UI Components**: shadcn/ui component library with Radix UI primitives for accessibility
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Mobile-First Design**: Responsive layout optimized for smartphone usage with bottom navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Session Management**: Express sessions with in-memory storage for user authentication
- **API Design**: RESTful endpoints with consistent error handling and request/response patterns
- **Authentication**: Custom session-based authentication with bcrypt password hashing
- **Authorization**: Role-based access control (user/admin) with middleware protection

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL for scalable cloud hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Validation**: Zod schemas for runtime type validation and API request/response validation

### Key Data Models
- **Users**: Authentication, location (CAP), search radius, album selection, and premium status
- **Albums**: Sticker collections with yearly categorization and active status management
- **Stickers**: Individual sticker definitions with numbers, names, and team associations
- **User Stickers**: Junction table tracking collection status (yes/no/double) per user
- **Matches**: Trading partnerships between users for specific albums
- **Messages**: Real-time chat functionality within matches
- **Reports**: Admin moderation system for user-generated content

### Authentication and Authorization
- **Session-based Authentication**: Secure server-side sessions with HTTP-only cookies
- **Password Security**: bcrypt hashing with salt rounds for password protection
- **Role-based Access**: Separate user and admin roles with middleware enforcement
- **Admin Panel**: Desktop-only administrative interface with restricted access

### Business Logic Components
- **Matching Algorithm**: Location-based user discovery using CAP codes and configurable radius
- **Collection Management**: Three-state sticker tracking (collected/missing/duplicate)
- **Trading System**: 1:1 match creation with integrated chat functionality
- **Location Services**: CAP code-based proximity matching with configurable search radius

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: Serverless PostgreSQL client for Neon database connectivity
- **drizzle-orm**: Type-safe SQL query builder and ORM for database operations
- **@tanstack/react-query**: Server state management, caching, and synchronization
- **@radix-ui/***: Accessible UI primitives for form controls, dialogs, and interactive elements
- **bcrypt**: Cryptographic password hashing for secure authentication
- **express-session**: Session middleware for user authentication state management

### Development Tools
- **Vite**: Modern build tool with hot module replacement for development
- **TypeScript**: Static type checking for enhanced developer experience and code reliability
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **ESLint/Prettier**: Code formatting and linting for consistent code quality

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and introspection tools

### UI Enhancement
- **class-variance-authority**: Type-safe variant handling for component styling
- **clsx/tailwind-merge**: Conditional CSS class composition utilities
- **Lucide React**: Consistent icon library for user interface elements