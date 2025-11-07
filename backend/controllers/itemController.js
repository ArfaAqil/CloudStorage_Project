const db = require('../db');

// Получение дочерних элементов (содержимого папки)
const getItemChildren = async (req, res) => {
    try {
        const parentId = req.params.id; // ID папки, чье содержимое мы хотим получить
        const userId = req.user.userId;

        // TODO: В будущем здесь нужна проверка, имеет ли пользователь доступ к этой папке.
        // Пока для простоты мы доверяем фронтенду.

        const [items] = await db.query('SELECT * FROM items WHERE parent_id = ?', [parentId]);
        res.status(200).json(items);

    } catch (error) {
        console.error('Ошибка при получении дочерних элементов:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};

module.exports = { getItemChildren };