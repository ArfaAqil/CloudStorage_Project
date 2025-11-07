const db = require('../db');

const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1. Получаем все проекты пользователя (и те, что расшарены для него)
        // ЗАМЕТКА: Пока мы получаем только те проекты, где он владелец.
        // Логику расшаривания добавим позже.
        const [projects] = await db.query('SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC', [userId]);

        // 2. Получаем все элементы (файлы, заметки), принадлежащие этому пользователю
        const [items] = await db.query('SELECT * FROM items WHERE owner_id = ? ORDER BY created_at DESC', [userId]);

        // 3. Считаем статистику
        const projectCount = projects.length;
        const fileCount = items.filter(i => i.type === 'file').length;
        const noteCount = items.filter(i => i.type === 'note').length;

        // 4. Формируем и отправляем единый объект с данными
        res.status(200).json({
            stats: {
                projectCount,
                fileCount,
                noteCount
            },
            recentProjects: projects.slice(0, 3), // Отправляем 3 самых свежих проекта
            recentFiles: items.filter(i => i.type === 'file').slice(0, 3),
            recentNotes: items.filter(i => i.type === 'note').slice(0, 3)
        });

    } catch (error) {
        console.error('Ошибка при получении данных для Dashboard:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

module.exports = { getDashboardData };