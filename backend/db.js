const mysql = require('mysql2');

// Создаем "пул соединений"
// Это более эффективно, чем создавать новое соединение для каждого запроса
const pool = mysql.createPool({
    host: '127.0.0.1', // Адрес нашего Docker-контейнера
    user: 'admin', // Имя пользователя из docker-compose.yml
    password: 'admin', // Пароль из docker-compose.yml
    database: 'cloud_db', // Название БД из docker-compose.yml
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

// Оборачиваем пул в "промисы", чтобы использовать современный синтаксис async/await
module.exports = pool.promise();