const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// Защищаем маршрут. Только авторизованные пользователи смогут получить эти данные.
router.get('/', protect, getDashboardData);

module.exports = router;