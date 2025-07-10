# Auth Service Database Migration Guide

This guide will help you migrate data to the database for the auth service.

## Prerequisites

1. **Node.js and npm** - Make sure you have Node.js installed (version 16 or higher)
2. **PostgreSQL Database** - A running PostgreSQL instance
3. **Environment Variables** - Properly configured `.env` file

## Step 1: Environment Setup

Create a `.env` file in the auth-service directory with the following content:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/queue_crowd_db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"

# Password Reset
PASSWORD_RESET_EXPIRES_IN="1h"
```

**Important**: Replace `username`, `password`, `localhost`, `5432`, and `queue_crowd_db` with your actual PostgreSQL credentials and database name.

## Step 2: Install Dependencies

```bash
cd auth-service
npm install
```

## Step 3: Generate Prisma Client

```bash
npm run db:generate
```

This command generates the Prisma client based on your schema.

## Step 4: Push Schema to Database

```bash
npm run db:push
```

This command pushes your Prisma schema to the database, creating the necessary tables.

## Step 5: Seed the Database

```bash
npm run db:seed
```

This command populates the database with initial test data.

## Automated Setup

If you prefer to run everything at once, use the provided script:

```bash
chmod +x setup-migration.sh
./setup-migration.sh
```

## Database Schema

The migration creates the following tables in the `auth_service` schema:

### User Table
- `id` - Unique identifier (UUID)
- `username` - Unique username
- `email` - Unique email address
- `phone` - Optional phone number
- `password_hash` - Hashed password
- `role` - User role (admin, staff, user)
- `is_active` - Account status
- `is_2fa_enabled` - Two-factor authentication status
- `two_fa_secret` - 2FA secret key
- `last_login_at` - Last login timestamp
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### Session Table
- `id` - Unique identifier (UUID)
- `user_id` - Reference to user
- `refresh_token` - Unique refresh token
- `user_agent` - Browser/client information
- `ip_address` - Client IP address
- `expires_at` - Token expiration
- `created_at` - Session creation timestamp

### PasswordReset Table
- `id` - Unique identifier (UUID)
- `user_id` - Reference to user
- `token` - Unique reset token
- `expires_at` - Token expiration
- `used` - Whether token has been used
- `created_at` - Token creation timestamp

## Initial Test Data

The seed script creates the following test users:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@queuecrowd.com | admin123 | admin | System administrator |
| test@queuecrowd.com | test123 | user | Regular user |
| staff@queuecrowd.com | staff123 | staff | Staff member |

## Verification

To verify the migration was successful:

1. **Check database connection**:
   ```bash
   npm run db:studio
   ```

2. **Query users**:
   ```sql
   SELECT username, email, role FROM auth_service.user;
   ```

3. **Check table structure**:
   ```sql
   \dt auth_service.*
   ```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists

2. **Permission denied**
   - Check database user permissions
   - Verify schema creation rights

3. **Prisma client not found**
   - Run `npm run db:generate`
   - Check if `generated/prisma` directory exists

4. **Migration conflicts**
   - Drop and recreate database if needed
   - Use `npm run db:push --force-reset` for development

### Useful Commands

```bash
# Reset database (development only)
npm run db:push --force-reset

# View database in Prisma Studio
npm run db:studio

# Create new migration
npm run db:migrate

# Deploy migrations to production
npm run db:migrate:deploy

# Check database status
npx prisma db pull
```

## Production Deployment

For production environments:

1. Use strong, unique JWT secrets
2. Set `NODE_ENV=production`
3. Use proper database credentials
4. Run `npm run db:migrate:deploy` instead of `db:push`
5. Disable seed script in production

## Next Steps

After successful migration:

1. Start the auth service: `npm start`
2. Test authentication endpoints
3. Integrate with other services
4. Set up monitoring and logging

## Support

If you encounter issues:

1. Check the logs for error messages
2. Verify database connectivity
3. Ensure all environment variables are set
4. Review the Prisma documentation: https://www.prisma.io/docs 