const { getDb } = require('./db');
require('dotenv').config();

async function checkData() {
    const sql = getDb();
    const data = await sql`
        SELECT e.id, e.amount, e.concept, e.date, e.type, c.name as cat_name, c.type as cat_type
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        ORDER BY e.id DESC
        LIMIT 20
    `;
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

checkData();
