const jwt = require('jsonwebtoken');
require('dotenv').config();
const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Извлекаем сам токен, отбрасывая слово "Bearer"
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.SECRET_KEY);

            req.user = decoded;

            // 5. Передаем управление следующему middleware или основному обработчику
            next();
        } catch (error) {
            console.error('Ошибка верификации токена:', error);
            res.status(401).json({ message: 'Нет авторизации, токен недействителен' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Нет авторизации, токен не найден' });
    }
};

module.exports = { protect };