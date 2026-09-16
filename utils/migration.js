const DatabaseManager = require('./DatabaseManager');
const path = require('path');
const fs = require('fs');

const db = new DatabaseManager();

/**
 * Parses CSV text lines.
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/^["']|["']$/g, '').trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    records.push(row);
  }
  return records;
}

/**
 * Migrates data using dynamic schemas.
 * @param {string} targetCollection 
 * @param {string} rawData 
 * @param {Object} mapping - key value dictionary (e.g., {"client_email": "email", "full_name": "name"})
 * @param {string} format 
 * @returns {Promise<Object>}
 */
async function migrateData(targetCollection, rawData, format = 'json', mapping = {}) {
  const collectionName = targetCollection || 'contacts';
  let records = [];
  if (typeof rawData === 'string' && format.toLowerCase() === 'csv') {
    records = parseCSV(rawData);
  } else if (Array.isArray(rawData)) {
    records = rawData;
  } else if (typeof rawData === 'object' && rawData !== null) {
    records = [rawData];
  } else {
    try {
      const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      records = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      throw new Error('Failed to parse input data. Ensure valid JSON or CSV structure.');
    }
  }

  let successCount = 0;
  let failCount = 0;
  const errors = [];
  const importedIds = [];

  for (const record of records) {
    try {
      // 1. Process custom schema mapping overrides
      const mappedRecord = {};
      
      // Standardize record keys first by lowercasing them for robust lookup
      const recordLower = {};
      Object.keys(record).forEach(k => {
        recordLower[k.toLowerCase()] = record[k];
      });

      // Apply user mapping dictionary first
      const finalMapping = { ...mapping };
      
      // Fallback default lookups if not defined in user mapping
      const standardLookups = {
        name: ['name', 'full_name', 'client_name', 'username', 'user'],
        email: ['email', 'email_address', 'mail', 'client_email'],
        message: ['message', 'description', 'desc', 'project_desc', 'details', 'text'],
        description: ['description', 'desc', 'project_desc', 'details', 'text'],
        serviceType: ['service', 'service_type', 'servicetype', 'module', 'client_module']
      };

      // Mapped fields compiler
      const resolveField = (standardKey) => {
        // Check user custom mapping key override
        const userMappedKey = Object.keys(finalMapping).find(k => finalMapping[k] === standardKey);
        if (userMappedKey && recordLower[userMappedKey.toLowerCase()] !== undefined) {
          return recordLower[userMappedKey.toLowerCase()];
        }
        // Fallback default matching
        const fallbackKeys = standardLookups[standardKey] || [];
        for (const fKey of fallbackKeys) {
          if (recordLower[fKey] !== undefined) {
            return recordLower[fKey];
          }
        }
        return undefined;
      };

      // Map values
      const nameVal = resolveField('name');
      if (nameVal !== undefined) {
        // Proper capitalization
        mappedRecord.name = nameVal
          .trim()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }

      const emailVal = resolveField('email');
      if (emailVal !== undefined) {
        mappedRecord.email = emailVal.trim().toLowerCase();
        if (!/\S+@\S+\.\S+/.test(mappedRecord.email)) {
          throw new Error(`Invalid email format: "${emailVal}"`);
        }
      }

      const descVal = resolveField('description') || resolveField('message');
      if (descVal !== undefined) {
        if (targetCollection === 'contacts') {
          mappedRecord.message = descVal.trim();
        } else {
          mappedRecord.description = descVal.trim();
        }
      }

      const serviceVal = resolveField('serviceType');
      if (serviceVal !== undefined) {
        mappedRecord.serviceType = serviceVal.trim();
      }

      // Add default session structures for chats
      if (targetCollection === 'chats') {
        mappedRecord.role = record.role || 'user';
        mappedRecord.text = record.text || record.message || record.description || '';
        mappedRecord.sessionId = record.sessionId || 'migrated_session';
      }

      // 2. Target Validations
      if (targetCollection === 'contacts') {
        if (!mappedRecord.name || !mappedRecord.email || !mappedRecord.message) {
          throw new Error('Missing required contact fields (name, email, message).');
        }
      } else if (targetCollection === 'inquiries') {
        if (!mappedRecord.name || !mappedRecord.email || !mappedRecord.serviceType || !mappedRecord.description) {
          throw new Error('Missing required inquiry fields (name, email, serviceType, description).');
        }
      }

      const finalRecord = { ...record, ...mappedRecord };
      const doc = await db.insert(targetCollection, finalRecord);
      importedIds.push(doc ? doc.id || doc._id || String(Math.random()) : 'migrated_item');
      successCount++;
    } catch (err) {
      failCount++;
      errors.push(err.message);
    }
  }

  const jobId = 'job_' + Math.random().toString(36).substr(2, 9);
  
  const migrationJob = {
    jobId,
    targetCollection,
    format,
    stats: {
      totalRead: records.length,
      successful: successCount,
      failed: failCount,
    },
    importedIds,
    errors,
    timestamp: new Date().toISOString()
  };

  await db.insert('migrations', migrationJob);

  return migrationJob;
}

/**
 * Compiles and returns all imported records of a job.
 * @param {string} jobId 
 * @returns {Promise<Array>}
 */
async function exportMigrationJob(jobId) {
  const migrations = await db.read('migrations');
  const job = migrations.find(m => m.jobId === jobId);
  if (!job) {
    throw new Error(`Migration job with ID "${jobId}" not found.`);
  }

  const targetData = await db.read(job.targetCollection);
  // Filter for IDs imported in this job
  const exportedRecords = targetData.filter(d => job.importedIds.includes(d.id));
  
  return {
    jobId,
    targetCollection: job.targetCollection,
    exportedCount: exportedRecords.length,
    timestamp: new Date().toISOString(),
    records: exportedRecords
  };
}

module.exports = {
  migrateData,
  exportMigrationJob
};
