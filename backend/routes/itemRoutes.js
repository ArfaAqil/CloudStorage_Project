// routes/itemRoutes.js
const express = require('express');
const router = express.Router();
const { getItemChildren } = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Защищаем все маршруты

// GET /api/items/123/children
router.get('/:id/children', getItemChildren);

module.exports = router;