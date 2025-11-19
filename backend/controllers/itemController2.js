const db = require('../db');

// === СОЗДАНИЕ ЭЛЕМЕНТА ===
const createItem = async (req, res) => {
    try {
        const { name, type, project_id, parent_id, content, access } = req.body;
        const ownerId = req.user.userId;

        // Валидация обязательных полей
        if (!name || !type || !project_id) {
            return res.status(400).json({
                message: 'Обязательные поля: name, type, project_id'
            });
        }

        // Проверка типа элемента
        const validTypes = ['folder', 'note', 'file'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: 'Тип элемента должен быть: folder, note или file'
            });
        }

        // Проверка существования проекта и прав доступа
        const [projects] = await db.query(
            'SELECT id FROM projects WHERE id = ? AND owner_id = ?',
            [project_id, ownerId]
        );
        if (projects.length === 0) {
            return res.status(404).json({ message: 'Проект не найден' });
        }

        // Если указан parent_id, проверяем что родитель существует
        if (parent_id) {
            const [parentItems] = await db.query(
                'SELECT id FROM items WHERE id = ? AND project_id = ?',
                [parent_id, project_id]
            );
            if (parentItems.length === 0) {
                return res.status(404).json({ message: 'Родительская папка не найдена' });
            }
        }

        // Создание элемента в базе
        const [result] = await db.query(
            `INSERT INTO items (name, type, project_id, parent_id, content, access, owner_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, type, project_id, parent_id || null, content || null, access || 'private', ownerId]
        );

        // Возвращаем созданный элемент
        const [newItem] = await db.query('SELECT * FROM items WHERE id = ?', [result.insertId]);

        res.status(201).json(newItem[0]);

    } catch (error) {
        console.error('Ошибка при создании элемента:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// === РЕДАКТИРОВАНИЕ ЭЛЕМЕНТА ===
const updateItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user.userId;
        const { name, content, access } = req.body;

        // Проверяем существование элемента и права доступа
        const [items] = await db.query(
            'SELECT * FROM items WHERE id = ? AND owner_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ message: 'Элемент не найден' });
        }

        const currentItem = items[0];

        // Обновляем только переданные поля
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (content !== undefined) {
            // Для заметок обновляем content, для файлов это может быть metadata
            updateFields.push('content = ?');
            updateValues.push(content);
        }

        if (access !== undefined) {
            updateFields.push('access = ?');
            updateValues.push(access);
        }

        // Добавляем updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        updateValues.push(itemId, userId);

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Нет данных для обновления' });
        }

        await db.query(
            `UPDATE items SET ${updateFields.join(', ')} WHERE id = ? AND owner_id = ?`,
            updateValues
        );

        // Возвращаем обновленный элемент
        const [updatedItems] = await db.query('SELECT * FROM items WHERE id = ?', [itemId]);

        res.status(200).json(updatedItems[0]);

    } catch (error) {
        console.error('Ошибка при обновлении элемента:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// === УДАЛЕНИЕ ЭЛЕМЕНТА ===
const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user.userId;

        // Проверяем существование элемента и права доступа
        const [items] = await db.query(
            'SELECT * FROM items WHERE id = ? AND owner_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ message: 'Элемент не найден' });
        }

        // TODO: Для папок нужно рекурсивно удалять все дочерние элементы
        // Пока просто удаляем элемент (будет работать для файлов и заметок)
        await db.query('DELETE FROM items WHERE id = ?', [itemId]);

        res.status(200).json({ message: 'Элемент успешно удален' });

    } catch (error) {
        console.error('Ошибка при удалении элемента:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// === ПОЛУЧЕНИЕ ДОЧЕРНИХ ЭЛЕМЕНТОВ (существующий) ===
const getItemChildren = async (req, res) => {
    try {
        const parentId = req.params.id;
        const userId = req.user.userId;

        // Проверяем права доступа к родительской папке
        const [parentItems] = await db.query(
            'SELECT * FROM items WHERE id = ? AND owner_id = ?',
            [parentId, userId]
        );

        if (parentItems.length === 0) {
            return res.status(404).json({ message: 'Папка не найдена или нет доступа' });
        }

        const [items] = await db.query(
            'SELECT * FROM items WHERE parent_id = ? ORDER BY type, name',
            [parentId]
        );

        res.status(200).json(items);

    } catch (error) {
        console.error('Ошибка при получении дочерних элементов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// === ПОЛУЧЕНИЕ ИНФОРМАЦИИ ОБ ЭЛЕМЕНТЕ ===
const getItem = async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user.userId;

        const [items] = await db.query(
            'SELECT * FROM items WHERE id = ? AND owner_id = ?',
            [itemId, userId]
        );

        if (items.length === 0) {
            return res.status(404).json({ message: 'Элемент не найден' });
        }

        res.status(200).json(items[0]);

    } catch (error) {
        console.error('Ошибка при получении элемента:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

module.exports = {
    createItem,
    updateItem,
    deleteItem,
    getItemChildren,
    getItem
};