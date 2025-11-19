const express = require('express');
const router = express.Router();
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');
const fileController = require('../controllers/fileController');

// POST /api/files/upload - загрузка файла
router.post('/upload', upload.single('file'), handleUploadError, fileController.uploadFile);

// GET /api/files/download/:id - скачивание файла по ID
router.get('/download/:id', fileController.downloadFile);

// GET /api/files/info/:id - информация о файле
router.get('/info/:id', fileController.getFileInfo);

// DELETE /api/files/:id - удаление файла
router.delete('/:id', fileController.deleteFile);

// GET /api/files/project/:project_id - файлы проекта
router.get('/project/:project_id', fileController.getProjectFiles);

module.exports = router;