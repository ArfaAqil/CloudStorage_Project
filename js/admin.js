// js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = Storage.getCurrentUser();
    // СТРОГАЯ ПРОВЕРКА: если пользователь не админ, перенаправляем его
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Доступ запрещен');
        window.location.href = 'dashboard.html';
        return;
    }

    const usersTableBody = document.querySelector('#users-table tbody');
    const auditLogContainer = document.getElementById('audit-log');

    function loadUsers() {
        usersTableBody.innerHTML = '';
        const users = Storage.getUsers();
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <select class="role-select" data-email="${user.email}" ${user.email === currentUser.email ? 'disabled' : ''}>
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>
                <td>
                    ${user.email !== currentUser.email ? `<button class="btn-delete" data-email="${user.email}">Удалить</button>` : 'Текущий пользователь'}
                </td>
            `;
            usersTableBody.appendChild(tr);
        });
    }

    function loadLogs() {
        auditLogContainer.innerHTML = '';
        const logs = Storage.getLogs().reverse(); // Показываем свежие логи сверху
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.textContent = `[${new Date(log.timestamp).toLocaleString()}] - ${log.user} - ${log.action}: ${log.details}`;
            auditLogContainer.appendChild(logEntry);
        });
    }

    // Обработчики событий
    usersTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('role-select')) {
            const email = e.target.dataset.email;
            const newRole = e.target.value;
            if (confirm(`Вы уверены, что хотите изменить роль для ${email} на ${newRole}?`)) {
                let users = Storage.getUsers();
                const user = users.find(u => u.email === email);
                if (user) {
                    user.role = newRole;
                    Storage.saveUsers(users);
                    Storage.addLog('change_role', `Admin ${currentUser.email} changed role of ${email} to ${newRole}`);
                    loadUsers();
                    loadLogs(); // Обновляем логи, чтобы видеть запись
                }
            } else {
                e.target.value = e.target.querySelector('option[selected]').value; // Возвращаем как было
            }
        }
    });

    usersTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const email = e.target.dataset.email;
            if (confirm(`Вы уверены, что хотите удалить пользователя ${email}? Это действие необратимо.`)) {
                let users = Storage.getUsers();
                users = users.filter(u => u.email !== email);
                Storage.saveUsers(users);
                Storage.addLog('delete_user', `Admin ${currentUser.email} deleted user ${email}`);
                loadUsers();
                loadLogs();
            }
        }
    });

    loadUsers();
    loadLogs();
});