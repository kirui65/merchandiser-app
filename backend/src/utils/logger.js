const env = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = env.nodeEnv === 'production' ? 'info' : 'debug';

function log(level, ...args) {
  if (LEVELS[level] > LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  debug: (...a) => log('debug', ...a),
};
