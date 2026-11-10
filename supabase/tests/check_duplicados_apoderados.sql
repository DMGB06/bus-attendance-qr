-- Solo lectura. Correr en PRODUCCION antes de cualquier indice UNIQUE sobre
-- bus_guardians (dni, telefono) o bus_student_guardians (alumno, apoderado principal).
-- Si devuelve filas, hay que resolver los duplicados antes de crear el indice.

-- DNI repetido
SELECT 'dni' AS tipo, dni AS valor, count(*) AS veces, array_agg(id) AS ids
FROM buscontrol.bus_guardians
WHERE dni IS NOT NULL AND trim(dni) <> ''
GROUP BY dni
HAVING count(*) > 1;

-- Telefono normalizado repetido
SELECT 'telefono' AS tipo, phone_normalized AS valor, count(*) AS veces, array_agg(id) AS ids
FROM buscontrol.bus_guardians
WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
GROUP BY phone_normalized
HAVING count(*) > 1;

-- Mismo apoderado vinculado dos veces al mismo alumno
SELECT 'vinculo_duplicado' AS tipo, student_id::text || ' / ' || guardian_id::text AS valor, count(*) AS veces
FROM buscontrol.bus_student_guardians
GROUP BY student_id, guardian_id
HAVING count(*) > 1;

-- Alumnos con mas de un principal
SELECT 'mas_de_un_principal' AS tipo, student_id::text AS valor, count(*) AS veces
FROM buscontrol.bus_student_guardians
WHERE is_primary
GROUP BY student_id
HAVING count(*) > 1;

-- Apoderados sin telefono (informativo, no bloquea nada)
SELECT 'sin_telefono' AS tipo, count(*) AS veces
FROM buscontrol.bus_guardians
WHERE phone_normalized IS NULL OR phone_normalized = '';
