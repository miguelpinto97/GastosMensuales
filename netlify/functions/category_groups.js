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
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const userId = user.username;
    const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id'];

    if (!projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing Project Header' }) };
    }

    if (event.httpMethod === 'GET') {
      const result = await sql`
        SELECT * FROM category_groups 
        WHERE project_id = ${projectId} 
        ORDER BY name ASC
      `;
      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (event.httpMethod === 'POST') {
      try {
        const { name, color } = JSON.parse(event.body);
        if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };

        const result = await sql`
          INSERT INTO category_groups (name, color, project_id, created_by) 
          VALUES (${name}, ${color || '#3b82f6'}, ${projectId}, ${userId}) 
          RETURNING *
        `;
        return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
      } catch (err) {
        console.error('Error in POST category_groups:', err);
        if (err.code === '23505') {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya existe una supercategoría con ese nombre en este proyecto.' }) };
        }
        throw err;
      }
    }

    if (event.httpMethod === 'PUT') {
      try {
        const { id, name, color } = JSON.parse(event.body);
        if (!id || !name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID and Name are required' }) };

        // Verificar membresía (Case-Insensitive)
        const membership = await sql`SELECT 1 FROM user_projects WHERE LOWER(username) = LOWER(${userId}) AND project_id = ${projectId}`;
        if (membership.length === 0) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Permission denied. Not a project member.' }) };
        }

        const result = await sql`
          UPDATE category_groups 
          SET name = ${name}, color = ${color} 
          WHERE id = ${id} AND project_id = ${projectId}
          RETURNING *
        `;
        if (result.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not Found' }) };

        // Propagar color a categorías hijas
        await sql`
          UPDATE categories 
          SET color = ${color} 
          WHERE group_id = ${id} AND project_id = ${projectId}
        `;

        return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
      } catch (err) {
        console.error('Error in PUT category_groups:', err);
        if (err.code === '23505') {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya existe una supercategoría con ese nombre en este proyecto.' }) };
        }
        throw err;
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

      const result = await sql`
        DELETE FROM category_groups 
        WHERE id = ${id} AND project_id = ${projectId} 
        RETURNING *
      `;
      if (result.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not Found' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error in category_groups:', error);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
