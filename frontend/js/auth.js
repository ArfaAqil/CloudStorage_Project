// auth.js
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
         loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

        try {
            // 1. Отправляем email и пароль на наш API для проверки
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            // 2. Проверяем, был ли вход успешным
            if (response.ok) {
                // 3. Сохраняем токен в localStorage. Это наш "пропуск".
                localStorage.setItem('authToken', data.token);

                // 4. Перенаправляем пользователя в личный кабинет
                window.location.href = 'dashboard.html';
            } else {
                // Если сервер вернул ошибку (неверный пароль, пользователя не существует)
                alert(`Ошибка входа: ${data.message}`);
            }

        } catch (error) {
            // Если произошла сетевая ошибка
            console.error('Ошибка при отправке запроса:', error);
            alert('Не удалось связаться с сервером. Попробуйте позже.');
        }
    });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
         registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }
        try {
            // 1. Отправляем запрос на наш бэкенд API
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            // 2. Получаем ответ от сервера в формате JSON
            const data = await response.json();

            // 3. Проверяем, был ли запрос успешным
            if (response.ok) {
                // Успех!
                alert(data.message); // Показываем сообщение от сервера, например, "Пользователь успешно зарегистрирован!"
                // Сразу перенаправляем на страницу входа, чтобы пользователь мог залогиниться
                window.location.href = 'index.html'; 
            } else {
                // Если сервер вернул ошибку (например, "email уже занят")
                alert(`Ошибка: ${data.message}`);
            }

        } catch (error) {
            // Если произошла сетевая ошибка (например, бэкенд выключен)
            console.error('Ошибка при отправке запроса:', error);
            alert('Не удалось связаться с сервером. Попробуйте позже.');
        }

    });
    }
});