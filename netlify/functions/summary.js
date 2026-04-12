const { getDb } = require('./utils/db');
const { verifyToken } = require('./utils/auth');

exports.handler = async (event) => {
  try {
    const sql = getDb();
    const headers = { 
      'Access-Control-Allow-Origin': '*'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    const user = verifyToken(event);
    if (!user) {
       return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }) };
    }

    const projectId = event.headers['x-project-id'] || event.headers['X-Project-Id'];

    if (!projectId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Auth Header (X-Project-Id)' }) };
    }

    if (event.httpMethod === 'GET') {
      const monthParam = event.queryStringParameters.month; // 'YYYY-MM'
      
      if (!monthParam) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Month parameter (YYYY-MM) is required' }) };
      }

      const [year, month] = monthParam.split('-');

      // Total per Type (INGRESO, GASTO, AHORRO)
      const totalsByTypeResult = await sql`
        SELECT c.type, SUM(e.amount) as total 
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        WHERE EXTRACT(YEAR FROM e.date) = ${year} AND EXTRACT(MONTH FROM e.date) = ${month} AND e.project_id = ${projectId}
        GROUP BY c.type
      `;
      
      const totalsByType = {
        INGRESO: 0,
        GASTO: 0,
        AHORRO: 0
      };
      totalsByTypeResult.forEach(row => {
        totalsByType[row.type || 'GASTO'] = parseFloat(row.total);
      });

      // Calcular progreso del mes en días
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = new Date();
      let daysPassed = daysInMonth; // Asumir mes completado por defecto

      if (today.getFullYear() === parseInt(year) && (today.getMonth() + 1) === parseInt(month)) {
        daysPassed = today.getDate(); // Si es el mes actual, usar el día de hoy
      } else if (today.getFullYear() < parseInt(year) || (today.getFullYear() === parseInt(year) && (today.getMonth() + 1) < parseInt(month))) {
        daysPassed = 0; // Si es un mes futuro, han pasado 0 días
      }

      const monthProgressPercentage = (daysPassed / daysInMonth) * 100;

      // Expenses grouped by category with their budget and group info
      const byCategoryResult = await sql`
        SELECT 
          c.id, c.name, c.color, c.type, c.is_single_time, c.budget, 
          g.id as group_id, g.name as group_name, g.color as group_color,
          SUM(e.amount) as total
        FROM categories c
        LEFT JOIN category_groups g ON c.group_id = g.id
        LEFT JOIN expenses e ON c.id = e.category_id 
          AND EXTRACT(YEAR FROM e.date) = ${year} 
          AND EXTRACT(MONTH FROM e.date) = ${month}
          AND e.project_id = ${projectId}
        WHERE c.project_id = ${projectId}
        GROUP BY c.id, c.name, c.color, c.type, c.is_single_time, c.budget, g.id, g.name, g.color
        ORDER BY c.type DESC, total DESC
      `;

      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ 
          totalsByType,
          monthProgressPercentage,
          byCategory: byCategoryResult.map(r => ({ ...r, total: parseFloat(r.total || 0) }))
        }) 
      };
    }

    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Error in summary function:', error);
    return { 
      statusCode: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
