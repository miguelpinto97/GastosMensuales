const { getDb } = require('./db');
require('dotenv').config();

async function checkColumns() {
    const sql = getDb();
    const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'expenses'
    `;
    console.log(JSON.stringify(columns, null, 2));
    process.exit(0);
}

checkColumns();
