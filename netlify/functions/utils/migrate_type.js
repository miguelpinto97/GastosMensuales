const { getDb } = require('./db');
require('dotenv').config();

async function migrate() {
    const sql = getDb();
    
    console.log("Adding type column to expenses table...");
    try {
        await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'GASTO'`;
        
        console.log("Updating existing records based on category type...");
        // Update records that have an income category
        await sql`
            UPDATE expenses e
            SET type = 'INGRESO'
            FROM categories c
            WHERE e.category_id = c.id AND c.type = 'INGRESO'
        `;
        
        // Update records that have an expense or saving category
        await sql`
            UPDATE expenses e
            SET type = 'GASTO'
            FROM categories c
            WHERE e.category_id = c.id AND c.type IN ('GASTO', 'AHORRO')
        `;
        
        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    }
    process.exit(0);
}

migrate();
