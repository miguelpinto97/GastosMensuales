-- ==========================================
-- ACTUALIZACIÓN SCHEMA: GRUPOS DE CATEGORÍAS
-- ==========================================

-- 1. Crear tabla de Grupos de Categorías
CREATE TABLE IF NOT EXISTS category_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#3b82f6',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by VARCHAR(20) REFERENCES users(username) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agregar columna group_id a la tabla de categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES category_groups(id) ON DELETE SET NULL;

-- 3. (Opcional) Índices para mejorar rendimiento en búsquedas por proyecto/usuario
CREATE INDEX IF NOT EXISTS idx_category_groups_project ON category_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_categories_group ON categories(group_id);
