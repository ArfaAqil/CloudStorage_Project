// projects.js
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(); // Redirect if not logged in

    const projectList = document.getElementById('project-list');
    const projectForm = document.getElementById('project-form');
    const accessSelect = document.getElementById('project-access');
    const codeGroup = document.getElementById('project-code-group');

    // Show/hide access code field
    accessSelect.addEventListener('change', () => {
        codeGroup.classList.toggle('hidden', accessSelect.value !== 'private');
    });

    // Load and display projects
    function loadProjects() {
        const currentUser = Storage.getCurrentUser();
        const projects = Storage.getProjects();
        projectList.innerHTML = '';

        projects.forEach(project => {
            // Show project if user is owner or project is shared with user
            const isShared = project.sharedWith && project.sharedWith.includes(currentUser.email);
            if (project.owner === currentUser.email || isShared) {
                const projectCard = document.createElement('div');
                projectCard.className = 'card';
                projectCard.innerHTML = `
                    <h3>${project.name}</h3>
                    <p>${project.description || 'Без описания'}</p>
                    <p>Доступ: ${project.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                    <button onclick="openProject(${project.id})">Открыть</button>
                    ${project.owner === currentUser.email ? `
                        <button onclick="editProject(${project.id})">Редактировать</button>
                        <button onclick="deleteProject(${project.id})">Удалить</button>
                        <button onclick="openShareModal(${project.id})">Поделиться</button>
                        <button onclick="exportProject(${project.id})">Экспорт в ZIP</button>
                    ` : ''}
                `;
                projectList.appendChild(projectCard);
            }
        });
    }

    // Open project
    window.openProject = function(projectId) {
        const projects = Storage.getProjects();
        const project = projects.find(p => p.id === projectId);
        if (!project) {
            alert('Проект не найден');
            return;
        }
        if (project.access === 'private' && project.owner !== Storage.getCurrentUser().email && !Storage.hasAccess(projectId)) {
            const code = prompt('Введите код доступа:');
            if (code && Storage.grantAccess(projectId, code)) {
                Storage.addLog('access_project', `User accessed private project ${projectId}`);
                window.location.href = `project-detail.html?id=${projectId}`;
            } else {
                alert('Неверный код доступа');
            }
        } else {
            Storage.addLog('open_project', `User opened project ${projectId}`);
            window.location.href = `project-detail.html?id=${projectId}`;
        }
    };

    // Create or edit project
    let editingProjectId = null;
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('project-name').value;
        const description = document.getElementById('project-description').value;
        const access = document.getElementById('project-access').value;
        const code = document.getElementById('project-code').value || generateAccessCode();

        let projects = Storage.getProjects();
        const currentUser = Storage.getCurrentUser();

        if (editingProjectId) {
            const project = projects.find(p => p.id === editingProjectId);
            project.name = name;
            project.description = description;
            project.access = access;
            if (access === 'private') {
                Storage.saveAccessCode(editingProjectId, code);
            }
            Storage.addLog('edit_project', `User edited project ${editingProjectId}`);
        } else {
            const project = {
                id: Date.now(),
                name,
                description,
                owner: currentUser.email,
                access,
                sharedWith: [],
                createdAt: new Date().toISOString(),
            };
            projects.push(project);
            if (access === 'private') {
                Storage.saveAccessCode(project.id, code);
            }
            Storage.addLog('create_project', `User created project ${project.id}`);
        }

        Storage.saveProjects(projects);
        closeModal('project-modal');
        projectForm.reset();
        codeGroup.classList.add('hidden');
        editingProjectId = null;
        loadProjects();
    });

    // Edit project
    window.editProject = function(projectId) {
        const projects = Storage.getProjects();
        const project = projects.find(p => p.id === projectId);
        if (project.owner !== Storage.getCurrentUser().email) {
            alert('Только владелец может редактировать проект');
            return;
        }
        editingProjectId = projectId;
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-access').value = project.access;
        codeGroup.classList.toggle('hidden', project.access !== 'private');
        document.getElementById('project-code').value = '';
        openModal('project-modal');
    };

    // Delete project
    window.deleteProject = function(projectId) {
        if (!confirm('Вы уверены, что хотите удалить проект?')) return;
        let projects = Storage.getProjects();
        projects = projects.filter(p => p.id !== projectId);
        Storage.saveProjects(projects);
        const codes = Storage.getAccessCodes();
        delete codes[projectId];
        localStorage.setItem('accessCodes', JSON.stringify(codes));
        Storage.addLog('delete_project', `User deleted project ${projectId}`);
        loadProjects();
    };

    // Share project
    window.openShareModal = function(projectId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'share-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close" onclick="closeModal('share-modal')">&times;</span>
                <h2>Поделиться проектом</h2>
                <form id="share-form">
                    <div class="form-group">
                        <label for="share-email">Email пользователя</label>
                        <input type="email" id="share-email" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Добавить</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        openModal('share-modal');

        const shareForm = document.getElementById('share-form');
        shareForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('share-email').value;
            const users = Storage.getUsers();
            if (!users.some(u => u.email === email)) {
                alert('Пользователь с таким email не найден');
                return;
            }
            let projects = Storage.getProjects();
            const project = projects.find(p => p.id === projectId);
            if (project.owner !== Storage.getCurrentUser().email) {
                alert('Только владелец может делиться проектом');
                return;
            }
            if (!project.sharedWith) project.sharedWith = [];
            if (!project.sharedWith.includes(email)) {
                project.sharedWith.push(email);
                Storage.saveProjects(projects);
                Storage.addLog('share_project', `User shared project ${projectId} with ${email}`);
            }
            closeModal('share-modal');
            modal.remove();
            loadProjects();
        });
    };

    // Export project
    window.exportProject = function(projectId) {
        const zip = Storage.exportProjectToZip(projectId);
        if (zip) {
            zip.generateAsync({ type: 'blob' }).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `project_${projectId}.zip`;
                a.click();
                URL.revokeObjectURL(url);
                Storage.addLog('export_project', `User exported project ${projectId}`);
            });
        }
    };

    // Open project modal
    window.openProjectModal = function() {
        const modal = document.getElementById('project-modal');
        if (modal) {
            document.getElementById('project-form').reset();
            document.getElementById('project-code-group').classList.add('hidden');
            document.getElementById('project-modal').querySelector('h2').textContent = 'Создать проект';
            openModal('project-modal');
        }
    };

    loadProjects(); // Initial load
});