# Booking API Documentation

This document provides comprehensive information about the Booking API endpoints in the admin panel.

## Base URL
```
/api/admin/bookings
```

## Authentication
All booking endpoints require authentication and appropriate permissions:
- `bookings.view` - View bookings
- `bookings.create` - Create bookings
- `bookings.update` - Update bookings
- `bookings.delete` - Delete bookings

---

## Endpoints

### 1. GET All Bookings (List)

**Endpoint:** `GET /api/admin/bookings`

**Description:** Retrieve a paginated list of all bookings with optional filtering.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 0 | Page number (0-indexed) |
| size | number | 10 | Number of items per page |
| sort | string | created_at | Field to sort by |
| order | string | desc | Sort order (asc/desc) |
| search | string | - | Search term for filtering |
| status | string | - | Filter by status |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "1",
        "name": "John Doe",
        "car_type": "BMW 7 Series",
        "pickup_loc": "123 Main St, New York, NY",
        "drop_loc": "456 Park Ave, New York, NY",
        "booking_date": "2025-10-15",
        "booking_time": "14:30:00",
        "guest_name": "John Doe",
        "mobile_number": "+1234567890",
        "email_id": "john.doe@example.com",
        "special_note": "Please call upon arrival",
        "assigned_driver": "Driver 1",
        "status": "pending",
        "created_at": "2025-10-12T10:30:00.000Z",
        "updated_at": "2025-10-12T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 0,
      "size": 10,
      "total": 50,
      "last_page": 4
    }
  },
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 2. GET Single Booking Details

**Endpoint:** `GET /api/admin/bookings/:id`

**Description:** Retrieve details of a specific booking by ID.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Booking ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "id": "1",
    "name": "John Doe",
    "car_type": "BMW 7 Series",
    "pickup_loc": "123 Main St, New York, NY",
    "drop_loc": "456 Park Ave, New York, NY",
    "booking_date": "2025-10-15",
    "booking_time": "14:30:00",
    "guest_name": "John Doe",
    "mobile_number": "+1234567890",
    "email_id": "john.doe@example.com",
    "special_note": "Please call upon arrival",
    "assigned_driver": "Driver 1",
    "status": "pending",
    "created_at": "2025-10-12T10:30:00.000Z",
    "updated_at": "2025-10-12T10:30:00.000Z"
  },
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 3. POST Create New Booking

**Endpoint:** `POST /api/admin/bookings`

**Description:** Create a new booking.

**Request Body:**
```json
{
  "vehicleType": "BMW 7 Series",
  "pickupLocation": "123 Main St, New York, NY",
  "dropoffLocation": "456 Park Ave, New York, NY",
  "bookingDate": "2025-10-15",
  "bookingTime": "14:30",
  "guestName": "John Doe",
  "mobileNumber": "+1234567890",
  "emailId": "john.doe@example.com",
  "specialNote": "Please call upon arrival"
}
```

**Required Fields:**
- `vehicleType` (string)
- `pickupLocation` (string)
- `dropoffLocation` (string)
- `bookingDate` (string, format: YYYY-MM-DD)
- `bookingTime` (string, format: HH:MM)
- `guestName` (string)
- `mobileNumber` (string)

**Optional Fields:**
- `emailId` (string, must be valid email format)
- `specialNote` (string)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking": {
    "id": "1",
    "name": "John Doe",
    "car_type": "BMW 7 Series",
    "pickup_loc": "123 Main St, New York, NY",
    "drop_loc": "456 Park Ave, New York, NY",
    "booking_date": "2025-10-15",
    "booking_time": "14:30:00",
    "guest_name": "John Doe",
    "mobile_number": "+1234567890",
    "email_id": "john.doe@example.com",
    "special_note": "Please call upon arrival",
    "assigned_driver": null,
    "status": "pending",
    "created_at": "2025-10-12T10:30:00.000Z",
    "updated_at": "2025-10-12T10:30:00.000Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "message": "Missing required fields",
    "required": [
      "vehicleType",
      "pickupLocation",
      "dropoffLocation",
      "bookingDate",
      "bookingTime",
      "guestName",
      "mobileNumber"
    ]
  },
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 4. PUT Update Booking

**Endpoint:** `PUT /api/admin/bookings/:id`

**Description:** Update an existing booking.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Booking ID |

**Request Body:**
```json
{
  "vehicleType": "Mercedes S-Class",
  "pickupLocation": "123 Main St, New York, NY",
  "dropoffLocation": "789 Broadway, New York, NY",
  "bookingDate": "2025-10-16",
  "bookingTime": "15:00",
  "guestName": "John Doe",
  "mobileNumber": "+1234567890",
  "emailId": "john.doe@example.com",
  "specialNote": "Updated note",
  "status": "confirmed"
}
```

