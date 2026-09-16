/**
 * CONCODE Platform — Advanced Data Utility Module
 * File: utils/advancedDataUtils.js
 * 
 * Provides robust helper functions for data transformation, math/statistics,
 * string sanitization, and object manipulations.
 */

/**
 * Deep merges two objects recursively.
 */
function deepMerge(target = {}, source = {}) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Sanitizes input strings by stripping HTML tags and trimming whitespace.
 */
function sanitizeString(str = '') {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/**
 * Calculates basic statistics for an array of numbers.
 */
function calculateStats(numbers = []) {
  const valid = numbers.filter(n => typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) {
    return { count: 0, mean: 0, min: 0, max: 0, sum: 0 };
  }
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / valid.length;
  const min = Math.min(...valid);
  const max = Math.max(...valid);

  return {
    count: valid.length,
    sum,
    mean: Number(mean.toFixed(2)),
    min,
    max
  };
}

/**
 * Batches an array into smaller chunks of a specified size.
 */
function chunkArray(array = [], size = 10) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  deepMerge,
  sanitizeString,
  calculateStats,
  chunkArray
};
