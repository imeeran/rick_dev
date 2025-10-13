# Booking System Setup Guide

## 📋 Overview

This guide provides instructions for setting up and using the newly created booking system in the Rick backend application.

## 🆕 What Was Created

### 1. **Booking Controller** (`admin/controllers/bookingController.js`)
A comprehensive controller implementing all CRUD operations for bookings:
- ✅ GET all bookings with pagination and filtering
- ✅ GET single booking by ID
- ✅ POST create new booking
- ✅ PUT update booking
- ✅ PATCH assign driver to booking
- ✅ DELETE booking

### 2. **API Routes** (`admin/routes/adminRoutes.js`)
Added the following protected routes:
```
GET    /api/admin/bookings              - Get all bookings
GET    /api/admin/bookings/:id          - Get single booking
POST   /api/admin/bookings              - Create booking
PUT    /api/admin/bookings/:id          - Update booking
PATCH  /api/admin/bookings/:id/assign-driver - Assign driver
DELETE /api/admin/bookings/:id          - Delete booking
```

### 3. **Database Schema** (`database/bookings_schema.sql`)
Created a complete database schema including:
- Bookings table with all required fields
- Indexes for optimal query performance
- Automatic timestamp update trigger
- Sample data for testing

### 4. **Documentation** (`admin/BOOKING_API_DOCUMENTATION.md`)
Comprehensive API documentation with:
- Detailed endpoint descriptions
- Request/response examples
- Database schema information
- cURL examples for testing

## 🚀 Setup Instructions

### Step 1: Create the Database Table

Run the SQL schema file to create the bookings table:

```bash
# Option 1: Using psql command line
psql -U your_username -d your_database -f database/bookings_schema.sql

# Option 2: Using a database client
# Open database/bookings_schema.sql in your preferred SQL client and execute
```

### Step 2: Verify Routes are Loaded

The booking routes are automatically loaded through `admin/routes/adminRoutes.js`. Ensure your `server.js` is properly configured:

```javascript
const adminRoutes = require('./admin/routes/adminRoutes');
app.use('/api/admin', adminRoutes);
```

### Step 3: Set Up Permissions (RBAC)

Add the following permissions to your RBAC system:
- `bookings.view` - View bookings
- `bookings.create` - Create bookings
- `bookings.update` - Update bookings and assign drivers
- `bookings.delete` - Delete bookings

### Step 4: Test the API

Start your server and test the endpoints:

```bash
# Start the server
npm start

# Test GET all bookings
curl -X GET "http://localhost:3000/api/admin/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test create booking
curl -X POST "http://localhost:3000/api/admin/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "BMW 7 Series",
    "pickupLocation": "123 Main St",
    "dropoffLocation": "456 Park Ave",
    "bookingDate": "2025-10-15",
    "bookingTime": "14:30",
    "guestName": "John Doe",
    "mobileNumber": "+1234567890"
  }'
```

## 📊 API Response Format

### List Bookings Response
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [...],
    "pagination": {
      "page": 0,
      "size": 10,
      "total": 50,
      "last_page": 4
    }
  }
}
```

### Create/Update Response
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": "1",
    "name": "John Doe",
    "car_type": "BMW 7 Series",
    ...
  }
}
```

## 🔧 Field Mapping

The controller handles field name mapping between frontend and database:

| Frontend Field    | Database Field   | Type     | Required |
|-------------------|------------------|----------|----------|
| vehicleType       | car_type         | string   | ✅       |
| pickupLocation    | pickup_loc       | string   | ✅       |
| dropoffLocation   | drop_loc         | string   | ✅       |
| bookingDate       | booking_date     | date     | ✅       |
| bookingTime       | booking_time     | time     | ✅       |
| guestName         | guest_name       | string   | ✅       |
| mobileNumber      | mobile_number    | string   | ✅       |
| emailId           | email_id         | string   | ❌       |
| specialNote       | special_note     | text     | ❌       |
| -                 | assigned_driver  | string   | ❌       |
| -                 | status           | string   | ❌       |

## 🔐 Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Permission-Based Access**: RBAC middleware checks user permissions
3. **Input Validation**: 
   - Email format validation
   - Required field validation
   - Status value validation
4. **SQL Injection Prevention**: All queries use parameterized statements

## 🎯 Features

### Search & Filter
- Search across: guest name, email, mobile, car type, locations
- Filter by status
- Sort by any field (ascending/descending)

### Pagination
- Configurable page size
- Zero-indexed pages
- Total count and last page calculation

### Status Management
Available status values:
- `pending` (default)
- `confirmed`
- `in_progress`
- `completed`
- `cancelled`

### Driver Assignment
Separate endpoint for assigning drivers to bookings without modifying other booking details.

## 📁 File Structure

```
backend/
├── admin/
│   ├── controllers/
│   │   └── bookingController.js         # ← NEW: Booking CRUD operations
│   ├── routes/
│   │   └── adminRoutes.js               # ← UPDATED: Added booking routes
│   ├── BOOKING_API_DOCUMENTATION.md     # ← NEW: Comprehensive API docs
│   └── BOOKING_SETUP_GUIDE.md           # ← NEW: This file
└── database/
    └── bookings_schema.sql              # ← NEW: Database schema
```

## 🧪 Testing Checklist

- [ ] Database table created successfully
- [ ] Server starts without errors
- [ ] GET /api/admin/bookings returns data
- [ ] POST /api/admin/bookings creates booking
- [ ] GET /api/admin/bookings/:id returns single booking
- [ ] PUT /api/admin/bookings/:id updates booking
- [ ] PATCH /api/admin/bookings/:id/assign-driver assigns driver
- [ ] DELETE /api/admin/bookings/:id deletes booking
- [ ] Authentication works correctly
- [ ] Permissions are enforced
- [ ] Search functionality works
- [ ] Pagination works correctly
- [ ] Email validation works

## 🐛 Troubleshooting

### Issue: "Table 'bookings' does not exist"
**Solution:** Run the SQL schema file to create the table:
```bash
psql -U your_username -d your_database -f database/bookings_schema.sql
```

### Issue: "Permission denied"
**Solution:** Ensure the user has the required permissions:
- `bookings.view`
- `bookings.create`
- `bookings.update`
- `bookings.delete`

### Issue: "Unauthorized"
**Solution:** Include a valid JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Issue: "Validation failed"
**Solution:** Check that all required fields are provided in the request body. See the API documentation for required fields.

## 📞 Support

For detailed API documentation, refer to:
- `admin/BOOKING_API_DOCUMENTATION.md`

For database schema details, refer to:
- `database/bookings_schema.sql`

## ✅ Quick Start Summary

1. **Run SQL schema** → Create bookings table
2. **Restart server** → Load new routes
3. **Set permissions** → Add bookings.* permissions to roles
4. **Test endpoints** → Use cURL or Postman

That's it! Your booking system is now ready to use. 🎉

