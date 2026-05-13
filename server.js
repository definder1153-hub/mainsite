// ============================================
// СЕРВЕР ДЛЯ RENDER.COM (С НАСТРОЙКАМИ)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const binPath = path.join(__dirname, 'config', 'password.bin');
const settingsPath = path.join(__dirname, 'config', 'settings.json');

// Создаем папку config если нет
if (!fs.existsSync(path.join(__dirname, 'config'))) {
    fs.mkdirSync(path.join(__dirname, 'config'));
}

// Создаем password.bin если нет
if (!fs.existsSync(binPath)) {
    fs.writeFileSync(binPath, Buffer.from(hashPassword('auto123'), 'hex'));
    console.log('🔐 Пароль по умолчанию: auto123');
}

// Создаем settings.json если нет
if (!fs.existsSync(settingsPath)) {
    const defaultSettings = {
        formsubmitEnabled: false,
        formsubmitUrl: "https://formsubmit.co/ajax/atanonov@mail.ru",
        notificationEmail: "atanonov@mail.ru",
        googleSheetsEnabled: true,
        googleSheetsUrl: "https://script.google.com/macros/s/AKfycbzWMfPLH3N6LZzwtuNr8d6vUS4JB0O_RWXZHCTf3-ZKbhpD0ZAFZCFXihFJAyZtpC2IMg/exec"
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    console.log('⚙️ Создан файл настроек');
}

function loadSettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
        return { formsubmitEnabled: false, googleSheetsEnabled: true };
    }
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',      // ← ДОБАВЬТЕ ЭТУ СТРОКУ
    '.ico': 'image/x-icon',
    '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API смены пароля
    if (req.url === '/api/change-password' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { oldPassword, newPassword } = JSON.parse(body);
                const currentHash = fs.readFileSync(binPath).toString('hex');
                
                if (currentHash !== hashPassword(oldPassword)) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный текущий пароль' }));
                    return;
                }
                
                if (!newPassword || newPassword.length < 4) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Пароль должен быть минимум 4 символа' }));
                    return;
                }
                
                fs.writeFileSync(binPath, Buffer.from(hashPassword(newPassword), 'hex'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Пароль успешно изменен!' }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    // API получения настроек
    if (req.url === '/api/settings' && req.method === 'GET') {
        const settings = loadSettings();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(settings));
        return;
    }

    // API сохранения настроек
    if (req.url === '/api/settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const newSettings = JSON.parse(body);
                fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Настройки сохранены' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    // Статические файлы
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.log(`❌ Файл не найден: ${filePath}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Страница не найдена</h1>');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`🏠 Главная страница: http://localhost:${PORT}/`);
    console.log(`🔒 Админ-панель: http://localhost:${PORT}/admin.html`);
    console.log(`🔐 Пароль по умолчанию: auto123`);
});