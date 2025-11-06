// dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(); // Redirect if not logged in

    const projectCount = document.getElementById('project-count');
    const fileCount = document.getElementById('file-count');
    const noteCount = document.getElementById('note-count');
    const recentProjects = document.getElementById('recent-projects');
    const recentNotes = document.getElementById('recent-notes');
    const recentFiles = document.getElementById('recent-files');
    const searchBar = document.querySelector('.search-bar');

    // Load dashboard data
    function loadDashboard(searchQuery = '') {
        const currentUser = Storage.getCurrentUser();
        const projects = Storage.getProjects().filter(
            p => (p.owner === currentUser.email || p.sharedWith.includes(currentUser.email)) &&
                 (searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
        );
        const items = Storage.getItems().filter(
            i => projects.some(p => p.id === Number(i.parentId)) &&
                 (searchQuery ? i.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
        );

        // Update stats
        projectCount.textContent = projects.length;
        fileCount.textContent = items.filter(i => i.type === 'file').length;
        noteCount.textContent = items.filter(i => i.type === 'note').length;

        // Show recent projects (last 3)
        recentProjects.innerHTML = '';
        projects.slice(0, 3).forEach(project => {
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

        // Show recent notes (last 3)
        recentNotes.innerHTML = '';
        items.filter(i => i.type === 'note').slice(0, 3).forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'card';
            const preview = note.isChecklist
                ? note.content.slice(0, 3).map(c => `<div><input type="checkbox" ${c.checked ? 'checked' : ''} disabled> ${c.text}</div>`).join('') + (note.content.length > 3 ? '...' : '')
                : (note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content);
            noteCard.innerHTML = `
                <h3>📝 ${note.name}</h3>
                <p>${preview}</p>
                <p>Доступ: ${note.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                <button onclick="viewNote('${note.id}')">Просмотреть</button>
            `;
            recentNotes.appendChild(noteCard);
        });

        // Show recent files (last 3)
        recentFiles.innerHTML = '';
        items.filter(i => i.type === 'file').slice(0, 3).forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'card';
            fileCard.innerHTML = `
                <h3>📄 ${file.name}</h3>
                <p>Размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                <p>Доступ: ${file.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                <button onclick="openFile('${file.id}')">Открыть</button>
            `;
            recentFiles.appendChild(fileCard);
        });
    }

    // Search functionality
    searchBar.addEventListener('input', (e) => {
        loadDashboard(e.target.value);
    });

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

    // Open file
    window.openFile = function(fileId) {
        const item = Storage.getItems().find(i => String(i.id) === String(fileId));
        if (!item) {
            alert('Файл не найден');
            return;
        }
        
        if (item.access === 'private' && item.owner !== Storage.getCurrentUser().email && !Storage.hasAccess(item.id)) {
            const code = prompt('Введите код доступа к файлу:');
            if (!code || !Storage.grantAccess(item.id, code)) {
                alert('Неверный код доступа');
                return;
            }
            Storage.addLog('access_file', `User accessed private file ${fileId}`);
        }
        
        alert('Просмотр файла пока не доступен. Обратитесь к команде backend.');
        Storage.addLog('open_file', `User attempted to open file ${fileId}`);
    };

    // View note
    window.viewNote = function(noteId) {
        const item = Storage.getItems().find(i => String(i.id) === String(noteId));
        if (!item) {
            alert('Заметка не найдена');
            return;
        }
        
        if (item.access === 'private' && item.owner !== Storage.getCurrentUser().email && !Storage.hasAccess(item.id)) {
            const code = prompt('Введите код доступа к заметке:');
            if (!code || !Storage.grantAccess(item.id, code)) {
                alert('Неверный код доступа');
                return;
            }
            Storage.addLog('access_note', `User accessed private note ${noteId}`);
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'note-view-modal';
        
        let contentHtml = '';
        if (item.isChecklist) {
            contentHtml = item.content.map((c, index) => 
                `<div style="margin: 8px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" ${c.checked ? 'checked' : ''} 
                               onchange="updateChecklist('${item.id}', this, ${index})" 
                               style="margin-right: 10px;">
                        ${c.text}
                    </label>
                </div>`
            ).join('');
        } else {
            contentHtml = `<div style="padding: 15px; white-space: pre-wrap;">${item.content}</div>`;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; width: 90%;">
                <span class="modal-close" onclick="closeNoteModal('note-view-modal')" style="font-size: 24px;">&times;</span>
                <h2>${item.name}</h2>
                <div style="margin-top: 20px;">${contentHtml}</div>
                <button onclick="closeNoteModal('note-view-modal')" class="btn btn-primary" style="margin-top: 20px;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
        openModal('note-view-modal');
        Storage.addLog('view_note', `User viewed note ${noteId}`);
    };

    // Close note modal with refresh
    window.closeNoteModal = function(modalId) {
        closeModal(modalId);
        document.getElementById(modalId).remove(); // Remove modal from DOM
        loadDashboard(searchBar.value); // Refresh dashboard
    };

    // Update checklist
    window.updateChecklist = function(noteId, checkbox, index) {
        const items = Storage.getItems();
        const note = items.find(i => String(i.id) === String(noteId));
        if (note && note.isChecklist && note.content[index]) {
            note.content[index].checked = checkbox.checked;
            Storage.saveItems(items);
            Storage.addLog('update_note', `User updated checklist in note ${noteId}`);
            loadDashboard(searchBar.value); // Refresh dashboard
        }
    };

    loadDashboard(); // Initial load
});