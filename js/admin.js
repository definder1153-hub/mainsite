// ============================================
// АДМИН-ПАНЕЛЬ (ВСЯ ЛОГИКА)
// ============================================

const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbzWMfPLH3N6LZzwtuNr8d6vUS4JB0O_RWXZHCTf3-ZKbhpD0ZAFZCFXihFJAyZtpC2IMg/exec';

let applications = [];
let filteredApplications = [];
let currentSort = { column: 'date', direction: 'desc' };
let currentPage = 1;
let itemsPerPage = 20;

// ===== ФУНКЦИЯ ESCAPE HTML =====
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function addDebugMessage(msg, isError = false) {
    const debugLog = document.getElementById('debugLog');
    if (!debugLog) return;
    const time = new Date().toLocaleTimeString();
    const color = isError ? '#ff6b6b' : '#51cf66';
    debugLog.innerHTML += `<div style="color: ${color};">[${time}] ${msg}</div>`;
    debugLog.scrollTop = debugLog.scrollHeight;
    console.log(msg);
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        document.getElementById('debugPanel')?.classList.toggle('show');
    }
});

// ===== АВТОРИЗАЦИЯ =====
function checkAuth() {
    if (isAuthenticated()) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminContainer').style.display = 'block';
        addDebugMessage('✅ Авторизация успешна');
        syncWithGoogleSheets();
    } else {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminContainer').style.display = 'none';
    }
}

async function doLogin() {
    const password = document.getElementById('loginPassword').value;
    const result = await login(password);
    
    if (result.success) {
        document.getElementById('loginError').textContent = '';
        checkAuth();
    } else {
        document.getElementById('loginError').textContent = result.message || 'Неверный пароль!';
    }
}

function logout() {
    sessionStorage.removeItem('admin_auth');
    checkAuth();
}

// ===== ФУНКЦИИ СМЕНЫ ПАРОЛЯ =====
function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'flex';
        const oldInput = document.getElementById('oldPassword');
        const newInput = document.getElementById('newPassword');
        const confirmInput = document.getElementById('confirmPassword');
        const messageDiv = document.getElementById('passwordChangeMessage');
        if (oldInput) oldInput.value = '';
        if (newInput) newInput.value = '';
        if (confirmInput) confirmInput.value = '';
        if (messageDiv) messageDiv.innerHTML = '';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
}

async function changePasswordHandler() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('passwordChangeMessage');
    
    if (newPassword !== confirmPassword) {
        if (messageDiv) messageDiv.innerHTML = '<span style="color: red;">❌ Новый пароль и подтверждение не совпадают</span>';
        return;
    }
    
    if (newPassword.length < 4) {
        if (messageDiv) messageDiv.innerHTML = '<span style="color: red;">❌ Пароль должен быть минимум 4 символа</span>';
        return;
    }
    
    if (messageDiv) messageDiv.innerHTML = '<span style="color: blue;">⏳ Проверка...</span>';
    
    const result = await changePassword(oldPassword, newPassword);
    
    if (result.success) {
        if (messageDiv) messageDiv.innerHTML = '<span style="color: green;">✅ ' + result.message + '</span>';
        setTimeout(() => {
            closeChangePasswordModal();
            Swal.fire({
                icon: 'success',
                title: 'Пароль изменен!',
                text: 'Пожалуйста, войдите с новым паролем',
                confirmButtonColor: '#ff5722'
            }).then(() => {
                window.location.reload();
            });
        }, 1500);
    } else {
        if (messageDiv) messageDiv.innerHTML = '<span style="color: red;">❌ ' + result.message + '</span>';
    }
}

function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString('ru-RU');
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return String(timestamp);
        return date.toLocaleString('ru-RU');
    } catch(e) {
        return String(timestamp);
    }
}

