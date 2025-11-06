// auth.js
document.addEventListener('DOMContentLoaded', () => {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const hashedPassword = hashPassword(password);

            const users = Storage.getUsers();
            const user = users.find(u => u.email === email && u.password === hashedPassword);

            if (user) {
                Storage.setSession({ email: user.email, role: user.role });
                Storage.addLog('login', `User ${email} logged in`);
                window.location.href = 'dashboard.html';
            } else {
                alert('Неверный email или пароль');
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }

            const users = Storage.getUsers();
            if (users.some(u => u.email === email)) {
                alert('Этот email уже зарегистрирован');
                return;
            }

            const newUser = {
                name,
                email,
                password: hashPassword(password),
                role: 'user' // Default role
            };
            users.push(newUser);
            Storage.saveUsers(users);
            Storage.setSession({ email: newUser.email, role: newUser.role });
            Storage.addLog('register', `User ${email} registered`);
            alert('Регистрация успешна! Вы вошли в систему.');
            window.location.href = 'dashboard.html';
        });
    }
});