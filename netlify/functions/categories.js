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

      const params = event.queryStringParameters || {};
      const type = params.type || 'all';
      const validTypes = ['single', 'accumulative', 'all'];
      if (!validTypes.includes(type)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid type parameter' })
        };
      }

      let filter = sql``;

      if (type === 'single') {
        filter = sql`AND is_single_time = true`;
      }

      if (type === 'accumulative') {
        filter = sql`AND is_single_time = false`;
      }

      const result = await sql`
        SELECT c.*, cg.name as group_name, cg.color as group_color
        FROM categories c
        LEFT JOIN category_groups cg ON c.group_id = cg.id
        WHERE c.project_id = ${projectId}
        ${filter}
        ORDER BY c.name ASC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const { name, color, type, is_single_time, budget, group_id } = data;

      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };

      const result = await sql`
        INSERT INTO categories (name, color, type, is_single_time, budget, group_id, project_id, created_by) 
        VALUES (${name}, ${color || '#000000'}, ${type || 'GASTO'}, ${is_single_time || false}, ${budget || 0}, ${group_id || null}, ${projectId}, ${userId}) 
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      const { id, name, color, type, is_single_time, budget, group_id } = data;

      if (!id || !name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID and Name are required' }) };
      }

      const found = await sql`SELECT id FROM categories WHERE id = ${id} AND project_id = ${projectId} AND created_by = ${userId}`;
      if (found.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied or Category not found' }) };
      }

      const result = await sql`
        UPDATE categories 
        SET name = ${name}, 
            color = ${color},
            type = ${type},
            is_single_time = ${is_single_time},
            budget = ${budget},
            group_id = ${group_id || null}
        WHERE id = ${id} AND project_id = ${projectId} AND created_by = ${userId}
        RETURNING *
      `;
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID is required' }) };

      const result = await sql`DELETE FROM categories WHERE id = ${id} AND project_id = ${projectId} AND created_by = ${userId} RETURNING *`;
      if (result.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied or Category not found' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted successfully' }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error in categories function:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
