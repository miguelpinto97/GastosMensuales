-- Script para hacer que el concepto sea opcional en la base de datos
-- Ejecuta este script en el editor SQL de Neon

ALTER TABLE expenses ALTER COLUMN concept DROP NOT NULL;
