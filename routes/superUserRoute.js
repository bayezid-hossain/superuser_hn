const express = require('express');
const {
  approveBusOwner,
  approveDriver,
  getUserDetails,
  registerSuperUser,
  loginSuperUser,
  verifyOtp,
  getAllBusOwners,
  getAllDrivers,
  getOwner,
  getDriver,
  deleteOwner,
  deleteDriver,
  approveRoute,
  getRoute,
  deleteRoute,
  getAllRoutes,
  logout,
} = require('../controllers/superUserController');
const {
  authorizeRoles,
  approvalStatus,
  isLoggedInUser,
  isAuthenticatedUser,
} = require('../middleware/auth');
const router = express.Router();

//add another super user
router
  .route('/api/v1/admin/add')
  .post(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    registerSuperUser
  );

//get admin details
router.route('/api/v1/admin/me').get(isLoggedInUser, getUserDetails);

//approve bus owner
router
  .route('/api/v1/admin/approvebusowner/:id')
  .post(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    approveBusOwner
  );

//approve driver
router
  .route('/api/v1/admin/approvedriver/:id')
  .post(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    approveDriver
  );

//approve route
router
  .route('/api/v1/admin/approveroute/:id')
  .post(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    approveRoute
  );

//get all bus owners
router
  .route('/api/v1/admin/busowners')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getAllBusOwners
  );

//get all drivers
router
  .route('/api/v1/admin/drivers')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getAllDrivers
  );
//get all routes
router
  .route('/api/v1/admin/routes')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getAllRoutes
  );

//get single bus owner details
router
  .route('/api/v1/admin/owner/:id')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getOwner
  );

//get single driver informations
router
  .route('/api/v1/admin/driver/:id')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getDriver
  );

//get single route details
router
  .route('/api/v1/admin/routes/:id')
  .get(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    getRoute
  );

//delete bus owner
router
  .route('/api/v1/admin/owner/remove/:id')
  .delete(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    deleteOwner
  );

//delete driver
router
  .route('/api/v1/admin/driver/remove/:id')
  .delete(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    deleteDriver
  );

//delete route
router
  .route('/api/v1/admin/routes/remove/:id')
  .delete(
    isLoggedInUser,
    [approvalStatus('approved'), authorizeRoles('[admin]')],
    deleteRoute
  );

router.route('/api/v1/admin/logout').get(isLoggedInUser, logout);
module.exports = router;
