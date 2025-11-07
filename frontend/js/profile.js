// profile.js
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(); // Redirect if not logged in

    const currentUser = Storage.getCurrentUser();
    if (currentUser) {
        document.getElementById('profile-name').textContent = currentUser.name;
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-role').textContent = currentUser.role === 'admin' ? 'Администратор' : 'Пользователь';
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        // Pre-fill form with current user data
        document.getElementById('profile-name-input').value = currentUser.name;

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('profile-name-input').value;
            const newPassword = document.getElementById('profile-password').value;

            const users = Storage.getUsers();
            const userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex !== -1) {
                users[userIndex].name = newName;
                if (newPassword) {
                    users[userIndex].password = hashPassword(newPassword);
                }
                Storage.saveUsers(users);
                document.getElementById('profile-name').textContent = newName;
                Storage.addLog('edit_profile', `User ${currentUser.email} updated profile`);
                alert('Профиль обновлен');
                closeModal('profile-modal');
            }
        });
    }
});

// Open profile modal
function openProfileModal() {
    openModal('profile-modal');
}