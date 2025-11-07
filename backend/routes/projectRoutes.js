const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById } = require('../controllers/projectControllers');
const { protect } = require('../middleware/authMiddleware'); // Используем абсолютный путь!


router.use(protect);

// Маршруты
router.route('/')
    .post(createProject) // POST /api/projects -> создать проект
    .get(getProjects);   // GET  /api/projects -> получить список проектов
router.route('/:id')
    .get(getProjectById); // GET /api/projects/:id -> получить проект по ID
module.exports = router;