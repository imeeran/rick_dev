-- Create database if it doesn't exist
-- Note: This should be run as a superuser or database owner
-- CREATE DATABASE rick_db;

-- Connect to the database and create tables
-- \c rick_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create post_categories junction table
CREATE TABLE IF NOT EXISTS post_categories (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- Create analytics table for tracking
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create field_metadata table
CREATE TABLE IF NOT EXISTS field_metadata (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL UNIQUE,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'currency', 'date', 'boolean')),
    sortable BOOLEAN DEFAULT true,
    highlight BOOLEAN DEFAULT false,
    hidden BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create finance_records table
CREATE TABLE IF NOT EXISTS finance_records (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payslips table with JSONB data storage (similar to finance_records)
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- Create indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_finance_records_rick ON finance_records USING GIN ((data->>'rick'));
CREATE INDEX IF NOT EXISTS idx_finance_records_created_at ON finance_records(created_at);

-- Create indexes for payslips JSONB queries
CREATE INDEX IF NOT EXISTS idx_payslips_rick ON payslips USING GIN ((data->>'rick'));
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips USING GIN ((data->>'employee_id'));
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips USING GIN ((data->>'month'), (data->>'year'));
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips USING GIN ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips USING GIN ((data->>'pay_period_start'), (data->>'pay_period_end'));
CREATE INDEX IF NOT EXISTS idx_payslips_created_at ON payslips(created_at);

-- Insert sample data
INSERT INTO users (username, email, password_hash, role) VALUES 
    ('admin', 'admin@example.com', 'hashed_password_here', 'admin'),
    ('john_doe', 'john@example.com', 'hashed_password_here', 'user'),
    ('moderator', 'mod@example.com', 'hashed_password_here', 'moderator')
ON CONFLICT (username) DO NOTHING;

INSERT INTO categories (name, slug, description) VALUES 
    ('Technology', 'technology', 'Posts about technology and programming'),
    ('Lifestyle', 'lifestyle', 'Posts about lifestyle and personal experiences'),
    ('News', 'news', 'Latest news and updates')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO posts (title, content, user_id, status, is_featured) VALUES 
    ('Welcome to Rick Backend', 'This is the first post in our application!', 1, 'published', true),
    ('Getting Started with Node.js', 'Learn how to use our API endpoints.', 1, 'published', false),
    ('Draft Post', 'This is a draft post.', 2, 'draft', false)
ON CONFLICT DO NOTHING;

INSERT INTO post_categories (post_id, category_id) VALUES 
    (1, 1),
    (2, 1),
    (3, 2)
ON CONFLICT DO NOTHING;
