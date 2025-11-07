const db = require('./db');

// SQL-запросы для создания ВСЕХ таблиц
const createTablesQueries = `
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        access ENUM('public', 'private') DEFAULT 'private',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_collaborators (
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (project_id, user_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        parent_id INT,
        owner_id INT NOT NULL,
        type ENUM('folder', 'file', 'note') NOT NULL,
        name VARCHAR(255) NOT NULL,
        access ENUM('public', 'private') DEFAULT 'private',
        content JSON,
        file_path VARCHAR(1024),
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE CASCADE
    );
`;

async function initializeDatabase() {
    try {
        console.log('Запуск инициализации базы данных...');
        await db.query(createTablesQueries);
        console.log('Все таблицы успешно созданы или уже существуют.');
    } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
    } finally {
        await db.end();
    }
}

initializeDatabase();