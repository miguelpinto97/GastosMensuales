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

      const singleTime = event.queryStringParameters?.single_time;

      if (singleTime === 'true') {
        const result = await sql`
          SELECT *
          FROM categories
          WHERE project_id = ${projectId}
          AND is_single_time = true
          ORDER BY name ASC
        `;

        return { statusCode: 200, headers, body: JSON.stringify(result) };
      }

      const result = await sql`
        SELECT *
        FROM categories
        WHERE project_id = ${projectId}
        ORDER BY name ASC
      `;

      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const name = data.name;
      const color = data.color || '#000000';
      const type = data.type || 'GASTO';
      const is_single_time = data.is_single_time !== undefined ? data.is_single_time : false;
      const budget = data.budget || 0;

      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };

      const result = await sql`
        INSERT INTO categories (name, color, type, is_single_time, budget, project_id, created_by) 
        VALUES (${name}, ${color}, ${type}, ${is_single_time}, ${budget}, ${projectId}, ${userId}) 
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      const { id, name, color, type, is_single_time, budget } = data;

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
            budget = ${budget}
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
