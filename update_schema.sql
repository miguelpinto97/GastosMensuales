-- Actualización a la tabla de Categorías para soportar tipos, frecuencia y presupuesto
-- TIPOS [type]: INGRESO, GASTO, AHORRO
-- ES ÚNICA VEZ [is_single_time]: TRUE (Fijo/Una vez) o FALSE (Variable/Acumulativo)
-- PRESUPUESTO [budget]: Monto planeado/proyectado

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'GASTO',
ADD COLUMN IF NOT EXISTS is_single_time BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS budget DECIMAL(10, 2) DEFAULT 0.00;

-- Borrar datos viejos (opcional si es db nueva, pero lo usaremos para resetear e insertar los correctos)
TRUNCATE TABLE categories CASCADE;

-- Insertar Conceptos de INGRESOS (is_single_time = TRUE)
INSERT INTO categories (name, color, type, is_single_time, budget) VALUES
('Saldo mes anterior', '#10b981', 'INGRESO', true, 0),
('Inyección Ahorros', '#059669', 'INGRESO', true, 0),
('Carro Marco David', '#34d399', 'INGRESO', true, 0),
('Tarjeta de Alimentos', '#6ee7b7', 'INGRESO', true, 0),
('Ingreso Sueldo', '#047857', 'INGRESO', true, 0),
('Servicios - Paola', '#14b8a6', 'INGRESO', true, 0),
('Servicios - Padres', '#0d9488', 'INGRESO', true, 0);

-- Insertar Conceptos de GASTOS (Una Sola Vez) (is_single_time = TRUE)
INSERT INTO categories (name, color, type, is_single_time, budget) VALUES
('Ayuno', '#ef4444', 'GASTO', true, 0),
('Diezmo', '#dc2626', 'GASTO', true, 0),
('Alquiler Depa (Mes Anterior)', '#b91c1c', 'GASTO', true, 0),
('Universidad + Matrícula (Dividida)', '#991b1b', 'GASTO', true, 0),
('Cuota Carro (Mes Anterior)', '#7f1d1d', 'GASTO', true, 0),
('Tarjeta de Crédito (BCP)', '#ef4444', 'GASTO', true, 0),
('Tarjeta de Crédito (Dinners)', '#dc2626', 'GASTO', true, 0),
('WIN', '#b91c1c', 'GASTO', true, 0),
('Entel', '#991b1b', 'GASTO', true, 0),
('Bitel', '#7f1d1d', 'GASTO', true, 0),
('Luz', '#f87171', 'GASTO', true, 0),
('Gas', '#fca5a5', 'GASTO', true, 0),
('Secadora', '#ef4444', 'GASTO', true, 0),
('Agua + Servicios Comunes', '#dc2626', 'GASTO', true, 0);

-- Insertar Conceptos de GASTOS (Se van acumulando) (is_single_time = FALSE)
INSERT INTO categories (name, color, type, is_single_time, budget) VALUES
('Transportes (Trabajo)', '#3b82f6', 'GASTO', false, 0),
('Transportes (Capilla)', '#2563eb', 'GASTO', false, 0),
('Transportes (Otros)', '#1d4ed8', 'GASTO', false, 0),
('Transportes (Templo)', '#1e40af', 'GASTO', false, 0),
('Gasolina / Estacionamiento', '#1e3a8a', 'GASTO', false, 0),
('Comida', '#f59e0b', 'GASTO', false, 0),
('Citas & Detalles', '#d97706', 'GASTO', false, 0),
('Reuniones / Salidas (Terceros)', '#b45309', 'GASTO', false, 0),
('Aseo', '#8b5cf6', 'GASTO', false, 0),
('Maquillaje', '#7c3aed', 'GASTO', false, 0),
('Salud (Citas Clínica / Pastillas)', '#ec4899', 'GASTO', false, 0),
('Psico', '#db2777', 'GASTO', false, 0),
('Michus', '#64748b', 'GASTO', false, 0),
('Otros', '#475569', 'GASTO', false, 0),
('Mal Cálculo', '#334155', 'GASTO', false, 0),
('Pendientes de Asignar', '#1e293b', 'GASTO', false, 0),
('Extras (Poco comunes)', '#0f172a', 'GASTO', false, 0);

-- Insertar AHORRO
INSERT INTO categories (name, color, type, is_single_time, budget) VALUES
('Ahorro', '#facc15', 'AHORRO', false, 0);