// ===== РАБОТА С GOOGLE SHEETS =====
async function syncWithGoogleSheets() {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) syncStatus.textContent = '⏳ Синхронизация...';
    addDebugMessage('🚀 Синхронизация...');
    addDebugMessage(`📡 URL: ${GOOGLE_SHEETS_API}`);
    
    try {
        const response = await fetch(GOOGLE_SHEETS_API);
        addDebugMessage(`📥 Статус ответа: ${response.status}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        addDebugMessage(`📦 Данных: ${result.data ? result.data.length : 0}`);
        
        if (result.success && result.data) {
            applications = result.data.map(app => ({
                id: app.id || Math.random(),
                rowIndex: app.rowIndex,
                name: String(app.name || ''),
                phone: String(app.phone || ''),
                email: String(app.email || ''),
                car: String(app.car || ''),
                message: String(app.message || ''),
                date: app.date || formatDate(app.timestamp),
                timestamp: app.timestamp || '',
                status: app.status === 'new' ? 'new' : 'viewed'
            }));
            
            localStorage.setItem('applications_backup', JSON.stringify(applications));
            filteredApplications = [...applications];
            applySort();
            renderTable();
            updateStats();
            addDebugMessage(`✅ Загружено ${applications.length} заявок`);
            if (syncStatus) syncStatus.textContent = `✅ Синхронизировано (${applications.length})`;
        } else {
            throw new Error('Неверный формат ответа');
        }
    } catch (error) {
        addDebugMessage(`❌ Ошибка: ${error.message}`, true);
        const backup = localStorage.getItem('applications_backup');
        if (backup) {
            applications = JSON.parse(backup);
            filteredApplications = [...applications];
            renderTable();
            updateStats();
            if (syncStatus) syncStatus.textContent = `⚠️ Офлайн (${applications.length})`;
        }
    }
}

async function updateStatusInGoogleSheets(rowIndex, status) {
    try {
        addDebugMessage(`📤 Обновление статуса: строка ${rowIndex} -> ${status}`);
        const url = `${GOOGLE_SHEETS_API}?action=update&rowIndex=${rowIndex}&status=${status}`;
        const response = await fetch(url, { method: 'GET', mode: 'cors' });
        
        addDebugMessage(`📥 Ответ обновления: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                addDebugMessage(`✅ Статус обновлен: ${status}`);
                return true;
            } else {
                throw new Error(result.error || 'Ошибка сервера');
            }
        }
        throw new Error(`HTTP ${response.status}`);
    } catch (error) {
        addDebugMessage(`❌ Ошибка обновления: ${error.message}`, true);
        return false;
    }
}

async function markAsViewed() {
    const checkboxes = document.querySelectorAll('.app-checkbox:checked');
    if (checkboxes.length === 0) {
        Swal.fire('Внимание', 'Выберите заявки', 'warning');
        return;
    }
    
    const idsToUpdate = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    Swal.fire({
        title: `Отметить ${idsToUpdate.length} заявок?`,
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Да'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let successCount = 0;
            for (const app of applications) {
                if (idsToUpdate.includes(app.id) && app.status !== 'viewed') {
                    addDebugMessage(`📝 Обработка заявки: ${app.name}, строка ${app.rowIndex}`);
                    const updated = await updateStatusInGoogleSheets(app.rowIndex, 'viewed');
                    if (updated) {
                        app.status = 'viewed';
                        successCount++;
                    }
                }
            }
            filteredApplications = [...applications];
            renderTable();
            updateStats();
            localStorage.setItem('applications_backup', JSON.stringify(applications));
            
            if (successCount > 0) {
                Swal.fire('Готово!', `${successCount} заявок отмечены`, 'success');
                setTimeout(() => syncWithGoogleSheets(), 1000);
            } else {
                Swal.fire('Ошибка', 'Не удалось обновить статус', 'error');
            }
        }
    });
}

// ===== ОТОБРАЖЕНИЕ ТАБЛИЦЫ =====
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    const start = (currentPage - 1) * itemsPerPage;
    const pageData = filteredApplications.slice(start, start + itemsPerPage);
    
    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">Нет данных</td></table>';
        renderPagination();
        return;
    }
    
    tbody.innerHTML = pageData.map(app => {
        let messageText = '-';
        if (app.message !== null && app.message !== undefined) {
            messageText = String(app.message);
            if (messageText.length > 50) messageText = messageText.substring(0, 50) + '...';
        }
        return `<tr>
            <td class="checkbox-col"><input type="checkbox" class="app-checkbox" data-id="${app.id}"></td>
            <td>${escapeHtml(app.date)}</td>
            <td><strong>${escapeHtml(app.name)}</strong></td>
            <td>${escapeHtml(app.phone)}</td>
            <td>${escapeHtml(app.email || '-')}</td>
            <td>${escapeHtml(app.car || '-')}</td>
            <td>${escapeHtml(messageText)}</td>
            <td><span class="status-${app.status === 'new' ? 'new' : 'viewed'}">${app.status === 'new' ? '🆕 Новый' : '✓ Просмотрен'}</span></td>
            <td><button class="delete-btn" onclick="deleteApp(${app.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    renderPagination();
}

function deleteApp(id) {
    Swal.fire({ title: 'Удалить?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Да' })
        .then((result) => {
            if (result.isConfirmed) {
                applications = applications.filter(a => a.id !== id);
                filteredApplications = filteredApplications.filter(a => a.id !== id);
                localStorage.setItem('applications_backup', JSON.stringify(applications));
                renderTable();
                updateStats();
                Swal.fire('Удалено!', '', 'success');
            }
        });
}

function deleteSelected() {
    const checkboxes = document.querySelectorAll('.app-checkbox:checked');
    if (checkboxes.length === 0) {
        Swal.fire('Внимание', 'Выберите заявки', 'warning');
        return;
    }
    Swal.fire({ title: `Удалить ${checkboxes.length} заявок?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Да' })
        .then((result) => {
            if (result.isConfirmed) {
                const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
                applications = applications.filter(a => !ids.includes(a.id));
                filteredApplications = filteredApplications.filter(a => !ids.includes(a.id));
                localStorage.setItem('applications_backup', JSON.stringify(applications));
                renderTable();
                updateStats();
                Swal.fire('Удалено!', '', 'success');
            }
        });
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        document.querySelectorAll('.app-checkbox').forEach(cb => cb.checked = selectAll.checked);
    }
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    applySort();
    renderTable();
}

