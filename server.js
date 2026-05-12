// ============================================
// СЕРВЕР ДЛЯ RENDER.COM
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;

// Функция хеширования пароля
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Путь к бинарному файлу с паролем
const binPath = path.join(__dirname, 'config', 'password.bin');

// Проверяем и создаем файл пароля если его нет
if (!fs.existsSync(binPath)) {
    const defaultHash = hashPassword('auto123');
    const buffer = Buffer.from(defaultHash, 'hex');
    if (!fs.existsSync(path.join(__dirname, 'config'))) {
        fs.mkdirSync(path.join(__dirname, 'config'));
    }
    fs.writeFileSync(binPath, buffer);
    console.log('🔐 Создан пароль по умолчанию: auto123');
}

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

    // API смены пароля
    if (req.url === '/api/change-password' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { oldPassword, newPassword } = JSON.parse(body);
                
                const currentHash = fs.readFileSync(binPath).toString('hex');
                const oldHash = hashPassword(oldPassword);
                
                if (currentHash !== oldHash) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Неверный текущий пароль' }));
                    return;
                }
                
                if (!newPassword || newPassword.length < 4) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Пароль должен быть минимум 4 символа' }));
                    return;
                }
                
                const newHash = hashPassword(newPassword);
                const buffer = Buffer.from(newHash, 'hex');
                fs.writeFileSync(binPath, buffer);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Пароль успешно изменен!' 
                }));
                
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: error.message }));
            }
        });
        return;
    }

    // Статические файлы
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './admin.html';
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.css': contentType = 'text/css'; break;
        case '.js': contentType = 'application/javascript'; break;
        case '.json': contentType = 'application/json'; break;
        case '.bin': contentType = 'application/octet-stream'; break;
        case '.html': contentType = 'text/html'; break;
    }
    
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
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📁 Админ-панель: http://localhost:${PORT}/admin.html`);
});