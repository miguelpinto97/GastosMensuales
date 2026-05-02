const { getDb } = require('./db');
require('dotenv').config();

async function checkCategories() {
    const sql = getDb();
    const data = await sql`
        SELECT DISTINCT type FROM categories
    `;
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

checkCategories();
