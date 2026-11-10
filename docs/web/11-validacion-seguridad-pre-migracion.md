# Validación previa y huecos de seguridad detectados

Este documento recoge la verificación hecha sobre el código y las migraciones reales del repositorio antes de redactar el SQL de las migraciones 025, 026 y 027. Los dos bloqueadores se resolvieron (ver sección Estado al final) y las migraciones ya están redactadas, sin aplicar.

## BLOQUEADOR 1 — El código QR que escanea el móvil no vive en una tabla propia

### Evidencia
En el archivo de servicio de alumnos de la app móvil, la búsqueda de un alumno por código consulta directamente el padrón municipal: filtra la tabla `social_bus_escolar` por el campo `codigo` y exige que el alumno no esté inactivo. El script Python de carnets usa exactamente el mismo valor como contenido del QR (el campo `codigo` del padrón, normalizado en mayúsculas).

### Consecuencia
Si el sistema web genera un código nuevo (por ejemplo BU0100) y lo guarda solo en una tabla nueva `qr_codes`, la app móvil NO lo reconocerá al escanearlo, porque la app busca ese valor en el padrón municipal, no en la tabla nueva. El carnet impreso no funcionaría.

Esto afecta de forma directa a la función de "renovación de QR": renovar implica un código distinto, y un código distinto no existe en el padrón.

### Opciones para resolverlo
1. El código del QR sigue siendo siempre el `codigo` del padrón municipal. La tabla `qr_codes` solo registra emisiones, estados e historial de impresión, pero no cambia el valor escaneado. La "renovación" significa reimprimir el carnet, no cambiar el código. No requiere tocar la app móvil.
2. Se modifica la app móvil para que, al escanear, primero busque el código en `buscontrol.qr_codes` y de ahí obtenga el alumno. Permite códigos nuevos y revocación real, pero obliga a publicar una versión nueva de la app móvil y a mantener compatibilidad con los carnets ya impresos.
3. Se coordina con el área de TI del municipio para poder escribir el campo `codigo` en el padrón municipal. Esto rompe el principio de que el padrón es de solo lectura y no se recomienda.

### Recomendación
Opción 1 para empezar. Es la única que no obliga a cambiar la app móvil ni a escribir en el padrón municipal. La tabla `qr_codes` se mantiene como registro de emisiones y auditoría, no como fuente del valor escaneado.

## BLOQUEADOR 2 — El rol administrador quedaría sin acceso de lectura al padrón

### Evidencia
La política de seguridad a nivel de fila del padrón municipal permite leer solo a los roles chofer, asistenta y coordinador. Existe una segunda política que permite a un apoderado leer únicamente a los alumnos vinculados a él. Cualquier otro rol obtiene cero filas.

### Consecuencia
Al agregar el valor `administrador` al enum de roles, ese usuario NO podrá leer el padrón municipal. El módulo de alumnos y el de generación de QR quedarían vacíos, sin error visible, simplemente sin resultados.

### Qué hace falta
Agregar una política de lectura del padrón para el rol administrador. El problema es que el padrón vive en un schema compartido con el sistema municipal, y las migraciones anteriores dejan constancia de que los cambios en esa tabla deben coordinarse con el área de TI del municipio.

### Recomendación
Incluir la política en la migración, pero marcarla como un paso que requiere aviso previo al área de TI municipal antes de ejecutarse en producción.

## Huecos de seguridad detectados (a cubrir en el diseño de las migraciones)

### 1. Suplantación del usuario que genera el código
Si se permite insertar directamente en la tabla de códigos QR desde el cliente, un usuario podría enviar un valor falso en el campo que indica quién generó el código, falseando la auditoría.

Mitigación: no crear política de inserción directa. Toda inserción debe pasar por una función de base de datos con privilegios elevados que derive el usuario desde la sesión del servidor, igual que ya se hace en el repositorio con el registro de asistencia y la publicación de ubicación.

### 2. Lectura de códigos QR por roles que no deberían verlos
Si la política de lectura permite a todos los roles autenticados leer la tabla completa de códigos, un apoderado podría listar los códigos de todos los alumnos del municipio.

