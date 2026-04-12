const { getDb } = require('./utils/db');
const { verifyToken } = require('./utils/auth');

exports.handler = async (event) => {
  try {
    const sql = getDb();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-project-id, X-Project-Id, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
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
      try {
        const data = JSON.parse(event.body);
        const { name, color, type, is_single_time, budget, group_id } = data;

        if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };

        const result = await sql`
          INSERT INTO categories (name, color, type, is_single_time, budget, group_id, project_id, created_by) 
          VALUES (${name}, ${color || '#000000'}, ${type || 'GASTO'}, ${is_single_time || false}, ${budget || 0}, ${group_id || null}, ${projectId}, ${userId}) 
          RETURNING *
        `;
        return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
      } catch (err) {
        console.error('Error in POST categories:', err);
        if (err.code === '23505') {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya existe una categoría con ese nombre en este proyecto.' }) };
        }
        throw err;
      }
    }

    if (event.httpMethod === 'PUT') {
      try {
        const data = JSON.parse(event.body);
        const { id, name, color, type, is_single_time, budget, group_id } = data;

        if (!id || !name) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID and Name are required' }) };
        }

        // Verificar que el usuario sea miembro del proyecto (Case-Insensitive)
        const membership = await sql`SELECT 1 FROM user_projects WHERE LOWER(username) = LOWER(${userId}) AND project_id = ${projectId}`;
        if (membership.length === 0) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied. Not a project member.' }) };
        }

        const result = await sql`
          UPDATE categories 
          SET name = ${name}, 
              color = ${color},
              type = ${type},
              is_single_time = ${is_single_time},
              budget = ${budget},
              group_id = ${group_id || null}
          WHERE id = ${id} AND project_id = ${projectId}
          RETURNING *
        `;

        if (result.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Category not found or project mismatch' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
      } catch (err) {
        console.error('Error in PUT categories:', err);
        if (err.code === '23505') { // Unique violation
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya existe una categoría con ese nombre en este proyecto.' }) };
        }
        throw err; // Re-throw to be caught by the outer catch
      }
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID is required' }) };

      // Verificar membresía
      const membership = await sql`SELECT 1 FROM user_projects WHERE LOWER(username) = LOWER(${userId}) AND project_id = ${projectId}`;
      if (membership.length === 0) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied. Not a project member.' }) };
      }

      const result = await sql`DELETE FROM categories WHERE id = ${id} AND project_id = ${projectId} RETURNING *`;
      if (result.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Category not found' }) };
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
