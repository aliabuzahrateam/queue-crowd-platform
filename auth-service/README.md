# Auth Service

This is the authentication service for the Queue Crowd Platform.

## Database Setup

### Prerequisites

1. Make sure you have PostgreSQL running and accessible
2. Set up your environment variables in `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/queue_crowd_db"
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run db:generate
```

3. Push schema to database:
```bash
npm run db:push
```

4. Seed the database with initial data:
```bash
npm run db:seed
```

### Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:migrate:deploy` - Deploy migrations to production
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run db:seed` - Seed database with initial data

### Database Schema

The service uses the following models:

- **User**: Stores user authentication data
- **Session**: Manages user sessions and refresh tokens
- **PasswordReset**: Handles password reset functionality

### Initial Users

The seed script creates the following test users:

- **Admin**: admin@queuecrowd.com / admin123
- **Test User**: test@queuecrowd.com / test123
- **Staff**: staff@queuecrowd.com / staff123

### Development

To start development:

1. Install dependencies: `npm install`
2. Set up database: `npm run db:push`
3. Seed data: `npm run db:seed`
4. Start development server: `npm run dev`

### Production

For production deployment:

1. Set up environment variables
2. Run migrations: `npm run db:migrate:deploy`
3. Start the service: `npm start` 