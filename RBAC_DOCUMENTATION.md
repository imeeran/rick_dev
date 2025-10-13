# Role-Based Access Control (RBAC) System Documentation

## Overview
This document describes the complete RBAC implementation for the Rick Backend API system with Angular frontend support.

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Database Schema](#database-schema)
3. [Roles & Permissions](#roles--permissions)
4. [Authentication](#authentication)
5. [Authorization](#authorization)
6. [API Endpoints](#api-endpoints)
7. [Frontend Integration](#frontend-integration)
8. [Testing](#testing)

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install jsonwebtoken bcryptjs
```

### 2. Configure Environment Variables
Add to your `.env` file:
```env
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
PORT=3000
NODE_ENV=development
```

### 3. Run Database Schema
Execute the RBAC schema SQL file:
```bash
psql -d your_database_name -f shared/database/rbac_schema.sql
```

### 4. Start Server
```bash
npm start
```

---

## Database Schema

### Tables Created:
1. **roles** - Stores role definitions
2. **permissions** - Stores permission definitions
3. **role_permissions** - Junction table linking roles to permissions
4. **users** - Updated with role_id, password_hash, and auth fields

### Default Roles:
- `superadmin` - Full system access
- `admin` - Management access
- `manager` - Operational access
- `employee` - Limited access
- `driver` - Driver-specific access

### Permission Structure:
Format: `resource.action`
- Resources: users, drivers, vehicles, finances, payslips, roles, dashboard, reports
- Actions: view, create, update, delete, upload, generate, assign, export

---

## Roles & Permissions

### Superadmin
**All permissions** - Complete system control

### Admin
- ✅ Users: view, create, update, delete
- ✅ Drivers: view, create, update, delete
- ✅ Vehicles: view, create, update, delete
- ✅ Finances: view, create, update, delete, upload
- ✅ Payslips: view, create, update, delete, generate
- ✅ Dashboard: view
- ✅ Reports: view, export
- ❌ Roles: manage (superadmin only)

### Manager
- ✅ Drivers: view, create, update
- ✅ Vehicles: view, create, update
- ✅ Finances: view, create, update
- ✅ Payslips: view, create, generate
- ✅ Dashboard: view
- ✅ Reports: view
- ❌ Delete operations
- ❌ User management
- ❌ Role management

### Employee
- ✅ View only access to:
  - Drivers
  - Vehicles
  - Finances
  - Payslips
  - Dashboard
- ❌ No create, update, or delete permissions

### Driver
- ✅ View own data:
  - Own payslips
  - Assigned vehicles
  - Dashboard
- ❌ No access to other drivers' data
- ❌ No management functions

---

## Authentication

### Register User
**POST** `/api/auth/register`

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "employee"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "employee",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
**POST** `/api/auth/login`

```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "employee",
      "isActive": true,
      "permissions": [
        {
          "name": "drivers.view",
          "resource": "drivers",
          "action": "view"
        }
      ]
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Refresh Token
**POST** `/api/auth/refresh`

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
**POST** `/api/auth/logout`

Headers: `Authorization: Bearer <accessToken>`

### Get Current User
**GET** `/api/auth/me`

Headers: `Authorization: Bearer <accessToken>`

### Change Password
**PUT** `/api/auth/change-password`

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## Authorization

### Middleware Functions

#### 1. `authenticate`
Verifies JWT token and attaches user info to request.

```javascript
const { authenticate } = require('./shared/middleware/auth');
router.get('/protected', authenticate, controller.method);
```

#### 2. `requireRole(...roles)`
Checks if user has one of the specified roles.

```javascript
const { requireRole } = require('./shared/middleware/authorize');
router.post('/admin-only', authenticate, requireRole('admin', 'superadmin'), controller.method);
```

#### 3. `requirePermission(permissionName)`
Checks if user has specific permission.

```javascript
const { requirePermission } = require('./shared/middleware/authorize');
router.get('/users', authenticate, requirePermission('users.view'), controller.method);
```

#### 4. `requireAdmin()`
Shorthand for admin or superadmin roles.

```javascript
const { requireAdmin } = require('./shared/middleware/authorize');
router.delete('/critical', authenticate, requireAdmin(), controller.method);
```

#### 5. `requireManager()`
Allows superadmin, admin, or manager roles.

```javascript
const { requireManager } = require('./shared/middleware/authorize');
router.post('/operations', authenticate, requireManager(), controller.method);
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| POST | `/api/auth/register` | No | - | Register new user |
| POST | `/api/auth/login` | No | - | User login |
| POST | `/api/auth/refresh` | No | - | Refresh access token |
| POST | `/api/auth/logout` | Yes | - | User logout |
| GET | `/api/auth/me` | Yes | - | Get current user info |
| PUT | `/api/auth/change-password` | Yes | - | Change password |

### Role Management Endpoints

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/api/auth/roles` | Yes | Admin | Get all roles |
| GET | `/api/auth/roles/:id` | Yes | Admin | Get role by ID |
| POST | `/api/auth/roles` | Yes | Superadmin | Create new role |
| PUT | `/api/auth/roles/:id` | Yes | Superadmin | Update role |
| DELETE | `/api/auth/roles/:id` | Yes | Superadmin | Delete role |
| GET | `/api/auth/permissions` | Yes | Admin | Get all permissions |
| POST | `/api/auth/roles/:id/permissions` | Yes | Superadmin | Assign permissions |
| GET | `/api/auth/roles/:id/users` | Yes | Admin | Get users by role |

### Protected Resource Endpoints

All `/api/admin/*` endpoints now require:
1. Valid JWT token (authentication)
2. Appropriate permissions (authorization)

Example:
```bash
# Get all drivers (requires 'drivers.view' permission)
curl -X GET http://localhost:3000/api/admin/drivers \
  -H "Authorization: Bearer <accessToken>"

# Create driver (requires 'drivers.create' permission)
curl -X POST http://localhost:3000/api/admin/drivers \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"rick_no": "RICK010", ...}'
```

---

## Frontend Integration (Angular)

### 1. Auth Service

```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
}

export interface Permission {
  name: string;
  resource: string;
  action: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          if (response.success) {
            this.storeAuth(response.data);
          }
        })
      );
  }

  register(username: string, email: string, password: string, role: string = 'employee'): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/register`, { username, email, password, role })
      .pipe(
        tap(response => {
          if (response.success) {
            this.storeAuth(response.data);
          }
        })
      );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuth();
        })
      );
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(
        tap(response => {
          if (response.success) {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
        })
      );
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.currentUserSubject.next(response.data);
          }
        })
      );
  }

  private storeAuth(data: AuthResponse): void {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    this.currentUserSubject.next(data.user);
  }

  private clearAuth(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  private loadStoredUser(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUserSubject.next(JSON.parse(userStr));
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  hasPermission(permissionName: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.permissions?.some(p => p.name === permissionName) || false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }
}
```

### 2. HTTP Interceptor

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getAccessToken();

    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.data.accessToken);
          return next.handle(this.addToken(request, response.data.accessToken));
        }),
        catchError(err => {
          this.isRefreshing = false;
          this.router.navigate(['/login']);
          return throwError(err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => next.handle(this.addToken(request, token)))
      );
    }
  }
}
```

### 3. Auth Guard

```typescript
// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authService.isAuthenticated()) {
      // Check for required role
      const requiredRole = route.data['role'];
      if (requiredRole && !this.authService.hasRole(requiredRole)) {
        this.router.navigate(['/unauthorized']);
        return false;
      }

      // Check for required permission
      const requiredPermission = route.data['permission'];
      if (requiredPermission && !this.authService.hasPermission(requiredPermission)) {
        this.router.navigate(['/unauthorized']);
        return false;
      }

      return true;
    }

    this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
}
```

### 4. Permission Directive

```typescript
// has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { AuthService } from './auth.service';

@Directive({
  selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnInit {
  @Input() hasPermission: string | string[] = '';

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    const permissions = Array.isArray(this.hasPermission) 
      ? this.hasPermission 
      : [this.hasPermission];

    const hasPermission = this.authService.hasAnyPermission(permissions);

    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
```

### 5. Usage in Components

```typescript
// app-routing.module.ts
const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { role: 'admin' },
    children: [
      { path: 'users', component: UsersComponent, data: { permission: 'users.view' } },
      { path: 'drivers', component: DriversComponent, data: { permission: 'drivers.view' } }
    ]
  }
];
```

```html
<!-- In templates -->
<button *hasPermission="'users.create'" (click)="createUser()">
  Create User
</button>

<div *hasPermission="['drivers.view', 'drivers.update']">
  <!-- Show if user has either permission -->
</div>
```

---

## Testing

### 1. Create Test Users

```bash
# Register superadmin
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "admin123",
    "role": "superadmin"
  }'

# Register admin
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### 2. Test Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Save the accessToken from response
export TOKEN="your_access_token_here"
```

### 3. Test Protected Endpoints

```bash
# Test with valid token and permission
curl -X GET http://localhost:3000/api/admin/drivers \
  -H "Authorization: Bearer $TOKEN"

# Test without token (should fail with 401)
curl -X GET http://localhost:3000/api/admin/drivers

# Test with insufficient permissions (should fail with 403)
# Login as employee and try to delete
curl -X DELETE http://localhost:3000/api/admin/drivers/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Best Practices

1. **Token Expiry**: Access tokens expire in 24 hours, refresh tokens in 7 days
2. **Password Hashing**: Uses bcrypt with salt rounds of 10
3. **HTTPS**: Always use HTTPS in production
4. **Token Storage**: Store tokens securely (HttpOnly cookies recommended for production)
5. **Rate Limiting**: Implement rate limiting on auth endpoints
6. **Input Validation**: All inputs are validated before processing
7. **SQL Injection**: Using parameterized queries throughout
8. **XSS Protection**: Helmet.js middleware enabled

---

## Troubleshooting

### Common Issues:

1. **"No token provided"**: Include `Authorization: Bearer <token>` header
2. **"Token expired"**: Use refresh token endpoint to get new access token
3. **"Access denied"**: User doesn't have required permission - check role assignments
4. **"User not found"**: Token is valid but user was deleted - logout and login again

---

## Support

For issues or questions, please refer to the API documentation or contact the development team.

**Version**: 1.0.0  
**Last Updated**: 2024
