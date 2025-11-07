const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// Контроллер для регистрации пользователя
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Пожалуйста, заполните все поля.' });
        }

        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким email уже существует.' });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован!',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};
const loginUser = async (req, res) => {
    try {
        // 1. Получаем email и пароль из запроса
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Пожалуйста, введите email и пароль.' });
        }

        // 2. Ищем пользователя в базе по email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Важно: отправляем общий ответ, чтобы злоумышленник не мог угадать, существует ли email
            return res.status(401).json({ message: 'Неверный email или пароль.' }); // 401 Unauthorized
        }
        const user = users[0];

        // 3. Сравниваем предоставленный пароль с хешем в базе
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Неверный email или пароль.' });
        }

        // 4. Пароль верный! Создаем JWT токен
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        // 'YOUR_SECRET_KEY' - это секретный ключ. В реальном приложении его нужно хранить в переменных окружения!
        const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '1h' }); // Токен будет действовать 1 час

        // 5. Отправляем токен клиенту
        res.status(200).json({
            message: 'Вход выполнен успешно!',
            token: token
        });

    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};
const getUserProfile = async (req, res) => {

    try {
        const [users] = await db.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.userId]);

        if (users.length > 0) {
            res.status(200).json(users[0]);
        } else {
            res.status(404).json({ message: 'Пользователь не найден.' });
        }
    } catch (error) {
        console.error('Ошибка при получении профиля:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
};
// Экспортируем функцию, чтобы ее можно было использовать в других файлах
module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};