Mitigación: lectura restringida. El administrador lee todo. Los operadores de ruta leen todo (lo necesitan para validar escaneos). Un apoderado solo puede leer los códigos de los alumnos vinculados a él, usando la función de verificación de vínculo que ya existe en el repositorio.

### 3. La tabla nueva no hereda la revocación de acceso anónimo
Una migración anterior revoca el acceso de lectura del rol anónimo a todas las tablas del schema operativo, pero esa revocación aplica a las tablas que existían en ese momento. Una tabla creada después no queda cubierta.

Mitigación: incluir explícitamente la revocación del acceso anónimo sobre la tabla nueva dentro de su propia migración.

### 4. Carnets dados de baja siguen funcionando sin conexión
La app móvil mantiene una caché local de alumnos y de la lista de pasajeros para operar sin red. Si un carnet se da de baja desde la web, un operador sin conexión podría seguir validándolo hasta que la caché se refresque.

Mitigación: aceptar esta ventana como limitación conocida y documentarla, o definir un tiempo máximo de validez de la caché. No se resuelve desde la base de datos.

### 5. Condición de carrera al generar códigos secuenciales
Si dos generaciones simultáneas calculan el siguiente código disponible leyendo el máximo actual, ambas pueden obtener el mismo valor. La restricción de unicidad evitaría el dato duplicado, pero una de las dos operaciones fallaría de forma inesperada para el usuario.

Mitigación: generar el número desde una secuencia de base de datos o tomar un bloqueo antes de calcular el siguiente valor. Esto solo aplica si finalmente se decide generar códigos nuevos (ver bloqueador 1).

### 6. Escalada de privilegios al crear el usuario administrador
Existe un disparador que impide que un usuario modifique su propio rol o su estado activo desde el cliente, con excepción del rol de servicio. Por lo tanto, el primer usuario administrador no puede crearse desde la web: debe asignarse manualmente con privilegios de servicio.

Mitigación: documentar que la creación del administrador es un paso manual en el panel de Supabase, no una función de la aplicación web.

### 7. El rol administrador no debe heredar permisos operativos
La función que identifica a un operador activo devuelve verdadero solo para chofer, asistenta y coordinador. Agregar el rol administrador al enum no le otorga automáticamente permisos para iniciar viajes ni registrar asistencia, lo cual es correcto y debe mantenerse así.

Verificado: las funciones existentes que validan rol usan listas explícitas (`NOT IN ('chofer','coordinador')`, `IN ('chofer','asistenta','coordinador')`), por lo que el nuevo rol queda excluido y falla cerrado (iniciar y cerrar viaje, anular registros, historial de operador, lectura del padrón, `is_active_operator`). En la app móvil, `getCapabilitiesForRole` devuelve permisos nulos para cualquier rol desconocido. Un administrador que inicie sesión en el móvil no podría operar. Pendiente menor: el tipo `AppRole` del móvil no incluye `administrador`; no rompe nada en ejecución.

## Restricción técnica de ejecución

Agregar un valor nuevo a un tipo enumerado en PostgreSQL no permite usar ese valor nuevo dentro de la misma transacción en la que se agregó. Por lo tanto la migración que agrega el rol administrador y la migración que crea la tabla de códigos QR con políticas que referencian ese rol deben ser dos archivos separados, ejecutados en dos transacciones distintas y en ese orden.

## Estado

DECIDIDO: bloqueador 1 → opción 1 (el código impreso es el `codigo` del padrón; `qr_codes` es historial de emisiones; renovar = reimprimir). La opción 2 queda como evolución futura.

Migraciones 025 (`supabase/migrations/`), 026 a 029 (`supabase/pending/`) ensayadas en Docker local, sin aplicar en producción (ver 10-migracion-sql-qr-y-rol.md). La política del padrón (027) sigue pendiente de aviso a TI SIGEM. Huecos abiertos de 029: duplicados de DNI y teléfono en datos reales (revisar con `supabase/tests/check_duplicados_apoderados.sql` antes de cualquier índice UNIQUE). Grants sobrantes de `anon` y de `authenticated` sobre `bus_guardians` y `bus_student_guardians`: se quitan con la 030.

El hueco 5 (carrera en códigos secuenciales) ya no aplica: no se generan códigos nuevos.
