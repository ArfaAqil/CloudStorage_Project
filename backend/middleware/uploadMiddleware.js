const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем папку uploads если нет
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация хранилища
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Уникальное имя + оригинальное расширение
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, fileExtension)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50);
        
        cb(null, baseName + '-' + uniqueSuffix + fileExtension);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB лимит
        files: 1
    }
});

// Middleware для обработки ошибок multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Файл слишком большой. Максимальный размер: 50MB'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Слишком много файлов. Максимум 1 файл за раз'
            });
        }
    }
    next(error);
};

module.exports = { upload, handleUploadError };