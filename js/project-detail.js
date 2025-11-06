// project-detail.js
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(); // Redirect if not logged in

    const projectId = new URLSearchParams(window.location.search).get('id');
    const project = Storage.getProjects().find(p => p.id == projectId);
    if (!project) {
        alert('Проект не найден');
        window.location.href = 'projects.html';
        return;
    }

    const currentUser = Storage.getCurrentUser();
    if (project.access === 'private' && project.owner !== currentUser.email && !Storage.hasAccess(project.id)) {
        const code = prompt('Введите код доступа к проекту:');
        if (!code || !Storage.grantAccess(project.id, code)) {
            alert('Неверный код доступа');
            window.location.href = 'projects.html';
            return;
        }
        Storage.addLog('access_project', `User accessed private project ${projectId}`);
    }

    document.getElementById('project-title').textContent = project.name;
    const projectItems = document.getElementById('project-items');
    const folderForm = document.getElementById('folder-form');
    const noteForm = document.getElementById('note-form');
    const folderAccessSelect = document.getElementById('folder-access');
    const folderCodeGroup = document.getElementById('folder-code-group');
    const noteAccessSelect = document.getElementById('note-access');
    const noteCodeGroup = document.getElementById('note-code-group');

    // Show/hide access code fields
    if (folderAccessSelect) {
        folderAccessSelect.addEventListener('change', () => {
            folderCodeGroup.classList.toggle('hidden', folderAccessSelect.value !== 'private');
        });
    }
    if (noteAccessSelect) {
        noteAccessSelect.addEventListener('change', () => {
            noteCodeGroup.classList.toggle('hidden', noteAccessSelect.value !== 'private');
        });
    }

    let currentParentId = projectId; // Track current folder
    let editingItemId = null;

    // Load items
    function loadItems(parentId = projectId) {
        currentParentId = parentId;
        const items = Storage.getItems().filter(item => String(item.parentId) === String(parentId));
        projectItems.innerHTML = '';

        // Add Back button if not in root
        if (currentParentId !== projectId) {
            const backButton = document.createElement('button');
            backButton.className = 'btn btn-secondary';
            backButton.style.marginBottom = '15px';
            backButton.textContent = '← Назад';
            backButton.onclick = () => {
                const parentItem = Storage.getItems().find(i => String(i.id) === String(currentParentId));
                if (parentItem) {
                    loadItems(parentItem.parentId);
                }
            };
            projectItems.appendChild(backButton);
        }

        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'card';
            let content = '';

            if (item.type === 'folder') {
                content = `
                    <h3>📁 ${item.name}</h3>
                    <p>${item.description || 'Без описания'}</p>
                    <p>Доступ: ${item.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                    <button onclick="openFolder('${item.id}')">Открыть</button>
                `;
            } else if (item.type === 'file') {
                content = `
                    <h3>📄 ${item.name}</h3>
                    <p>Размер: ${(item.size / 1024 / 1024).toFixed(2)} МБ</p>
                    <p>Доступ: ${item.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                    <button onclick="openFile('${item.id}')">Открыть</button>
                `;
            } else if (item.type === 'note') {
                const preview = item.isChecklist 
                    ? item.content.slice(0, 3).map(c => `<div><input type="checkbox" ${c.checked ? 'checked' : ''} disabled> ${c.text}</div>`).join('') + (item.content.length > 3 ? '...' : '')
                    : (item.content.length > 100 ? item.content.slice(0, 100) + '...' : item.content);
                content = `
                    <h3>📝 ${item.name}</h3>
                    <p>${preview}</p>
                    <p>Доступ: ${item.access === 'public' ? 'Общедоступный' : 'Приватный'}</p>
                    <button onclick="viewNote('${item.id}')">Просмотреть</button>
                `;
            }

            if (item.owner === currentUser.email) {
                content += `
                    <button onclick="editItem('${item.id}')" style="margin-left: 10px;">Редактировать</button>
                    <button onclick="deleteItem('${item.id}')" style="background: #dc3545; color: white;">Удалить</button>
                `;
            }

            itemCard.innerHTML = content;
            projectItems.appendChild(itemCard);
        });
    }

    // Open folder
    window.openFolder = function(folderId) {
        const item = Storage.getItems().find(i => String(i.id) === String(folderId));
        if (!item) {
            alert('Папка не найдена');
            return;
        }
        
        if (item.access === 'private' && item.owner !== currentUser.email && !Storage.hasAccess(item.id)) {
            const code = prompt('Введите код доступа к папке:');
            if (code && Storage.grantAccess(item.id, code)) {
                Storage.addLog('access_folder', `User accessed private folder ${folderId}`);
                loadItems(folderId);
            } else {
                alert('Неверный код доступа');
            }
        } else {
            Storage.addLog('open_folder', `User opened folder ${folderId}`);
            loadItems(folderId);
        }
    };

    // Open file
    window.openFile = function(fileId) {
        const item = Storage.getItems().find(i => String(i.id) === String(fileId));
        if (!item) {
            alert('Файл не найден');
            return;
        }
        
        if (item.access === 'private' && item.owner !== currentUser.email && !Storage.hasAccess(item.id)) {
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
        
        if (item.access === 'private' && item.owner !== currentUser.email && !Storage.hasAccess(item.id)) {
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
        setTimeout(() => window.location.reload(), 100);
    };

    // Update checklist
    window.updateChecklist = function(noteId, checkbox, index) {
        const items = Storage.getItems();
        const note = items.find(i => String(i.id) === String(noteId));
        if (note && note.isChecklist && note.content[index]) {
            note.content[index].checked = checkbox.checked;
            Storage.saveItems(items);
            Storage.addLog('update_note', `User updated checklist in note ${noteId}`);
        }
    };

    // Edit item
    window.editItem = function(itemId) {
        const item = Storage.getItems().find(i => String(i.id) === String(itemId));
        if (!item) {
            alert('Элемент не найден');
            return;
        }
        if (item.owner !== currentUser.email) {
            alert('Только владелец может редактировать элемент');
            return;
        }
        
        editingItemId = itemId;
        
        if (item.type === 'folder') {
            document.getElementById('folder-name').value = item.name;
            document.getElementById('folder-description').value = item.description || '';
            document.getElementById('folder-access').value = item.access;
            folderCodeGroup.classList.toggle('hidden', item.access !== 'private');
            document.getElementById('folder-code').value = '';
            document.querySelector('#folder-modal h2').textContent = 'Редактировать папку';
            openModal('folder-modal');
        } else if (item.type === 'note') {
            document.getElementById('note-type').value = item.isChecklist ? 'checklist' : 'text';
            document.getElementById('note-content').value = item.isChecklist 
                ? item.content.map(c => c.text).join('\n') 
                : item.content;
            document.getElementById('note-access').value = item.access;
            noteCodeGroup.classList.toggle('hidden', item.access !== 'private');
            document.getElementById('note-code').value = '';
            document.querySelector('#note-modal h2').textContent = 'Редактировать заметку';
            openModal('note-modal');
        } else if (item.type === 'file') {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'edit-file-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="modal-close" onclick="closeModal('edit-file-modal')">&times;</span>
                    <h2>Редактировать файл</h2>
                    <form id="edit-file-form">
                        <div class="form-group">
                            <label>Имя файла: <strong>${item.name}</strong></label>
                        </div>
                        <div class="form-group">
                            <label for="file-access">Доступ</label>
                            <select id="file-access">
                                <option value="public" ${item.access === 'public' ? 'selected' : ''}>Общедоступный</option>
                                <option value="private" ${item.access === 'private' ? 'selected' : ''}>Приватный</option>
                            </select>
                        </div>
                        <div class="form-group ${item.access === 'private' ? '' : 'hidden'}" id="file-code-group">
                            <label for="file-code">Код доступа</label>
                            <input type="text" id="file-code" maxlength="8" value="${Storage.getAccessCodes()[itemId] || ''}">
                        </div>
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            openModal('edit-file-modal');

            const editFileForm = document.getElementById('edit-file-form');
            const fileAccessSelect = document.getElementById('file-access');
            const fileCodeGroup = document.getElementById('file-code-group');

            fileAccessSelect.addEventListener('change', () => {
                fileCodeGroup.classList.toggle('hidden', fileAccessSelect.value !== 'private');
            });

            editFileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newAccess = fileAccessSelect.value;
                const newCode = document.getElementById('file-code').value || generateAccessCode();

                const items = Storage.getItems();
                const item = items.find(i => String(i.id) === String(itemId));
                if (item) {
                    item.access = newAccess;
                    if (newAccess === 'private') {
                        Storage.saveAccessCode(itemId, newCode);
                    } else {
                        const codes = Storage.getAccessCodes();
                        delete codes[itemId];
                        localStorage.setItem('accessCodes', JSON.stringify(codes));
                    }
                    Storage.saveItems(items);
                    Storage.addLog('edit_file', `User edited file ${itemId} access to ${newAccess}`);
                    closeModal('edit-file-modal');
                    loadItems(currentParentId);
                }
            });
        }
    };

    // Delete item
    window.deleteItem = function(itemId) {
        if (!confirm('Вы уверены, что хотите удалить элемент?')) return;
        
        let items = Storage.getItems();
        const itemIndex = items.findIndex(i => String(i.id) === String(itemId));
        if (itemIndex === -1) {
            alert('Элемент не найден');
            return;
        }
        
        items.splice(itemIndex, 1);
        Storage.saveItems(items);
        
        const codes = Storage.getAccessCodes();
        delete codes[itemId];
        localStorage.setItem('accessCodes', JSON.stringify(codes));
        
        Storage.addLog('delete_item', `User deleted item ${itemId}`);
        loadItems(currentParentId);
    };

    // Folder form handler
    if (folderForm) {
        folderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('folder-name').value;
            const description = document.getElementById('folder-description').value;
            const access = document.getElementById('folder-access').value;
            const code = document.getElementById('folder-code').value || generateAccessCode();

            const items = Storage.getItems();
            if (editingItemId) {
                const item = items.find(i => String(i.id) === String(editingItemId));
                if (item) {
                    item.name = name;
                    item.description = description;
                    item.access = access;
                    if (access === 'private') {
                        Storage.saveAccessCode(editingItemId, code);
                    }
                    Storage.addLog('edit_folder', `User edited folder ${editingItemId}`);
                    document.querySelector('#folder-modal h2').textContent = 'Создать папку';
                }
            } else {
                const item = {
                    id: Date.now().toString(),
                    type: 'folder',
                    name,
                    description,
                    access,
                    owner: currentUser.email,
                    parentId: currentParentId,
                    createdAt: new Date().toISOString(),
                };
                items.push(item);
                if (access === 'private') {
                    Storage.saveAccessCode(item.id, code);
                }
                Storage.addLog('create_folder', `User created folder ${item.id}`);
            }
            Storage.saveItems(items);
            closeModal('folder-modal');
            folderForm.reset();
            folderCodeGroup.classList.add('hidden');
            editingItemId = null;
            loadItems(currentParentId);
        });
    }

    // Note form handler
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = document.getElementById('note-type').value;
            const contentRaw = document.getElementById('note-content').value;
            const access = document.getElementById('note-access').value;
            const code = document.getElementById('note-code').value || generateAccessCode();

            const content = type === 'checklist'
                ? contentRaw.split('\n').filter(line => line.trim()).map((text, index) => ({ 
                    text: text.trim(), 
                    checked: false, 
                    index 
                }))
                : contentRaw;

            const items = Storage.getItems();
            if (editingItemId) {
                const item = items.find(i => String(i.id) === String(editingItemId));
                if (item) {
                    item.name = contentRaw.split('\n')[0]?.trim() || 'Заметка';
                    item.content = content;
                    item.isChecklist = type === 'checklist';
                    item.access = access;
                    if (access === 'private') {
                        Storage.saveAccessCode(editingItemId, code);
                    }
                    Storage.addLog('edit_note', `User edited note ${editingItemId}`);
                    document.querySelector('#note-modal h2').textContent = 'Создать заметку';
                }
            } else {
                const item = {
                    id: Date.now().toString(),
                    type: 'note',
                    name: contentRaw.split('\n')[0]?.trim() || 'Заметка',
                    content,
                    isChecklist: type === 'checklist',
                    access,
                    owner: currentUser.email,
                    parentId: currentParentId,
                    createdAt: new Date().toISOString(),
                };
                items.push(item);
                if (access === 'private') {
                    Storage.saveAccessCode(item.id, code);
                }
                Storage.addLog('create_note', `User created note ${item.id}`);
            }
            Storage.saveItems(items);
            closeModal('note-modal');
            noteForm.reset();
            noteCodeGroup.classList.add('hidden');
            editingItemId = null;
            loadItems(currentParentId);
        });
    }

    // File upload with drag & drop
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.docx,.jpg,.png,.zip,.txt';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
            alert('Файл превышает лимит в 100 МБ');
            return;
        }
        showFileUploadModal(file);
    });

    function showFileUploadModal(file) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'file-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close" onclick="closeModal('file-modal')">&times;</span>
                <h2>Загрузить файл</h2>
                <form id="file-form">
                    <div class="form-group">
                        <label>Файл: <strong>${file.name}</strong></label>
                        <p>Размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ</p>
                    </div>
                    <div class="form-group">
                        <label for="file-access">Доступ</label>
                        <select id="file-access">
                            <option value="public">Общедоступный</option>
                            <option value="private">Приватный</option>
                        </select>
                    </div>
                    <div class="form-group hidden" id="file-code-group">
                        <label for="file-code">Код доступа</label>
                        <input type="text" id="file-code" maxlength="8" placeholder="Автогенерация">
                    </div>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        openModal('file-modal');

        const fileForm = document.getElementById('file-form');
        const fileAccessSelect = document.getElementById('file-access');
        const fileCodeGroup = document.getElementById('file-code-group');
        
        fileAccessSelect.addEventListener('change', () => {
            fileCodeGroup.classList.toggle('hidden', fileAccessSelect.value !== 'private');
        });

        fileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const access = fileAccessSelect.value;
            const code = document.getElementById('file-code').value || generateAccessCode();

            const items = Storage.getItems();
            const item = {
                id: Date.now().toString(),
                type: 'file',
                name: file.name,
                file,
                size: file.size,
                access,
                owner: currentUser.email,
                parentId: currentParentId,
                createdAt: new Date().toISOString(),
            };
            
            items.push(item);
            if (access === 'private') {
                Storage.saveAccessCode(item.id, code);
            }
            Storage.saveItems(items);
            Storage.addLog('upload_file', `User uploaded file ${item.id}`);
            
            closeModal('file-modal');
            modal.remove();
            fileInput.value = '';
            loadItems(currentParentId);
        });
    }

    // Drag & Drop
    projectItems.addEventListener('dragover', (e) => {
        e.preventDefault();
        projectItems.classList.add('dragover');
    });

    projectItems.addEventListener('dragleave', () => {
        projectItems.classList.remove('dragover');
    });

    projectItems.addEventListener('drop', (e) => {
        e.preventDefault();
        projectItems.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // Modal buttons
    window.openFolderModal = () => {
        editingItemId = null;
        document.querySelector('#folder-modal h2').textContent = 'Создать папку';
        folderForm.reset();
        folderCodeGroup.classList.add('hidden');
        openModal('folder-modal');
    };
    
    window.openNoteModal = () => {
        editingItemId = null;
        document.querySelector('#note-modal h2').textContent = 'Создать заметку';
        noteForm.reset();
        noteCodeGroup.classList.add('hidden');
        openModal('note-modal');
    };
    
    window.openFileModal = () => fileInput.click();

    // Initial load
    loadItems();
});