const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                message: 'Токен доступа не предоставлен.' 
            });
        }

        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded; // Добавляем данные пользователя в запрос
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                message: 'Неверный токен.' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                message: 'Токен истек.' 
            });
        }
        
        console.error('Ошибка аутентификации:', error);
        res.status(500).json({ 
            message: 'Ошибка аутентификации.' 
        });
    }
};

module.exports = { authenticateToken };