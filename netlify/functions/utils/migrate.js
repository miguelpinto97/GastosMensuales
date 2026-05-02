const { getDb } = require('./db');
require('dotenv').config();

async function addColumn() {
    const sql = getDb();
    try {
        await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255)`;
        console.log("Column updated_by added successfully or already exists.");
    } catch (err) {
        console.error("Error adding column:", err);
    }
    process.exit(0);
}

addColumn();