**Note:** All fields are optional. Only provided fields will be updated.

**Available Status Values:**
- `pending`
- `confirmed`
- `in_progress`
- `completed`
- `cancelled`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "booking": {
    "id": "1",
    "name": "John Doe",
    "car_type": "Mercedes S-Class",
    "pickup_loc": "123 Main St, New York, NY",
    "drop_loc": "789 Broadway, New York, NY",
    "booking_date": "2025-10-16",
    "booking_time": "15:00:00",
    "guest_name": "John Doe",
    "mobile_number": "+1234567890",
    "email_id": "john.doe@example.com",
    "special_note": "Updated note",
    "assigned_driver": "Driver 1",
    "status": "confirmed",
    "created_at": "2025-10-12T10:30:00.000Z",
    "updated_at": "2025-10-12T15:45:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 5. PATCH Assign Driver

**Endpoint:** `PATCH /api/admin/bookings/:id/assign-driver`

**Description:** Assign a driver to a specific booking.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Booking ID |

**Request Body:**
```json
{
  "driver_name": "Driver 1"
}
```

**Required Fields:**
- `driver_name` (string)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Driver assigned successfully",
  "booking": {
    "id": "1",
    "assigned_driver": "Driver 1"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

### 6. DELETE Booking

**Endpoint:** `DELETE /api/admin/bookings/:id`

**Description:** Delete a specific booking.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | number | Yes | Booking ID |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Booking not found",
  "timestamp": "2025-10-12T10:30:00.000Z"
}
```

---

## Database Schema

### Bookings Table

```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    car_type VARCHAR(100) NOT NULL,
    pickup_loc TEXT NOT NULL,
    drop_loc TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email_id VARCHAR(255),
    special_note TEXT,
    assigned_driver VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

The following indexes are created for optimal query performance:
- `idx_bookings_status` on `status`
- `idx_bookings_booking_date` on `booking_date`
- `idx_bookings_guest_name` on `guest_name`
- `idx_bookings_email_id` on `email_id`
- `idx_bookings_mobile_number` on `mobile_number`
- `idx_bookings_assigned_driver` on `assigned_driver`
- `idx_bookings_created_at` on `created_at`

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (authentication required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Examples

### Example 1: Get all pending bookings

```bash
curl -X GET "http://localhost:3000/api/admin/bookings?status=pending&page=0&size=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: Create a new booking

```bash
curl -X POST "http://localhost:3000/api/admin/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "BMW 7 Series",
    "pickupLocation": "123 Main St, New York, NY",
    "dropoffLocation": "456 Park Ave, New York, NY",
    "bookingDate": "2025-10-15",
    "bookingTime": "14:30",
    "guestName": "John Doe",
    "mobileNumber": "+1234567890",
    "emailId": "john.doe@example.com",
    "specialNote": "Please call upon arrival"
  }'
```

### Example 3: Assign driver to booking

```bash
curl -X PATCH "http://localhost:3000/api/admin/bookings/1/assign-driver" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "driver_name": "Driver 1"
  }'
```

### Example 4: Update booking status

```bash
curl -X PUT "http://localhost:3000/api/admin/bookings/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

### Example 5: Delete a booking

```bash
curl -X DELETE "http://localhost:3000/api/admin/bookings/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. **Permissions**: Ensure that the user has appropriate permissions (`bookings.view`, `bookings.create`, `bookings.update`, `bookings.delete`) to access these endpoints.

2. **Date Format**: Use ISO date format (YYYY-MM-DD) for `bookingDate`.

3. **Time Format**: Use 24-hour time format (HH:MM) for `bookingTime`.

4. **Email Validation**: The `emailId` field must be a valid email format if provided.

5. **Status Values**: Only the following status values are accepted:
   - `pending`
   - `confirmed`
   - `in_progress`
   - `completed`
   - `cancelled`

6. **Search Functionality**: The search parameter searches across:
   - Guest name
   - Email ID
   - Mobile number
   - Car type
   - Pickup location
   - Drop location

7. **Pagination**: The API uses 0-indexed pagination. The `last_page` field in the pagination response indicates the last available page index.

8. **Timestamps**: All timestamps are returned in ISO 8601 format with timezone information.

---

## Database Setup

To set up the bookings table in your database, run the following SQL script:

```bash
psql -U your_username -d your_database -f database/bookings_schema.sql
```

Or connect to your database and execute the SQL statements from `database/bookings_schema.sql`.

