// ============================================
// МОДУЛЬ АВТОРИЗАЦИИ (с поддержкой смены пароля)
// ============================================

const AUTH_KEY = 'admin_auth';
const PASSWORD_FILE_URL = 'config/password.bin';

let savedHash = null;

// Загрузка хеша из бинарного файла
async function loadPasswordHash() {
    try {
        const response = await fetch(PASSWORD_FILE_URL);
        if (!response.ok) {
            console.error('❌ Файл пароля не найден');
            return false;
        }
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        savedHash = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('✅ Пароль загружен');
        return true;
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return false;
    }
}

// Хеширование пароля
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Проверка пароля
async function verifyPassword(password) {
    if (!savedHash) await loadPasswordHash();
    const inputHash = await hashPassword(password);
    return inputHash === savedHash;
}

// Смена пароля (POST запрос к серверу)
async function changePassword(oldPassword, newPassword) {
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Очищаем кэш хеша
            savedHash = null;
            sessionStorage.removeItem(AUTH_KEY);
        }
        
        return result;
    } catch (error) {
        return { success: false, message: 'Ошибка соединения с сервером' };
    }
}

// Проверка авторизации
function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
}

// Вход
async function login(password) {
    const isValid = await verifyPassword(password);
    if (isValid) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        return { success: true };
    }
    return { success: false, message: 'Неверный пароль' };
}

// Выход
function logout() {
    sessionStorage.removeItem(AUTH_KEY);
}

// Инициализация
async function initAuth() {
    return await loadPasswordHash();
}