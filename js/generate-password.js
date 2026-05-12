// ⚠️ ЗАПУСК: node js/generate-password.js

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Функция хеширования пароля
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Пароль по умолчанию (можете изменить)
const DEFAULT_PASSWORD = 'auto123';

// Создаем хеш
const hash = hashPassword(DEFAULT_PASSWORD);

// Путь к папке config (относительно текущей папки)
const configDir = path.join(process.cwd(), 'config');

// Создаем папку config если её нет
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
    console.log('📁 Создана папка: config');
}

// Создаем бинарный файл
const buffer = Buffer.from(hash, 'hex');
const binPath = path.join(configDir, 'password.bin');
fs.writeFileSync(binPath, buffer);

console.log('✅ Бинарный файл пароля создан!');
console.log(`📁 Путь: ${binPath}`);
console.log(`🔑 Пароль: ${DEFAULT_PASSWORD}`);
console.log(`📝 Хеш: ${hash}`);