const { getDb } = require('./utils/db');
const { verifyToken } = require('./utils/auth');

exports.handler = async (event) => {
  try {
    const sql = getDb();
    const headers = { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const user = verifyToken(event);
    if (!user) {
       return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }) };
    }

    const userId = user.username;
    const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id'];

    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing Auth Headers (X-Project-Id)' }) };
    }

    if (event.httpMethod === 'GET') {
      const month = event.queryStringParameters.month; // optionally filter by 'YYYY-MM'
      let result;
      
      if (month) {
        const [year, m] = month.split('-');
        result = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.type as category_type 
          FROM expenses e
          LEFT JOIN categories c ON e.category_id = c.id
          WHERE EXTRACT(YEAR FROM e.date) = ${year} AND EXTRACT(MONTH FROM e.date) = ${m} AND e.project_id = ${projectId}
          ORDER BY e.date DESC
        `;
      } else {
        result = await sql`
          SELECT e.*, c.name as category_name, c.color as category_color, c.type as category_type 
          FROM expenses e
          LEFT JOIN categories c ON e.category_id = c.id
          WHERE e.project_id = ${projectId}
          ORDER BY e.date DESC LIMIT 100
        `;
      }
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const { amount, concept, category_id, date } = data;
      
      if (!amount || !date) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields (amount, date)' }) };
      }

      const result = await sql`
        INSERT INTO expenses (amount, concept, category_id, date, project_id, created_by) 
        VALUES (${amount}, ${concept}, ${category_id || null}, ${date}, ${projectId}, ${userId}) 
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      const { id, amount, concept, category_id, date } = data;

      if (!id || amount === undefined) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID and Amount are required' }) };
      }

      // Validar propiedad del registro
      const result = await sql`
        UPDATE expenses 
        SET amount = ${amount}, 
            concept = COALESCE(${concept}, concept), 
            category_id = COALESCE(${category_id}, category_id), 
            date = COALESCE(${date}, date)
        WHERE id = ${id} AND project_id = ${projectId} AND created_by = ${userId}
        RETURNING *
      `;

      if (result.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied or Expense not found' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID is required' }) };

      const result = await sql`DELETE FROM expenses WHERE id = ${id} AND project_id = ${projectId} AND created_by = ${userId} RETURNING *`;
      if (result.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied or Expense not found' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted successfully' }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error in expenses function:', error);
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
