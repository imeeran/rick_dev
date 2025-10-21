require('dotenv').config();

// Production/Remote Database Config (Currently Active)
// const config = {
//   database: {
//     host: process.env.DB_HOST || 'dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com',
//     port: process.env.DB_PORT || 5432,
//     database: process.env.DB_NAME || 'dev_rick',
//     user: process.env.DB_USER || 'dev_rick_user',
//     password: process.env.DB_PASSWORD || 'FesY8XYcICHswt2UUmtBR02jFWV8MadY',
//     ssl: { rejectUnauthorized: false }
//   },
//   server: {
//     port: process.env.PORT || 3000,
//     nodeEnv: process.env.NODE_ENV || 'development',
//   },
//   jwt: {
//     secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
//   },
// };

// Localhost Database Config (Commented Out)
// Uncomment this and comment out the above config to use localhost
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'meeranismail',
    // password: process.env.DB_PASSWORD || '',
  },
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  },
};

module.exports = config;
