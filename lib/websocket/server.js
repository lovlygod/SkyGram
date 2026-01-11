if (typeof require !== 'undefined') {
  try {
    require('ts-node/register');
  } catch (e) {
    console.error('Please install ts-node: pnpm install -D ts-node');
    process.exit(1);
  }
}

const { wsManager } = require('./server.ts');

module.exports = { wsManager };