function applySort() {
    filteredApplications.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';
        if (currentSort.column === 'date') {
            valA = new Date(a.timestamp || a.date) || 0;
            valB = new Date(b.timestamp || b.date) || 0;
        }
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function filterTable() {
    const term = document.getElementById('searchInput')?.value.toLowerCase() || '';
    filteredApplications = term ? applications.filter(a => 
        (a.name || '').toLowerCase().includes(term) ||
        (a.phone || '').toLowerCase().includes(term) ||
        (a.car || '').toLowerCase().includes(term)
    ) : [...applications];
    applySort();
    currentPage = 1;
    renderTable();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    if (totalPages <= 1) { pagination.innerHTML = ''; return; }
    
    let html = '';
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderTable();
}

function updateStats() {
    document.getElementById('totalCount').textContent = applications.length;
    document.getElementById('newCount').textContent = applications.filter(a => a.status === 'new').length;
}

function exportToCSV() {
    const headers = ['Дата', 'Имя', 'Телефон', 'Email', 'Автомобиль', 'Проблема', 'Статус'];
    const rows = filteredApplications.map(a => [a.date, a.name, a.phone, a.email, a.car, a.message, a.status === 'new' ? 'Новый' : 'Просмотрен']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zayavki_${new Date().toISOString().slice(0,19)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    Swal.fire('Экспорт завершен!', '', 'success');
}

function exportToExcel() {
    const headers = ['Дата', 'Имя', 'Телефон', 'Email', 'Автомобиль', 'Проблема', 'Статус'];
    const rows = filteredApplications.map(a => [a.date, a.name, a.phone, a.email, a.car, a.message, a.status === 'new' ? 'Новый' : 'Просмотрен']);
    let html = '<html><head><meta charset="UTF-8"><title>Заявки</title></head><body><table border="1"><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</thead><tbody>';
    rows.forEach(r => { html += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</td>'; });
    html += '</tbody></table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zayavki_${new Date().toISOString().slice(0,19)}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    Swal.fire('Экспорт завершен!', '', 'success');
}

// ===== НАСТРОЙКИ (через сервер) =====

async function openSettingsModal() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        document.getElementById('formsubmitEnabled').checked = settings.formsubmitEnabled === true;
        document.getElementById('googleSheetsEnabled').checked = settings.googleSheetsEnabled !== false;
        document.getElementById('notificationEmail').value = settings.notificationEmail || '';
        document.getElementById('formsubmitUrl').value = settings.formsubmitUrl || '';
        document.getElementById('googleSheetsUrl').value = settings.googleSheetsUrl || '';
        
        toggleFormsubmitSettings();
        toggleGoogleSheetsSettings();
        
        document.getElementById('settingsModal').style.display = 'flex';
        document.getElementById('settingsMessage').innerHTML = '';
    } catch (error) {
        Swal.fire('Ошибка', 'Не удалось загрузить настройки', 'error');
    }
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function toggleFormsubmitSettings() {
    const enabled = document.getElementById('formsubmitEnabled').checked;
    document.getElementById('formsubmitSettings').style.display = enabled ? 'block' : 'none';
}

function toggleGoogleSheetsSettings() {
    const enabled = document.getElementById('googleSheetsEnabled').checked;
    document.getElementById('googleSheetsSettings').style.display = enabled ? 'block' : 'none';
}

async function saveSettings() {
    const settings = {
        formsubmitEnabled: document.getElementById('formsubmitEnabled').checked,
        googleSheetsEnabled: document.getElementById('googleSheetsEnabled').checked,
        notificationEmail: document.getElementById('notificationEmail').value,
        formsubmitUrl: document.getElementById('formsubmitUrl').value,
        googleSheetsUrl: document.getElementById('googleSheetsUrl').value
    };
    
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('settingsMessage').innerHTML = '<span style="color: green;">✅ Настройки сохранены!</span>';
            setTimeout(() => closeSettingsModal(), 1500);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        document.getElementById('settingsMessage').innerHTML = '<span style="color: red;">❌ Ошибка сохранения</span>';
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initAdminAuth() {
    await initAuth();
    checkAuth();
}

addDebugMessage('💡 Нажмите Ctrl+Shift+E для панели отладки');
addDebugMessage('🔗 URL Google Sheets: ' + GOOGLE_SHEETS_API.substring(0, 50) + '...');
initAdminAuth();