const { query } = require('../../shared/database/connection');
const { sendSuccess, sendError } = require('../../shared/utils/response');

/**
 * Dashboard Controller
 * Handles dashboard statistics and analytics
 */

// GET /api/admin/dashboard/drivers - Get driver statistics
const getDriverStats = async (req, res) => {
  try {
    // Get total drivers count
    const totalDriversResult = await query(
      'SELECT COUNT(*) as total_drivers FROM drivers'
    );

    // Get available drivers count (you can define "available" based on your business logic)
    // For now, assuming all drivers are available unless they have a specific status
    const availableDriversResult = await query(
      `SELECT COUNT(*) as available_drivers 
       FROM drivers 
       WHERE status = 'active' OR status IS NULL`
    );

    const totalDrivers = parseInt(totalDriversResult.rows[0].total_drivers);
    const availableDrivers = parseInt(availableDriversResult.rows[0].available_drivers);

    sendSuccess(res, {
      total_drivers: totalDrivers,
      available_drivers: availableDrivers,
      unavailable_drivers: totalDrivers - availableDrivers
    }, 'Driver statistics retrieved successfully');

  } catch (error) {
    console.error('Error fetching driver stats:', error);
    sendError(res, 'Failed to fetch driver statistics', 500, error);
  }
};

// GET /api/admin/dashboard/vehicles - Get vehicle statistics
const getVehicleStats = async (req, res) => {
  try {
    // Get total vehicles count
    const totalVehiclesResult = await query(
      'SELECT COUNT(*) as total_vehicles FROM vehicles'
    );

    // Get available vehicles count (status = 'available')
    const availableVehiclesResult = await query(
      `SELECT COUNT(*) as available_vehicles 
       FROM vehicles 
       WHERE status = 'available'`
    );

    const totalVehicles = parseInt(totalVehiclesResult.rows[0].total_vehicles);
    const availableVehicles = parseInt(availableVehiclesResult.rows[0].available_vehicles);

    sendSuccess(res, {
      total_vehicles: totalVehicles,
      available_vehicles: availableVehicles,
      unavailable_vehicles: totalVehicles - availableVehicles
    }, 'Vehicle statistics retrieved successfully');

  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    sendError(res, 'Failed to fetch vehicle statistics', 500, error);
  }
};

// GET /api/admin/dashboard/stats - Get all dashboard statistics
const getAllStats = async (req, res) => {
  try {
    // Get driver stats
    const totalDriversResult = await query(
      'SELECT COUNT(*) as total_drivers FROM drivers'
    );

    const availableDriversResult = await query(
      `SELECT COUNT(*) as available_drivers 
       FROM drivers 
       WHERE status = 'active' OR status IS NULL`
    );

    // Get vehicle stats
    const totalVehiclesResult = await query(
      'SELECT COUNT(*) as total_vehicles FROM vehicles'
    );

    const availableVehiclesResult = await query(
      `SELECT COUNT(*) as available_vehicles 
       FROM vehicles 
       WHERE status = 'available'`
    );

    // Get finance stats
    const totalFinanceRecordsResult = await query(
      'SELECT COUNT(*) as total_records FROM finance_records'
    );

    const currentMonthFinanceResult = await query(
      `SELECT COUNT(*) as current_month_records 
       FROM finance_records 
       WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    );

    // Get payslip stats
    const totalPayslipsResult = await query(
      'SELECT COUNT(*) as total_payslips FROM payslips'
    );

    const currentMonthPayslipsResult = await query(
      `SELECT COUNT(*) as current_month_payslips 
       FROM payslips 
       WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    );

    // Get users stats
    const totalUsersResult = await query(
      'SELECT COUNT(*) as total_users FROM users'
    );

    // Calculate today's earnings from finance_records
    const todayEarningsResult = await query(
      `SELECT COALESCE(SUM((data->>'total_salary')::numeric), 0) as today_earnings
       FROM finance_records 
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // Calculate yesterday's earnings for increase percentage
    const yesterdayEarningsResult = await query(
      `SELECT COALESCE(SUM((data->>'total_salary')::numeric), 0) as yesterday_earnings
       FROM finance_records 
       WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'`
    );

    const todayEarnings = parseFloat(todayEarningsResult.rows[0].today_earnings) || 0;
    const yesterdayEarnings = parseFloat(yesterdayEarningsResult.rows[0].yesterday_earnings) || 0;
    const earningsIncrease = yesterdayEarnings > 0 
      ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings * 100).toFixed(2)
      : 0;

    // Get daily earnings for last 7 days (for graph)
    const dailyEarningsResult = await query(
      `SELECT 
        TO_CHAR(created_at, 'Dy') as day,
        COALESCE(SUM((data->>'total_salary')::numeric), 0) as earnings,
        COUNT(*) as orders
       FROM finance_records 
       WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY DATE(created_at), TO_CHAR(created_at, 'Dy')
       ORDER BY DATE(created_at) ASC`
    );

    // Prepare labels and series data for last 7 days
    const labels = dailyEarningsResult.rows.map(row => row.day);
    const earningsData = dailyEarningsResult.rows.map(row => parseFloat(row.earnings));
    const ordersData = dailyEarningsResult.rows.map(row => parseInt(row.orders));

    // Get task distribution (using payslip status as example)
    const taskDistributionResult = await query(
      `SELECT 
        data->>'status' as status,
        COUNT(*) as count
       FROM payslips
       GROUP BY data->>'status'`
    );

    const taskDistribution = {
      labels: ['Completed', 'Pending', 'In Progress', 'Cancelled'],
      series: [
        taskDistributionResult.rows.find(r => r.status === 'completed')?.count || 0,
        taskDistributionResult.rows.find(r => r.status === 'pending')?.count || 0,
        taskDistributionResult.rows.find(r => r.status === 'in_progress')?.count || 0,
        taskDistributionResult.rows.find(r => r.status === 'cancelled')?.count || 0
      ].map(v => parseInt(v))
    };

    const totalDrivers = parseInt(totalDriversResult.rows[0].total_drivers);
    const availableDrivers = parseInt(availableDriversResult.rows[0].available_drivers);
    const totalVehicles = parseInt(totalVehiclesResult.rows[0].total_vehicles);
    const availableVehicles = parseInt(availableVehiclesResult.rows[0].available_vehicles);
    const totalOrders = parseInt(totalFinanceRecordsResult.rows[0].total_records);
    const completedOrders = parseInt(currentMonthFinanceResult.rows[0].current_month_records);

    sendSuccess(res, {
      drivers: {
        total: totalDrivers,
        available: availableDrivers
      },
      vehicles: {
        total: totalVehicles,
        available: availableVehicles
      },
      orders: {
        total: totalOrders,
        completed: completedOrders
      },
      earnings: {
        today: todayEarnings,
        increase: parseFloat(earningsIncrease)
      },
      finance_records: {
        total: parseInt(totalFinanceRecordsResult.rows[0].total_records),
        current_month: parseInt(currentMonthFinanceResult.rows[0].current_month_records)
      },
      payslips: {
        total: parseInt(totalPayslipsResult.rows[0].total_payslips),
        current_month: parseInt(currentMonthPayslipsResult.rows[0].current_month_payslips)
      },
      users: {
        total: parseInt(totalUsersResult.rows[0].total_users)
      },
      githubIssues: {
        overview: {
          "this-week": {
            "new-issues": completedOrders,
            "closed-issues": Math.floor(completedOrders * 0.7),
            "fixed": Math.floor(completedOrders * 0.4),
            "wont-fix": Math.floor(completedOrders * 0.2),
            "re-opened": Math.floor(completedOrders * 0.1),
            "needs-triage": Math.floor(completedOrders * 0.05)
          },
          "last-week": {
            "new-issues": Math.floor(completedOrders * 0.9),
            "closed-issues": Math.floor(completedOrders * 0.6),
            "fixed": Math.floor(completedOrders * 0.35),
            "wont-fix": Math.floor(completedOrders * 0.15),
            "re-opened": Math.floor(completedOrders * 0.08),
            "needs-triage": Math.floor(completedOrders * 0.04)
          }
        },
        labels: labels.length > 0 ? labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        series: [
          {
            name: "Earnings",
            type: "line",
            data: earningsData.length > 0 ? earningsData : [3200, 4500, 3800, 5200, 4100, 3900, 4800]
          },
          {
            name: "Orders",
            type: "column",
            data: ordersData.length > 0 ? ordersData : [15, 22, 18, 28, 20, 19, 25]
          }
        ]
      },
      taskDistribution: taskDistribution
    }, 'Dashboard statistics retrieved successfully');

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    sendError(res, 'Failed to fetch dashboard statistics', 500, error);
  }
};

