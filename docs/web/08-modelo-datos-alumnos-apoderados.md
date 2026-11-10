# Modelo de datos — Alumnos y apoderados

## Principio general
El sistema web reutiliza las tablas existentes del schema `buscontrol` que ya usa la app móvil y agrega una capa de administración desde el panel web. Los alumnos se gestionan como beneficiarios del servicio (alta y baja lógica/desactivación) mediante un registro propio de `buscontrol` que referencia al alumno del padrón; el padrón municipal `social_bus_escolar` se conserva como solo lectura y NO se edita desde la web.

## Tablas existentes reutilizadas

### Alumnos (padrón municipal, solo lectura)
- Tabla: `social_bus_escolar` (padrón municipal, fuente oficial)
- El web NO puede insertar ni editar directamente este padrón; es de solo lectura.
- El alumno se gestiona como beneficiario del servicio mediante una tabla propia de `buscontrol` (`bus_beneficiaries`) que referencia al alumno del padrón por su `student_id` (id del padrón); el `codigo` (ej. BU0098) solo se muestra, no se usa como clave foránea, sin modificar `social_bus_escolar`.

### Apoderados
- Tabla: `buscontrol.bus_guardians`
- Campos existentes: nombre completo, teléfono, teléfono normalizado, DNI, correo, usuario de autenticación vinculado, estado activo, notas, fechas de creación y actualización.
- El web permite: alta de un nuevo apoderado, edición de sus datos, búsqueda por nombre/teléfono/DNI, activar o desactivar.
- Ya existen datos cargados en esta tabla (migrados previamente).

### Vinculación alumno-apoderado
- Tabla: `buscontrol.bus_student_guardians`
- Campos existentes: identificador del alumno, identificador del apoderado, tipo de relación (por defecto "apoderado"), si es el apoderado principal, fecha de creación.
- El web permite: vincular un apoderado a uno o varios alumnos, desvincular, marcar cuál es el apoderado principal.
- Ya existen datos cargados en esta tabla (migrados previamente).

## Qué hace el módulo web de alumnos
- Buscar alumno por código, nombre o DNI en el padrón de solo lectura
- Ver qué apoderados tiene vinculados
- Ver qué códigos QR tiene asignados (ver archivo de modelo de datos QR)
- Marcar si el alumno está activo en el servicio de transporte (estado de beneficiario, alta/baja lógica en `bus_beneficiaries`, tabla propia de `buscontrol` que referencia al padrón por `student_id`; el `codigo` solo se muestra; `social_bus_escolar` no se modifica)

## Qué hace el módulo web de apoderados
- Dar de alta un apoderado nuevo
- Editar datos de contacto
- Buscar apoderados existentes
- Vincular o desvincular apoderados a alumnos
- Activar o desactivar un apoderado

## Decisión tomada
El estado activo/inactivo del alumno en el servicio de transporte escolar se registra en `bus_beneficiaries`, tabla propia de `buscontrol` que referencia al alumno del padrón por su `student_id` (id del padrón); el `codigo` solo se muestra, no se usa como clave foránea. Se implementa alta y baja lógica/desactivación cuando el alumno deja de ser beneficiario. El padrón municipal `social_bus_escolar` permanece solo lectura y no se edita desde la web.

## Decisiones de apoderados (migración 029)
- Desactivar un apoderado = `is_active = false`; el móvil le quita el acceso a sus hijos.
- Desvincular = borrar la fila de `bus_student_guardians` (sin columna de estado); queda en `admin_audit_log`.
- Un solo apoderado principal por alumno, impuesto por función.
- La web crea cuentas de padre desde la ficha del apoderado, mediante la Edge Function `guardian-account` (solo administrador con MFA completo): crea el usuario en Auth con una contraseña temporal que se muestra una vez y vincula `auth_user_id` con `link_guardian_account`. Desactivar el apoderado bloquea su acceso y reactivarlo lo devuelve. No se envía correo (R-C1 a R-C5). Un apoderado sin cuenta tiene `auth_user_id` NULL.
- Pendiente: revisar duplicados de DNI y teléfono en datos reales antes de decidir un índice único.
