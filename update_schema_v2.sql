-- ==========================================
-- ACTUALIZACIÓN SCHEMA MULTI-USUARIO V2
-- ==========================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(20) UNIQUE NOT NULL CHECK (length(username) >= 6),
    email VARCHAR UNIQUE NOT NULL,
    status INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Proyectos
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    created_by VARCHAR(20) REFERENCES users(username) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Compartir (User <-> Projects pivot)
CREATE TABLE IF NOT EXISTS user_projects (
    username VARCHAR(20) REFERENCES users(username) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (username, project_id)
);

-- INSERCIÓN USUARIO SEMILLA Y PROYECTO CREADO
INSERT INTO users (username, email) 
VALUES ('MPINTO', 'miguelpintosdev@gmail.com')
ON CONFLICT (username) DO NOTHING;

-- INSERTAMOS PROYECTO PRINCIPAL DE CONFLICTO / DEV
-- Usaremos una función DO block segura
DO $$ 
DECLARE 
    demo_project_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Presupuesto Familiar' AND created_by = 'MPINTO') THEN
        INSERT INTO projects (name, created_by) VALUES ('Presupuesto Familiar', 'MPINTO') RETURNING id INTO demo_project_id;
        INSERT INTO user_projects (username, project_id) VALUES ('MPINTO', demo_project_id);
    END IF;
END $$;


-- ==========================================
-- MIGRAMOS CATEGORÍAS Y GASTOS (Asignando el proyecto Semilla para compatibilidad)
-- ==========================================
-- Si las tablas no existen (entorno virgen), se crearán
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    color VARCHAR DEFAULT '#000000',
    type VARCHAR DEFAULT 'GASTO',
    is_single_time BOOLEAN DEFAULT FALSE,
    budget DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    concept VARCHAR NOT NULL,
    date DATE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ALTERAMOS ESTRUCTURA PARA AGREGAR PROYECTO
ALTER TABLE categories ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) REFERENCES users(username) ON DELETE SET NULL;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) REFERENCES users(username) ON DELETE SET NULL;

-- Asignar Registros Huérfanos al Proyecto 'Presupuesto Familiar' de 'MPINTO'
DO $$ 
DECLARE 
    fallback_project_id UUID;
BEGIN
    SELECT id INTO fallback_project_id FROM projects WHERE name = 'Presupuesto Familiar' LIMIT 1;
    
    UPDATE categories SET project_id = fallback_project_id, created_by = 'MPINTO' WHERE project_id IS NULL;
    UPDATE expenses SET project_id = fallback_project_id, created_by = 'MPINTO' WHERE project_id IS NULL;
END $$;


-- Hacer Campos NO NULOS
ALTER TABLE categories ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE categories ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN created_by SET NOT NULL;
