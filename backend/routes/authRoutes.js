const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - регистрация
router.post('/register', authController.registerUser);

// POST /api/auth/login - вход
router.post('/login', authController.loginUser);

// GET /api/auth/profile - получение профиля (требует аутентификации)
router.get('/profile', authenticateToken, authController.getUserProfile);

// PUT /api/auth/profile - обновление профиля (требует аутентификации)
router.put('/profile', authenticateToken, authController.updateUserProfile);

// DELETE /api/auth/profile - удаление профиля (требует аутентификации)
router.delete('/profile', authenticateToken, authController.deleteUserProfile);

module.exports = router;