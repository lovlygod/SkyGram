// lib/websocket/server.js
// Этот файл обеспечивает совместимость с CommonJS для TypeScript модуля

// Устанавливаем ts-node для поддержки импорта TypeScript файлов
if (typeof require !== 'undefined') {
  try {
    require('ts-node/register');
  } catch (e) {
    // Если ts-node не установлен, выводим сообщение об ошибке
    console.error('Please install ts-node: pnpm install -D ts-node');
    process.exit(1);
  }
}

// Импортируем TypeScript модуль через ts-node
const { wsManager } = require('./server.ts');

module.exports = { wsManager };