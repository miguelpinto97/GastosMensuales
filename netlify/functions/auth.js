const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { getDb } = require('./utils/db');

// El Client ID de Google debe estar en las Variables de Entorno
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'dummy_client_id';
const client = new OAuth2Client(CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}
exports.handler = async (event) => {
    try {
        const headers = { 'Access-Control-Allow-Origin': '*' };
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }

        if (event.httpMethod !== 'POST') {
            return { statusCode: 405, headers, body: 'Method Not Allowed' };
        }

        const { token, action, username } = JSON.parse(event.body);
        const sql = getDb();

        // Verify Google Token
        let payload;
        try {
            if (CLIENT_ID === 'dummy_client_id' || CLIENT_ID === 'PON_AQUI_TU_CLIENT_ID_DE_GOOGLE') {
                // MODO SIMULADO (Para evadir la restricción temporal si no hay Google Client ID aun)
                // Decode simple (NO SEGURO, SOLO DEV)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                payload = JSON.parse(jsonPayload);
            } else {
                // MODO PRODUCCION: VERIFICAR CONTRA GOOGLE
                const ticket = await client.verifyIdToken({
                    idToken: token,
                    audience: CLIENT_ID,
                });
                payload = ticket.getPayload();
            }
        } catch (err) {
            console.error("Token verification failed:", err);
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid Google Token' }) };
        }

        const email = payload.email;

        if (action === 'SIGN_IN') {
            // Verificar si el correo ya existe en la DB
            const users = await sql`SELECT username, email, status FROM users WHERE email = ${email}`;

            if (users.length > 0) {
                // Usuario existe, generar JWT de sesión
                const user = users[0];
                const sessionToken = jwt.sign(
                    { username: user.username, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '7d' }  // 1 semana de sesión
                );

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        token: sessionToken,
                        user: { username: user.username, email: user.email }
                    })
                };
            } else {
                // Usuario NO existe, requiere registro
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        requiresRegistration: true,
                        email: email, // El front end usará este email para completar el registro
                        name: payload.name,
                        picture: payload.picture
                    })
                };
            }
        }

        if (action === 'COMPLETE_REGISTRATION') {
            if (!username) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username is required' }) };
            }

            // Validar formato de username (Alfanumérico, 6-20 chars)
            if (!/^[a-zA-Z0-9]{6,20}$/.test(username)) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username debe ser alfanumérico entre 6 y 20 caracteres.' }) };
            }

            // Verificar si el username ya está tomado
            const checkUser = await sql`SELECT username FROM users WHERE username = ${username}`;
            if (checkUser.length > 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username ya está en uso. Elige otro.' }) };
            }

            // Insertar nuevo usuario
            await sql`INSERT INTO users (username, email) VALUES (${username}, ${email})`;

            // Crear proyecto por defecto para el nuevo usuario
            const projectName = `Presupuesto de ${username}`;
            const [newProject] = await sql`INSERT INTO projects (name, created_by) VALUES (${projectName}, ${username}) RETURNING id`;
            await sql`INSERT INTO user_projects (username, project_id) VALUES (${username}, ${newProject.id})`;

            // Generar JWT
            const sessionToken = jwt.sign(
                { username: username, email: email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    token: sessionToken,
                    user: { username, email }
                })
            };
        }

        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };

    } catch (error) {
        console.error('Error in auth function:', error);
        return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
    }
};
