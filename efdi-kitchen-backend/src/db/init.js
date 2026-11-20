const fs = require('fs');
const path = require('path');
const { sql, getPool, closePool } = require('../config/database');

(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const pool = await getPool();
    const batches = schema.split(/\nGO\s*\n/i).filter(b => b.trim());
    for (const batch of batches) {
      await pool.request().batch(batch);
    }
    console.log('Schema applied.');
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('Schema failed:', err);
    process.exit(1);
  }
})();