-- Sincronizar colores de categorías con los colores de sus grupos (SuperCategorías)
UPDATE categories c
SET color = g.color
FROM category_groups g
WHERE c.group_id = g.id;
