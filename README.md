# Rick Backend

A comprehensive Node.js backend API built with Express.js and PostgreSQL, designed to support three distinct applications: Admin Panel, Mobile/Web App, and Public Website.

## 🏗️ Architecture

This backend is structured to serve three different applications:

- **🔧 Admin Panel** (`/api/admin`) - Full content management system for administrators
- **📱 Mobile/Web App** (`/api/app`) - Authenticated user interface for registered users
- **🌐 Public Website** (`/api/site`) - Public-facing content for visitors

## ✨ Features

- **Multi-Application Support** - Three distinct API endpoints for different use cases
- **Express.js** - Fast, unopinionated web framework
- **PostgreSQL** - Robust relational database with advanced features
- **RESTful APIs** - Clean, well-structured endpoints for each application
- **Security** - Helmet.js for security headers and input validation
- **Logging** - Morgan for HTTP request logging
- **CORS** - Cross-origin resource sharing enabled
- **Error Handling** - Comprehensive error handling and validation
- **Analytics** - Built-in tracking and analytics system
- **Role-Based Access** - User roles and permissions system

## 🚀 API Applications

### 🔧 Admin Panel (`/api/admin`)
**Purpose**: Complete content management system for administrators

**Key Features**:
- User management with roles and permissions
- Post management with status control
- Comment moderation system
- Analytics dashboard
- Content categorization
- Featured content management

**Endpoints**:
- `GET /api/admin/users` - Manage all users
- `GET /api/admin/posts` - Manage all posts
- `GET /api/admin/dashboard/stats` - Dashboard analytics
- `GET /api/admin/analytics` - Detailed analytics
- `PATCH /api/admin/posts/:id/status` - Update post status
- `PATCH /api/admin/posts/:id/toggle-featured` - Toggle featured status

### 📱 Mobile/Web App (`/api/app`)
**Purpose**: Authenticated user interface for registered users

**Key Features**:
- User authentication and profile management
- Personal post creation and management
- Comment system for authenticated users
- User-specific content filtering
- Draft and published post management

**Endpoints**:
- `POST /api/app/auth/register` - User registration
- `POST /api/app/auth/login` - User login
- `GET /api/app/auth/profile` - Get user profile
- `GET /api/app/posts` - Get published posts
- `POST /api/app/posts` - Create new post
- `GET /api/app/posts/my` - Get user's own posts
- `POST /api/app/comments` - Create comment

### 🌐 Public Website (`/api/site`)
**Purpose**: Public-facing content for website visitors

**Key Features**:
- Public post browsing
- Category-based content filtering
- Search functionality
- Public comment submission
- Featured content display
- Site statistics

**Endpoints**:
- `GET /api/site/posts/featured` - Get featured posts
- `GET /api/site/posts/latest` - Get latest posts
- `GET /api/site/categories` - Get all categories
- `GET /api/site/search` - Search posts
- `POST /api/site/comments` - Submit public comment
- `GET /api/site/stats` - Get site statistics

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rick-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb rick_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE rick_db;
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rick_db
   DB_USER=postgres
   DB_PASSWORD=your_password

   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # JWT Secret (for future authentication)
   JWT_SECRET=your_jwt_secret_key_here
   ```

5. **Initialize database**
   ```bash
   # Run the SQL initialization script
   psql -U postgres -d rick_db -f shared/database/init.sql
   ```

6. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

## 🚀 Usage Examples

### Admin Panel Examples

**Get Dashboard Statistics**
```bash
curl http://localhost:3000/api/admin/dashboard/stats
```

**Manage Users**
```bash
# Get all users with pagination
curl "http://localhost:3000/api/admin/users?page=1&limit=10&role=user"

# Create new user
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "securepassword",
    "role": "user"
  }'
```

**Manage Posts**
```bash
# Get all posts with filters
curl "http://localhost:3000/api/admin/posts?status=published&is_featured=true"

# Toggle featured status
curl -X PATCH http://localhost:3000/api/admin/posts/1/toggle-featured
```

### Mobile/Web App Examples

**User Registration**
```bash
curl -X POST http://localhost:3000/api/app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**User Login**
```bash
curl -X POST http://localhost:3000/api/app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Create Post**
```bash
curl -X POST http://localhost:3000/api/app/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my first post!",
    "category_ids": [1, 2]
  }'
```

### Public Website Examples

**Get Featured Posts**
```bash
curl http://localhost:3000/api/site/posts/featured
```

**Search Posts**
```bash
curl "http://localhost:3000/api/site/search?q=technology&page=1&limit=10"
```

**Submit Public Comment**
```bash
curl -X POST http://localhost:3000/api/site/comments \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": 1,
    "content": "Great article!",
    "author_name": "John Doe",
    "author_email": "john@example.com"
  }'
```

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `username` (VARCHAR(50) UNIQUE NOT NULL)
- `email` (VARCHAR(100) UNIQUE NOT NULL)
- `password_hash` (VARCHAR(255) NOT NULL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Posts Table
- `id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(200) NOT NULL)
- `content` (TEXT)
- `user_id` (INTEGER REFERENCES users(id))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Comments Table
- `id` (SERIAL PRIMARY KEY)
- `content` (TEXT NOT NULL)
- `post_id` (INTEGER REFERENCES posts(id))
- `user_id` (INTEGER REFERENCES users(id))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 📁 Project Structure

```
rick-backend/
├── config.js                    # Configuration file
├── server.js                    # Main server file
├── package.json                 # Dependencies and scripts
├── shared/                      # Shared components
│   ├── database/
│   │   ├── connection.js        # Database connection pool
│   │   └── init.sql            # Database initialization script
│   └── utils/
│       ├── response.js          # Standardized response utilities
│       └── validation.js        # Input validation utilities
├── admin/                       # Admin Panel Application
│   ├── controllers/
│   │   ├── userController.js    # User management
│   │   ├── postController.js    # Post management
│   │   └── analyticsController.js # Analytics and dashboard
│   └── routes/
│       └── adminRoutes.js       # Admin API routes
├── app/                         # Mobile/Web App Application
│   ├── controllers/
│   │   ├── authController.js    # Authentication
│   │   ├── postController.js    # User posts
│   │   └── commentController.js # User comments
│   └── routes/
│       └── appRoutes.js         # App API routes
├── site/                        # Public Website Application
│   ├── controllers/
│   │   ├── publicController.js  # Public content
│   │   └── commentController.js  # Public comments
│   └── routes/
│       └── siteRoutes.js        # Site API routes
└── README.md                    # This file
```

## Development

### Scripts
- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with auto-restart
- `npm test` - Run tests (not implemented yet)

### Environment Variables
All configuration is handled through environment variables. See the `config.js` file for available options.

## Security Notes

- Passwords should be hashed using bcrypt before storing
- Implement proper authentication and authorization
- Use HTTPS in production
- Validate and sanitize all inputs
- Implement rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
