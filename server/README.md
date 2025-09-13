# JurisGuide Platform - Backend Server

## Overview

The JurisGuide platform backend is built on Node.js with TypeScript, providing a robust foundation for legal technology services including AI-powered legal guidance, lawyer matching, and mediation services.

## Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT tokens
- **File Storage**: Local filesystem (configurable for cloud storage)

### Project Structure

```
server/
├── database/
│   ├── config.ts              # Database connection configuration
│   ├── operations.ts          # Database operation classes
│   └── migrations/
│       ├── migrate.ts         # Migration runner
│       └── *.sql             # SQL migration files
├── middleware/
│   ├── auth.js               # JWT authentication middleware (legacy)
│   └── requestId.ts          # Request ID tracking middleware
├── routes/
│   ├── auth.js               # Authentication routes (legacy)
│   ├── requests.js           # Request management routes (legacy)
│   └── departments.js        # Department routes (legacy)
├── types/
│   └── index.ts              # TypeScript type definitions
├── utils/
│   ├── validation.ts         # Input validation utilities
│   ├── response.ts           # API response utilities
│   └── logger.ts             # Logging utilities
├── uploads/                  # File upload directory
├── index.ts                  # Main server entry point
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── .env                      # Environment variables
```

## Database Schema

### Core Tables

1. **users** - Enhanced user profiles with cultural and language preferences
2. **legal_queries** - Legal questions and guidance requests
3. **legal_guidance** - AI-generated legal guidance responses
4. **lawyers** - Lawyer profiles and verification status
5. **mediation_cases** - Mediation case management
6. **mediation_events** - Timeline events for mediation cases
7. **documents** - File attachments and legal documents
8. **lawyer_ratings** - Lawyer ratings and reviews

### Key Features

- UUID primary keys for enhanced security
- JSONB columns for flexible schema evolution
- Comprehensive indexing for performance
- Automatic timestamp tracking
- Foreign key constraints for data integrity

## TypeScript Interfaces

### Core Domain Models

- **User**: Enhanced user profiles with cultural context
- **LegalQuery**: Legal questions with jurisdiction and urgency
- **Lawyer**: Lawyer profiles with specializations and verification
- **MediationCase**: Multi-party dispute management
- **LegalGuidance**: AI-generated step-by-step guidance

### Utility Types

- **ApiResponse**: Standardized API response format
- **Location**: Geographic location data
- **LegalCategory**: Enumerated legal practice areas

## Environment Configuration

Required environment variables:

```env
# Server Configuration
JWT_SECRET=your_jwt_secret
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jurisguide
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# External API Keys
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_API_KEY=your_maps_key
STRIPE_SECRET_KEY=your_stripe_key
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start development server:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run migrate` - Run database migrations

## API Endpoints

### Health Check
- `GET /api/health` - Server and database health status

### Legacy Endpoints (to be migrated)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/requests` - Request management
- `GET /api/departments` - Department information

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Database Operations
- Use the provided operation classes in `database/operations.ts`
- Always use parameterized queries to prevent SQL injection
- Handle database errors gracefully
- Use transactions for multi-table operations

### Error Handling
- Use the standardized response utilities in `utils/response.ts`
- Log errors with appropriate context using `utils/logger.ts`
- Return meaningful error messages to clients
- Never expose sensitive information in error responses

### Security Considerations
- Validate all input using `utils/validation.ts`
- Use JWT tokens for authentication
- Implement rate limiting for API endpoints
- Sanitize user input to prevent XSS attacks
- Use HTTPS in production

## Migration from Legacy Code

The server maintains backward compatibility with the existing client-portal structure while adding new JurisGuide functionality:

1. **Legacy Routes**: Existing auth, requests, and departments routes remain functional
2. **Database**: New PostgreSQL schema alongside existing JSON file storage
3. **TypeScript**: Gradual migration from JavaScript to TypeScript
4. **Enhanced Features**: New legal domain models and operations

## Next Steps

1. Migrate existing routes to TypeScript
2. Implement new legal guidance API endpoints
3. Add lawyer matching and mediation services
4. Integrate external AI and payment services
5. Add comprehensive testing suite

## Support

For development questions or issues, refer to the project documentation or contact the development team.