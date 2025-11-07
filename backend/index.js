const express = require('express');
const cors = require('cors'); // <-- 1. ИМПОРТ
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const itemRoutes = require('./routes/itemRoutes');
const app = express();

const PORT = 3000;


app.use(cors());
// MIDDLEWARE
app.use(express.json()); // Для парсинга JSON-тел


app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/items', itemRoutes);
// ЗАПУСК СЕРВЕРА
app.listen(PORT, () => {
    console.log(`Сервер запущен и слушает порт ${PORT}`);
});