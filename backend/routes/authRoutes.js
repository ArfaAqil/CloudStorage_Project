const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
// Импортируем наш контроллер
const authController = require('../controllers/authController');

// Когда придет POST-запрос на /register, вызвать функцию registerUser
router.post('/register', authController.registerUser);
// НОВЫЙ МАРШРУТ: POST /api/login
router.post('/login', authController.loginUser);
router.get('/profile', protect, authController.getUserProfile);
module.exports = router;