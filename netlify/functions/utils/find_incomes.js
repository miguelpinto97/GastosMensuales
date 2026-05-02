const { getDb } = require('./db');
require('dotenv').config();

async function findIncomesInExpenses() {
    const sql = getDb();
    const data = await sql`
        SELECT e.id, e.concept, c.type as cat_type
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE c.type = 'INGRESO'
    `;
    console.log("Incomes in DB:", JSON.stringify(data, null, 2));
    process.exit(0);
}

findIncomesInExpenses();
