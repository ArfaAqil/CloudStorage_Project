// main.js
// Simulated bcrypt-like hashing for localStorage (need to change for real bycript later)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }
    return hash.toString();
}

// Generate random 8-character access code
function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Storage utilities
const Storage = {
    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    },
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },
    getSession() {
        return JSON.parse(localStorage.getItem('session')) || null;
    },
    setSession(user) {
        localStorage.setItem('session', JSON.stringify(user));
    },
    clearSession() {
        localStorage.removeItem('session');
        console.log('Session cleared at ' + new Date().toLocaleString());
    },
    isLoggedIn() {
        return !!this.getSession();
    },
    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        const users = this.getUsers();
        return users.find(user => user.email === session.email) || null;
    },
    getProjects() {
        return JSON.parse(localStorage.getItem('projects')) || [];
    },
    saveProjects(projects) {
        localStorage.setItem('projects', JSON.stringify(projects));
    },
    getItems() {
        return JSON.parse(localStorage.getItem('items')) || [];
    },
    saveItems(items) {
        localStorage.setItem('items', JSON.stringify(items));
    },
    getAccessCodes() {
        return JSON.parse(localStorage.getItem('accessCodes')) || {};
    },
    saveAccessCode(itemId, code) {
        const codes = this.getAccessCodes();
        codes[itemId] = code;
        localStorage.setItem('accessCodes', JSON.stringify(codes));
    },
    hasAccess(itemId) {
        const session = this.getSession();
        if (!session) return false;
        const codesEntered = JSON.parse(localStorage.getItem('codesEntered')) || {};
        return codesEntered[itemId] || false;
    },
    grantAccess(itemId, code) {
        const codes = this.getAccessCodes();
        if (codes[itemId] === code) {
            const codesEntered = JSON.parse(localStorage.getItem('codesEntered')) || {};
            codesEntered[itemId] = true;
            localStorage.setItem('codesEntered', JSON.stringify(codesEntered));
            return true;
        }
        return false;
    },
    getLogs() {
        return JSON.parse(localStorage.getItem('logs')) || [];
    },
    addLog(action, details) {
        const logs = this.getLogs();
        const currentUser = this.getCurrentUser();
        logs.push({
            id: Date.now(),
            user: currentUser ? currentUser.email : 'unknown',
            action,
            details,
            timestamp: new Date().toISOString(),
        });
        localStorage.setItem('logs', JSON.stringify(logs));
    },
    exportProjectToZip(projectId) {
        const project = this.getProjects().find(p => p.id === Number(projectId));
        if (!project) return null;

        const items = this.getItems().filter(i => i.parentId === String(projectId));
        const zip = new JSZip();
        
        zip.file('project.json', JSON.stringify({
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
        }, null, 2));

        items.forEach(item => {
            if (item.type === 'file') {
                zip.file(item.name, item.file);
            } else if (item.type === 'note') {
                const content = item.isChecklist
                    ? item.content.map(c => `${c.checked ? '[x]' : '[ ]'} ${c.text}`).join('\n')
                    : item.content;
                zip.file(`${item.name}.txt`, content);
            }
        });

        return zip;
    },
    migrateProjects() {
        let projects = this.getProjects();
        let updated = false;
        projects.forEach(project => {
            if (!project.sharedWith) {
                project.sharedWith = [];
                updated = true;
            }
        });
        if (updated) {
            this.saveProjects(projects);
            console.log('Projects migrated: added sharedWith arrays at ' + new Date().toLocaleString());
        }
    }
};

// Redirect to login if not authenticated
function requireAuth() {
    // Проверяем наличие нашего токена в localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
        // Если токена нет, отправляем на страницу входа
        window.location.href = 'index.html';
    }
}


// Modal utility functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Logout function
function logout() {
    // Просто удаляем токен из хранилища
    localStorage.removeItem('authToken');
    // И отправляем на страницу входа
    window.location.href = 'index.html';
    // Логирование на бэкенд мы добавим позже отдельным запросом
}

// Initial migration
Storage.migrateProjects();

// Expose logout to global scope
window.logout = logout;