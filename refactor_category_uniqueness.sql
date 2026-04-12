-- 1. Eliminar la restricción actual de nombre único (si existe)
-- Nota:categories_name_key es el nombre por defecto dado por Postgres
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- 2. Crear índice único para casos CON supercategoría
-- Permite que "Comida" exista en "Grupo A" y "Comida" en "Grupo B" del mismo proyecto
CREATE UNIQUE INDEX IF NOT EXISTS categories_project_group_name_idx 
ON categories (project_id, group_id, name) 
WHERE group_id IS NOT NULL;

-- 3. Crear índice único para casos SIN supercategoría
-- Solo permite un "Comida" sin grupo por proyecto
CREATE UNIQUE INDEX IF NOT EXISTS categories_project_none_name_idx 
ON categories (project_id, name) 
WHERE group_id IS NULL;
