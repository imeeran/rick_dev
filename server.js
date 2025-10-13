const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { query } = require('./shared/database/connection');

// Import application routes
const authRoutes = require('./admin/routes/authRoutes');
const userRoutes = require('./routes/auth'); // User info endpoint
const adminRoutes = require('./admin/routes/adminRoutes');
const appRoutes = require('./app/routes/appRoutes');
const siteRoutes = require('./site/routes/siteRoutes');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:4200',  // Angular dev server
      'http://localhost:3000',  // Same origin
      'http://127.0.0.1:4200',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
      // In production, use: callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers)
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
};

// Middleware
app.use(helmet()); // Security headers
app.use(cors(corsOptions)); // Enable CORS with configuration
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT NOW()');
    res.status(200).json({
      status: 'OK',
      message: 'Server is running and database is connected',
      timestamp: new Date().toISOString(),
      applications: {
        admin: '/api/admin',
        app: '/api/app',
        site: '/api/site'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Application routes
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api', userRoutes); // User info endpoint (/api/user)
app.use('/api/admin', adminRoutes);
app.use('/api/app', appRoutes);
app.use('/api/site', siteRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Rick Backend API',
    version: '1.0.0',
    applications: {
      admin: {
        description: 'Admin panel for content management',
        baseUrl: '/api/admin',
        endpoints: {
          users: '/api/admin/users',
          posts: '/api/admin/posts',
          analytics: '/api/admin/analytics',
          dashboard: '/api/admin/dashboard/stats'
        }
      },
      app: {
        description: 'Mobile/web app API for authenticated users',
        baseUrl: '/api/app',
        endpoints: {
          auth: '/api/app/auth',
          posts: '/api/app/posts',
          comments: '/api/app/comments'
        }
      },
      site: {
        description: 'Public website API',
        baseUrl: '/api/site',
        endpoints: {
          posts: '/api/site/posts',
          categories: '/api/site/categories',
          search: '/api/site/search',
          comments: '/api/site/comments'
        }
      }
    },
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableApplications: ['/api/admin', '/api/app', '/api/site']
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.server.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Admin API: http://localhost:${PORT}/api/admin`);
  console.log(`📱 App API: http://localhost:${PORT}/api/app`);
  console.log(`🌐 Site API: http://localhost:${PORT}/api/site`);
});

module.exports = app;
