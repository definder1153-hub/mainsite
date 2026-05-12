// ============================================
// СЕРВЕР ДЛЯ РАБОТЫ С БИНАРНЫМ ФАЙЛОМ ПАРОЛЯ
// Запуск: node server.js
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8081;

// Функция хеширования пароля
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Создаем сервер
const server = http.createServer(async (req, res) => {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Обработка API смены пароля
    if (req.url === '/api/change-password' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { oldPassword, newPassword } = JSON.parse(body);
                
                // Читаем текущий хеш из файла
                const binPath = path.join(__dirname, 'config', 'password.bin');
                const currentHash = fs.existsSync(binPath) 
                    ? fs.readFileSync(binPath).toString('hex')
                    : null;
                
                // Проверяем старый пароль
                const oldHash = hashPassword(oldPassword);
                if (currentHash !== oldHash) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный текущий пароль' }));
                    return;
                }
                
                // Проверяем новый пароль
                if (!newPassword || newPassword.length < 4) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Пароль должен быть минимум 4 символа' }));
                    return;
                }
                
                // Сохраняем новый хеш в бинарный файл
                const newHash = hashPassword(newPassword);
                const buffer = Buffer.from(newHash, 'hex');
                fs.writeFileSync(binPath, buffer);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Пароль успешно изменен. Используйте новый пароль для входа.' 
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    // Статические файлы (ваш существующий сайт)
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './admin.html';
    
    const extname = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.bin': 'application/octet-stream',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
    }[extname] || 'text/plain';
    
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404);
        res.end('File not found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Админ-панель: http://localhost:${PORT}/admin.html`);
    console.log(`🔐 Пароль по умолчанию: auto123`);
});