const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middlewares/adminAuth');

// Public routes
router.post('/register', adminController.register);
router.post('/login', adminController.login);

// Protected routes
router.get('/dashboard', adminAuth, adminController.getDashboardStats);
router.get('/users', adminAuth, adminController.getUsers);
router.get('/creations', adminAuth, adminController.getCreations);

module.exports = router; 