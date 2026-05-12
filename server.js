// ============================================
// СЕРВЕР ДЛЯ RENDER.COM (ИСПРАВЛЕННЫЙ)
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Путь к бинарному файлу
const binPath = path.join(__dirname, 'config', 'password.bin');

// Создаем пароль если нет
if (!fs.existsSync(binPath)) {
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir);
    fs.writeFileSync(binPath, Buffer.from(hashPassword('auto123'), 'hex'));
    console.log('🔐 Пароль по умолчанию: auto123');
}

// MIME типы для файлов
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.bin': 'application/octet-stream',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // CORS
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

    // Обработка статических файлов
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Получаем расширение файла
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Читаем файл
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
    console.log(`📁 Корневая папка: ${__dirname}`);
});