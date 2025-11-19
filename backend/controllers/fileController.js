const path = require('path');
const fs = require('fs');
const db = require('../db'); // ваш db.js

class FileController {
    
    // Загрузка файла
    async uploadFile(req, res) {
        let connection;
        try {
            // Получаем данные из тела запроса
            const { project_id, parent_id = null, name, access = 'private' } = req.body;
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Файл не был загружен'
                });
            }

            if (!project_id) {
                // Удаляем файл если нет project_id
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({
                    success: false,
                    message: 'project_id обязателен'
                });
            }

            // Получаем user_id из auth middleware (предполагается, что он добавлен)
            const user_id = req.user?.id || 1; // временно - замените на реальный user_id из аутентификации

            // Информация о загруженном файле
            const fileInfo = {
                original_name: req.file.originalname,
                file_name: req.file.filename,
                file_path: req.file.path,
                size: req.file.size,
                mimetype: req.file.mimetype
            };

            console.log('Загружен файл:', fileInfo);

            // Получаем соединение из пула
            connection = await db.getConnection();

            // Проверяем существование проекта и права доступа
            const [projects] = await connection.execute(
                'SELECT * FROM projects WHERE id = ? AND (owner_id = ? OR access = "public" OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = ?))',
                [project_id, user_id, user_id]
            );

            if (projects.length === 0) {
                throw new Error('Проект не найден или нет доступа');
            }

            // Если указан parent_id, проверяем его существование
            if (parent_id) {
                const [parents] = await connection.execute(
                    'SELECT * FROM items WHERE id = ? AND project_id = ?',
                    [parent_id, project_id]
                );
                if (parents.length === 0) {
                    throw new Error('Родительская папка не найдена');
                }
            }

            // Используем оригинальное имя если name не указан
            const itemName = name || path.basename(fileInfo.original_name, path.extname(fileInfo.originalname));

            // Сохраняем информацию в таблицу items
            const [result] = await connection.execute(
                `INSERT INTO items 
                 (project_id, parent_id, owner_id, type, name, access, file_path, size, content) 
                 VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?)`,
                [
                    project_id,
                    parent_id,
                    user_id,
                    itemName,
                    access,
                    fileInfo.file_path,
                    fileInfo.size,
                    JSON.stringify({
                        original_name: fileInfo.original_name,
                        mimetype: fileInfo.mimetype,
                        file_name: fileInfo.file_name
                    })
                ]
            );

            // Получаем созданную запись
            const [items] = await connection.execute(
                'SELECT * FROM items WHERE id = ?',
                [result.insertId]
            );

            const savedItem = items[0];

            res.status(201).json({
                success: true,
                message: 'Файл успешно загружен',
                data: {
                    id: savedItem.id,
                    project_id: savedItem.project_id,
                    parent_id: savedItem.parent_id,
                    name: savedItem.name,
                    type: savedItem.type,
                    access: savedItem.access,
                    file_path: savedItem.file_path,
                    size: savedItem.size,
                    content: JSON.parse(savedItem.content),
                    created_at: savedItem.created_at,
                    download_url: `/api/files/download/${savedItem.id}`
                }
            });

        } catch (error) {
            console.error('Ошибка при загрузке файла:', error);
            
            // Удаляем файл если ошибка
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.status(500).json({
                success: false,
                message: 'Ошибка при загрузке файла',
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Скачивание файла
    async downloadFile(req, res) {
        try {
            const { id } = req.params;
            
            // Получаем информацию о файле из БД
            const [files] = await db.execute(
                `SELECT i.*, p.owner_id as project_owner 
                 FROM items i 
                 LEFT JOIN projects p ON i.project_id = p.id 
                 WHERE i.id = ? AND i.type = 'file'`,
                [id]
            );

            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден'
                });
            }

            const fileRecord = files[0];
            const filePath = fileRecord.file_path;

            // Проверяем существует ли файл физически
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден на сервере'
                });
            }

            const content = JSON.parse(fileRecord.content || '{}');

            // Устанавливаем заголовки для скачивания
            res.setHeader('Content-Type', content.mimetype || 'application/octet-stream');
            res.setHeader('Content-Disposition', 
                `attachment; filename="${content.original_name || fileRecord.name}"`);
            res.setHeader('Content-Length', fileRecord.size);

            // Отправляем файл
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

        } catch (error) {
            console.error('Ошибка при скачивании файла:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при скачивании файла',
                error: error.message
            });
        }
    }

    // Получение информации о файле
    async getFileInfo(req, res) {
        try {
            const { id } = req.params;
            
            const [files] = await db.execute(
                `SELECT i.*, u.name as owner_name, p.name as project_name 
                 FROM items i 
                 LEFT JOIN users u ON i.owner_id = u.id 
                 LEFT JOIN projects p ON i.project_id = p.id 
                 WHERE i.id = ? AND i.type = 'file'`,
                [id]
            );
            
            if (files.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден'
                });
            }

            const fileRecord = files[0];
            const content = JSON.parse(fileRecord.content || '{}');

            res.json({
                success: true,
                data: {
                    id: fileRecord.id,
                    project_id: fileRecord.project_id,
                    project_name: fileRecord.project_name,
                    parent_id: fileRecord.parent_id,
                    owner_id: fileRecord.owner_id,
                    owner_name: fileRecord.owner_name,
                    name: fileRecord.name,
                    type: fileRecord.type,
                    access: fileRecord.access,
                    size: fileRecord.size,
                    content: content,
                    created_at: fileRecord.created_at,
                    download_url: `/api/files/download/${fileRecord.id}`
                }
            });

        } catch (error) {
            console.error('Ошибка при получении информации о файле:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении информации о файле',
                error: error.message
            });
        }
    }

    // Удаление файла
    async deleteFile(req, res) {
        let connection;
        try {
            const { id } = req.params;
            const user_id = req.user?.id || 1; // временно
            
            connection = await db.getConnection();

            // Начинаем транзакцию
            await connection.beginTransaction();

            // Получаем информацию о файле с проверкой прав
            const [files] = await connection.execute(
                `SELECT i.* FROM items i 
                 LEFT JOIN projects p ON i.project_id = p.id 
                 WHERE i.id = ? AND i.type = 'file' 
                 AND (i.owner_id = ? OR p.owner_id = ?)`,
                [id, user_id, user_id]
            );
            
            if (files.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Файл не найден или нет прав для удаления'
                });
            }

            const fileRecord = files[0];
            const filePath = fileRecord.file_path;

            // Удаляем файл с диска
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Удаляем запись из БД
            await connection.execute('DELETE FROM items WHERE id = ?', [id]);

            // Подтверждаем транзакцию
            await connection.commit();

            res.json({
                success: true,
                message: 'Файл успешно удален'
            });

        } catch (error) {
            // Откатываем транзакцию при ошибке
            if (connection) {
                await connection.rollback();
            }
            console.error('Ошибка при удалении файла:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при удалении файла',
                error: error.message
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    // Получение списка файлов проекта
    async getProjectFiles(req, res) {
        try {
            const { project_id } = req.params;
            const { parent_id = null } = req.query;
            
            const [files] = await db.execute(
                `SELECT i.*, u.name as owner_name 
                 FROM items i 
                 LEFT JOIN users u ON i.owner_id = u.id 
                 WHERE i.project_id = ? AND i.type = 'file' 
                 AND i.parent_id = ? 
                 ORDER BY i.created_at DESC`,
                [project_id, parent_id]
            );

            const filesWithInfo = files.map(file => ({
                ...file,
                content: JSON.parse(file.content || '{}'),
                download_url: `/api/files/download/${file.id}`
            }));

            res.json({
                success: true,
                data: filesWithInfo
            });

        } catch (error) {
            console.error('Ошибка при получении списка файлов:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении списка файлов',
                error: error.message
            });
        }
    }
}

module.exports = new FileController();