const db = require('../db');

// --- Создание нового проекта ---
const createProject = async (req, res) => {
    try {
        // 1. Получаем данные для проекта из тела запроса
        const { name, description, access } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Название проекта не может быть пустым.' });
        }

        // 2. Получаем ID владельца из токена, который был расшифрован middleware `protect`
        const ownerId = req.user.userId;

        // 3. Вставляем новый проект в базу данных
        const [result] = await db.query(
            'INSERT INTO projects (name, description, access, owner_id) VALUES (?, ?, ?, ?)',
            [name, description || null, access || 'private', ownerId]
        );

        // 4. Отправляем успешный ответ с данными нового проекта
        res.status(201).json({
            id: result.insertId,
            name,
            description,
            access,
            owner_id: ownerId
        });
    } catch (error) {
        console.error('Ошибка при создании проекта:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// --- Получение списка проектов пользователя ---
const getProjects = async (req, res) => {
    try {
        // 1. ID пользователя мы также берем из middleware
        const ownerId = req.user.userId;

        // 2. Выбираем все проекты, где текущий пользователь является владельцем
        // (Позже мы добавим сюда проекты, которые с ним "расшарены")
        const [projects] = await db.query('SELECT * FROM projects WHERE owner_id = ?', [ownerId]);

        // 3. Отправляем список проектов
        res.status(200).json(projects);
    } catch (error) {
        console.error('Ошибка при получении проектов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// --- Получение проекта по ID ---
const getProjectById = async (req, res) => {
    try {
        const userId = req.user.userId;
        const projectId = req.params.id;

        // 1. Получаем сам проект и проверяем, что он существует и пользователь имеет к нему доступ
        const [projects] = await db.query('SELECT * FROM projects WHERE id = ? AND owner_id = ?', [projectId, userId]);

        if (projects.length === 0) {
            return res.status(404).json({ message: 'Проект не найден или у вас нет к нему доступа.' });
        }
        const project = projects[0];

        // 2. Получаем все элементы (файлы, папки, заметки), которые лежат в корне этого проекта
        const [items] = await db.query('SELECT * FROM items WHERE project_id = ? AND parent_id IS NULL', [projectId]);

        // 3. Отправляем все данные одним объектом
        res.status(200).json({ project, items });

    } catch (error) {
        console.error(`Ошибка при получении проекта ${req.params.id}:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// --- РЕДАКТИРОВАНИЕ ПРОЕКТА ---
const updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.userId;
        const { name, description, access } = req.body;

        // 1. Проверяем существование проекта и права владельца
        const [projects] = await db.query(
            'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({ message: 'Проект не найден или у вас нет прав для редактирования.' });
        }

        // 2. Валидация входных данных
        if (name !== undefined && !name.trim()) {
            return res.status(400).json({ message: 'Название проекта не может быть пустым.' });
        }

        // 3. Подготавливаем поля для обновления
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name.trim());
        }

        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description.trim() || null);
        }

        if (access !== undefined) {
            updateFields.push('access = ?');
            updateValues.push(access);
        }

        // Добавляем updated_at
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // 4. Выполняем обновление
        updateValues.push(projectId, userId);

        await db.query(
            `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ? AND owner_id = ?`,
            updateValues
        );

        // 5. Возвращаем обновленный проект
        const [updatedProjects] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);

        res.status(200).json({
            message: 'Проект успешно обновлен',
            project: updatedProjects[0]
        });

    } catch (error) {
        console.error(`Ошибка при обновлении проекта ${req.params.id}:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

// --- УДАЛЕНИЕ ПРОЕКТА ---
const deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const userId = req.user.userId;

        // 1. Проверяем существование проекта и права владельца
        const [projects] = await db.query(
            'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({ message: 'Проект не найден или у вас нет прав для удаления.' });
        }

        // 2. Выполняем удаление проекта
        // Благодаря ON DELETE CASCADE в базе данных, все связанные items
        // и записи в project_collaborators удалятся автоматически
        await db.query('DELETE FROM projects WHERE id = ?', [projectId]);

        // 3. Отправляем подтверждение удаления
        res.status(200).json({
            message: 'Проект и все связанные данные успешно удалены'
        });

    } catch (error) {
        console.error(`Ошибка при удалении проекта ${req.params.id}:`, error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject
};