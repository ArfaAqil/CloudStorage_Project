// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Наш новый "охранник" из main.js уже отработал и убедился, что токен есть.
    // Теперь мы должны загрузить данные с сервера.

    const projectCount = document.getElementById('project-count');
    const fileCount = document.getElementById('file-count');
    const noteCount = document.getElementById('note-count');
    const recentProjects = document.getElementById('recent-projects');
    const recentNotes = document.getElementById('recent-notes');
    const recentFiles = document.getElementById('recent-files');
    // const searchBar = document.querySelector('.search-bar'); // Поиск пока отключим

    async function loadDashboard() {
        // 1. Получаем токен из localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
            // На всякий случай, если requireAuth пропустит
            window.location.href = 'index.html';
            return;
        }

        try {
            // 2. Делаем запрос к нашему новому эндпоинту
            const response = await fetch('http://localhost:3000/api/dashboard', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 3. Прикрепляем токен для авторизации
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // Если токен невалидный или истек, сервер вернет 401
                if (response.status === 401) {
                    alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
                    logout(); // Функция logout() из main.js
                }
                throw new Error('Не удалось загрузить данные.');
            }

            const data = await response.json();
            renderDashboard(data); // Вызываем функцию для отрисовки

        } catch (error) {
            console.error(error);
            // Можно показать сообщение об ошибке на странице
        }
    }

    function renderDashboard(data) {
        // Обновляем статистику
        projectCount.textContent = data.stats.projectCount;
        fileCount.textContent = data.stats.fileCount;
        noteCount.textContent = data.stats.noteCount;

        // Очищаем старые списки
        recentProjects.innerHTML = '';
        recentNotes.innerHTML = '';
        recentFiles.innerHTML = '';

        // Отображаем недавние проекты
        data.recentProjects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'card';
            projectCard.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.description || 'Без описания'}</p>
                <p>Доступ: ${project.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                <button onclick="openProject(${project.id})">Открыть</button>
            `;
            recentProjects.appendChild(projectCard);
        });

        // Отображаем недавние заметки (логика отрисовки взята из вашего старого файла)
        data.recentNotes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'card';
            // ВАЖНО: структура content может отличаться, адаптируйте при необходимости
            const preview = note.content ? (note.content.toString().length > 100 ? note.content.toString().slice(0, 100) + '...' : note.content) : 'Нет содержимого';
            noteCard.innerHTML = `
                <h3>📝 ${note.name}</h3>
                <p>${preview}</p>
                <p>Доступ: ${note.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                <button onclick="alert('Просмотр заметки пока не работает')">Просмотреть</button>
            `;
            recentNotes.appendChild(noteCard);
        });
        
        // Отображаем недавние файлы
        data.recentFiles.forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'card';
            fileCard.innerHTML = `
                <h3>📄 ${file.name}</h3>
                <p>Размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                <p>Доступ: ${file.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                <button onclick="alert('Открытие файла пока не работает')">Открыть</button>
            `;
            recentFiles.appendChild(fileCard);
        });
        window.openProject = function(projectId) {
        // Все, что нам нужно сделать - это перейти на страницу деталей проекта,
        // передав его ID в качестве параметра URL.
        window.location.href = `project-detail.html?id=${projectId}`;
    }
}

    loadDashboard();
});