// GET /api/admin/dashboard/expiring-documents - Get expiring documents summary
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Get expiring driver documents
    const expiringDriverDocsResult = await query(
      `SELECT COUNT(*) as count,
              COUNT(CASE WHEN visa_expiry <= $1 AND visa_expiry >= CURRENT_DATE THEN 1 END) as expiring_visa,
              COUNT(CASE WHEN passport_expiry <= $1 AND passport_expiry >= CURRENT_DATE THEN 1 END) as expiring_passport,
              COUNT(CASE WHEN daman_expiry <= $1 AND daman_expiry >= CURRENT_DATE THEN 1 END) as expiring_daman,
              COUNT(CASE WHEN driving_licence_expiry <= $1 AND driving_licence_expiry >= CURRENT_DATE THEN 1 END) as expiring_licence,
              COUNT(CASE WHEN limo_permit_expiry <= $1 AND limo_permit_expiry >= CURRENT_DATE THEN 1 END) as expiring_permit
       FROM drivers`,
      [futureDateStr]
    );

    // Get expiring vehicle documents
    const expiringVehicleDocsResult = await query(
      `SELECT COUNT(*) as count,
              COUNT(CASE WHEN mulkiya_expiry <= $1 AND mulkiya_expiry >= CURRENT_DATE THEN 1 END) as expiring_mulkiya,
              COUNT(CASE WHEN vehicle_insurance_expiry <= $1 AND vehicle_insurance_expiry >= CURRENT_DATE THEN 1 END) as expiring_insurance
       FROM vehicles`,
      [futureDateStr]
    );

    sendSuccess(res, {
      days: parseInt(days),
      drivers: {
        expiring_visa: parseInt(expiringDriverDocsResult.rows[0].expiring_visa),
        expiring_passport: parseInt(expiringDriverDocsResult.rows[0].expiring_passport),
        expiring_daman: parseInt(expiringDriverDocsResult.rows[0].expiring_daman),
        expiring_licence: parseInt(expiringDriverDocsResult.rows[0].expiring_licence),
        expiring_permit: parseInt(expiringDriverDocsResult.rows[0].expiring_permit)
      },
      vehicles: {
        expiring_mulkiya: parseInt(expiringVehicleDocsResult.rows[0].expiring_mulkiya),
        expiring_insurance: parseInt(expiringVehicleDocsResult.rows[0].expiring_insurance)
      }
    }, `Documents expiring in next ${days} days`);

  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    sendError(res, 'Failed to fetch expiring documents', 500, error);
  }
};

module.exports = {
  getDriverStats,
  getVehicleStats,
  getAllStats,
  getExpiringDocuments
};
