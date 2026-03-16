-- Ejecuta este script en el editor SQL de Neon para crear las tablas necesarias

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#000000',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  concept VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos de ejemplo opcionales
INSERT INTO categories (name, color) VALUES 
('Comida', '#ef4444'),
('Transporte', '#3b82f6'),
('Entretenimiento', '#10b981'),
('Hogar', '#f59e0b'),
('Otros', '#6b7280') ON CONFLICT (name) DO NOTHING;
