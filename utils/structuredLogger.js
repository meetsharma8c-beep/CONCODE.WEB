/**
 * CONCODE Platform — Structured Logging Module
 * File: utils/structuredLogger.js
 * 
 * Standard JSON/Text logging helper supporting severity levels and formatting.
 */

const LOG_LEVELS = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

class StructuredLogger {
  constructor(name = 'CONCODE', minLevel = 'INFO') {
    this.name = name;
    this.minLevelVal = LOG_LEVELS[minLevel.toUpperCase()] || LOG_LEVELS.INFO;
  }

  formatEntry(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      logger: this.name,
      level,
      message,
      meta
    };
  }

  debug(message, meta) {
    if (LOG_LEVELS.DEBUG >= this.minLevelVal) {
      console.debug(JSON.stringify(this.formatEntry('DEBUG', message, meta)));
    }
  }

  info(message, meta) {
    if (LOG_LEVELS.INFO >= this.minLevelVal) {
      console.log(JSON.stringify(this.formatEntry('INFO', message, meta)));
    }
  }

  warn(message, meta) {
    if (LOG_LEVELS.WARN >= this.minLevelVal) {
      console.warn(JSON.stringify(this.formatEntry('WARN', message, meta)));
    }
  }

  error(message, meta) {
    if (LOG_LEVELS.ERROR >= this.minLevelVal) {
      console.error(JSON.stringify(this.formatEntry('ERROR', message, meta)));
    }
  }
}

module.exports = StructuredLogger;
