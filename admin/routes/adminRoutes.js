const express = require('express');
const router = express.Router();

// Import controllers
const financeController = require('../controllers/financeController');
const payslipController = require('../controllers/payslipController');
const driverController = require('../controllers/driverController');
const usersController = require('../controllers/usersController');
const vehiclesController = require('../controllers/vehiclesController');
const dashboardController = require('../controllers/dashboardController');
const bookingController = require('../controllers/bookingController');

// Import middleware
const { authenticate } = require('../../shared/middleware/auth');
const { requirePermission, requireAdmin, requireManager } = require('../../shared/middleware/authorize');

// Apply authentication to all admin routes
router.use(authenticate);

// Finance routes (protected)
router.get('/finances', requirePermission('finances.view'), financeController.getFinances);
router.put('/finances/:id', requirePermission('finances.update'), financeController.updateFinance);
router.delete('/finances/:id', requirePermission('finances.delete'), financeController.deleteFinance);
router.delete('/finances', requirePermission('finances.delete'), financeController.bulkDeleteFinances);
router.delete('/finances/fields/:fieldname', requireAdmin(), financeController.deleteField);
router.post('/finances/upload', requirePermission('finances.upload'), financeController.upload.single('excelFile'), financeController.uploadFinances);
router.post('/finances/update', requirePermission('finances.upload'), financeController.upload.single('excelFile'), financeController.updateFinances);

// Payslip routes (protected)
router.get('/payslips', requirePermission('payslips.view'), payslipController.getAllPayslips);
router.get('/payslips/:id', requirePermission('payslips.view'), payslipController.getPayslipById);
router.post('/payslips', requirePermission('payslips.create'), payslipController.createPayslip);
router.put('/payslips/:id', requirePermission('payslips.update'), payslipController.updatePayslip);
router.delete('/payslips/:id', requirePermission('payslips.delete'), payslipController.deletePayslip);
router.get('/payslips/employee/:employee_id', requirePermission('payslips.view'), payslipController.getPayslipsByEmployee);
router.get('/payslips/summary', requirePermission('payslips.view'), payslipController.getPayslipSummary);
router.post('/payslips/generate', requirePermission('payslips.generate'), payslipController.generatePayslip);
router.get('/payslips/generate/:rick/:month/:year', requirePermission('payslips.generate'), payslipController.generatePayslipByParams);

// Driver routes (protected)
router.get('/drivers', requirePermission('drivers.view'), driverController.getAllDrivers);
router.get('/drivers/summary', requirePermission('drivers.view'), driverController.getDriverSummary);
router.get('/drivers/expiring', requirePermission('drivers.view'), driverController.getExpiringDrivers);
router.get('/drivers/status/:status', requirePermission('drivers.view'), driverController.getDriversByStatus);
router.get('/drivers/rick/:rick', requirePermission('drivers.view'), driverController.getDriverByRick);
router.get('/drivers/:id', requirePermission('drivers.view'), driverController.getDriverById);
router.post('/drivers', requirePermission('drivers.create'), driverController.createDriver);
router.put('/drivers/:id', requirePermission('drivers.update'), driverController.updateDriver);
router.put('/drivers/:id/status', requirePermission('drivers.update'), driverController.updateDriverStatus);
router.delete('/drivers/:id', requirePermission('drivers.delete'), driverController.deleteDriver);
router.delete('/drivers', requirePermission('drivers.delete'), driverController.bulkDeleteDrivers);

// Users routes (protected)
router.get('/users', requirePermission('users.view'), usersController.getAllUsers);
router.get('/users/summary', requirePermission('users.view'), usersController.getUserSummary);
router.get('/users/role/:role', requirePermission('users.view'), usersController.getUsersByRole);
router.get('/users/search/:query', requirePermission('users.view'), usersController.searchUsers);
router.get('/users/:id', requirePermission('users.view'), usersController.getUserById);
router.post('/users', requirePermission('users.create'), usersController.createUser);
router.put('/users/:id', requirePermission('users.update'), usersController.updateUser);
router.put('/users/:id/role', requireAdmin(), usersController.updateUserRole);
router.put('/users/:id/password', requireAdmin(), usersController.updateUserPassword);
router.delete('/users/:id', requirePermission('users.delete'), usersController.deleteUser);
router.delete('/users', requirePermission('users.delete'), usersController.bulkDeleteUsers);

// Vehicles routes (protected)
router.get('/vehicles', requirePermission('vehicles.view'), vehiclesController.getAllVehicles);
router.get('/vehicles/summary', requirePermission('vehicles.view'), vehiclesController.getVehicleSummary);
router.get('/vehicles/expiring', requirePermission('vehicles.view'), vehiclesController.getExpiringVehicles);
router.get('/vehicles/rick/:rick_no', requirePermission('vehicles.view'), vehiclesController.getVehiclesByRick);
router.get('/vehicles/:id', requirePermission('vehicles.view'), vehiclesController.getVehicleById);
router.post('/vehicles', requirePermission('vehicles.create'), vehiclesController.createVehicle);
router.put('/vehicles/:id', requirePermission('vehicles.update'), vehiclesController.updateVehicle);
router.delete('/vehicles/:id', requirePermission('vehicles.delete'), vehiclesController.deleteVehicle);
router.delete('/vehicles', requirePermission('vehicles.delete'), vehiclesController.bulkDeleteVehicles);

// Dashboard routes (protected)
router.get('/dashboard/drivers', requirePermission('dashboard.view'), dashboardController.getDriverStats);
router.get('/dashboard/vehicles', requirePermission('dashboard.view'), dashboardController.getVehicleStats);
router.get('/dashboard/stats', requirePermission('dashboard.view'), dashboardController.getAllStats);
router.get('/dashboard/expiring-documents', requirePermission('dashboard.view'), dashboardController.getExpiringDocuments);

// Booking routes (protected)
router.get('/bookings', requirePermission('bookings.view'), bookingController.getAllBookings);
router.get('/bookings/:id', requirePermission('bookings.view'), bookingController.getBookingById);
router.post('/bookings', requirePermission('bookings.create'), bookingController.createBooking);
router.put('/bookings/:id', requirePermission('bookings.update'), bookingController.updateBooking);
router.patch('/bookings/:id/assign-driver', requirePermission('bookings.update'), bookingController.assignDriver);
router.delete('/bookings/:id', requirePermission('bookings.delete'), bookingController.deleteBooking);

module.exports = router;
