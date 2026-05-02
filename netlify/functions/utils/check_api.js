const { getDb } = require('./db');
require('dotenv').config();

async function checkApiReturn() {
    const sql = getDb();
    const projectId = '76114f6b-7669-42b4-8461-8409405d4b85'; // Example project ID
    const [year, m] = ['2026', '04'];
    
    const result = await sql`
          SELECT e.*, 
                 c.name as category_name, 
                 c.color as category_color, 
                 c.type as category_type,
                 cg.name as group_name,
                 e.type as transaction_type
          FROM expenses e
          LEFT JOIN categories c ON e.category_id = c.id
          LEFT JOIN category_groups cg ON c.group_id = cg.id
          WHERE EXTRACT(YEAR FROM e.date) = ${year} AND EXTRACT(MONTH FROM e.date) = ${m}
          ORDER BY e.date DESC
    `;
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}

checkApiReturn();
