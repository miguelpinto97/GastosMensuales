const { getDb } = require('./utils/db');
const { verifyToken } = require('./utils/auth');

exports.handler = async (event) => {
  try {
    const sql = getDb();
    const headers = { 'Access-Control-Allow-Origin': '*' };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const user = verifyToken(event);
    if (!user) {
       return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }) };
    }
    const username = user.username;

    if (event.httpMethod === 'GET') {
      // Traer los proyectos donde el usuario sea creador o invitado (tabla pivote)
      const result = await sql`
        SELECT p.id, p.name, p.created_by, p.created_at
        FROM projects p
        INNER JOIN user_projects up ON p.id = up.project_id
        WHERE up.username = ${username}
        ORDER BY p.created_at ASC
      `;

      return { statusCode: 200, headers, body: JSON.stringify(result) };
    }

    if (event.httpMethod === 'POST') {
        const data = JSON.parse(event.body);
        const { action, project_id, email, name, username: reqUser } = data; // reqUser solo para la busqueda

        // Acción: Compartir Proyecto (Agregar Miembro)
        if (action === 'SHARE') {
            if (!project_id || (!email && !username)) {
               return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing Data' }) };
            }

            // Buscar en la DB si el email pertenece a un usuario existente
            const invitee = await sql`SELECT username FROM users WHERE email = ${email} OR username = ${username} LIMIT 1`;
            if(invitee.length === 0) {
               return { statusCode: 404, headers, body: JSON.stringify({ error: 'El usuario no está registrado en la Plataforma' }) };
            }

            await sql`
               INSERT INTO user_projects (username, project_id) 
               VALUES (${invitee[0].username}, ${project_id})
               ON CONFLICT DO NOTHING
            `;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // Acción: Crear Proyecto Nuevo
        if (action === 'CREATE') {
            if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required' }) };
            
            const [newProject] = await sql`INSERT INTO projects (name, created_by) VALUES (${name}, ${username}) RETURNING id, name, created_by`;
            await sql`INSERT INTO user_projects (username, project_id) VALUES (${username}, ${newProject.id})`;
            
            return { statusCode: 201, headers, body: JSON.stringify(newProject) };
        }
    }

    if (event.httpMethod === 'DELETE') {
        const { action, project_id } = event.queryStringParameters;

        if (!project_id || !action) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing parameters' }) };
        }

        if (action === 'DELETE') {
            // El usuario debe ser el creador
            const [proj] = await sql`SELECT created_by FROM projects WHERE id = ${project_id}`;
            if (!proj || proj.created_by !== username) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Only the creator can delete the project' }) };
            }

            // ON DELETE CASCADE en Neon borrará los gastos y categorías amarradas a project_id y user_projects
            await sql`DELETE FROM projects WHERE id = ${project_id}`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Project deleted' }) };
        }

        if (action === 'LEAVE') {
            // Un asistente / invitado abandona el proyecto
            const [proj] = await sql`SELECT created_by FROM projects WHERE id = ${project_id}`;
            if (proj && proj.created_by === username) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'The creator cannot leave the project. Delete it instead.' }) };
            }

            await sql`DELETE FROM user_projects WHERE project_id = ${project_id} AND username = ${username}`;
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Left project' }) };
        }
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error in projects function:', error);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
