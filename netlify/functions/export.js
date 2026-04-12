const { getDb } = require('./utils/db');
const { verifyToken } = require('./utils/auth');

exports.handler = async (event) => {
  try {
    const sql = getDb();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-project-id, X-Project-Id, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const user = verifyToken(event);
    if (!user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id'];
    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing Project Header' }) };
    }

    const { start, end } = event.queryStringParameters;
    if (!start || !end) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Start and end dates are required (YYYY-MM-DD)' }) };
    }

    // Obtener todos los movimientos (Gastos e Ingresos) en el rango
    // Nota: Aunque la tabla se llama 'expenses', se usa para movimientos de varios tipos según la categoría vinculada.
    const results = await sql`
      SELECT 
        e.date,
        c.type,
        g.name as supercategory,
        c.name as category,
        e.concept,
        e.amount,
        e.created_at
      FROM expenses e
      INNER JOIN categories c ON e.category_id = c.id
      LEFT JOIN category_groups g ON c.group_id = g.id
      WHERE e.project_id = ${projectId}
        AND e.date >= ${start}
        AND e.date <= ${end}
      ORDER BY e.date DESC, e.created_at DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error in export function:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
