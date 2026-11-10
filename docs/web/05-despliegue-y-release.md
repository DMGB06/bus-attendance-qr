# Despliegue y release

## Plataforma
El sistema web se despliega en Vercel.

## Variables de entorno
Se requieren la URL de Supabase y la clave anónima pública, igual que la app móvil.

## Orden de despliegue
1. Probar 025 a 029 en un proyecto Supabase de pruebas con un usuario de cada rol
2. En producción: respaldar la base y ejecutar 025 sola; luego 026; luego 027 solo después de avisar a TI SIGEM; luego 028, 029 y 030 (ver documento 10)
3. Crear el usuario administrador en Supabase Auth y asignarle `app_role = 'administrador'` manualmente con privilegios de servicio (el trigger de protección impide hacerlo desde la aplicación)
4. Desplegar la aplicación Next.js en Vercel

Variables de entorno: solo la URL y la clave anónima. La clave `service_role` NO debe usarse en las Server Actions de carnets: las funciones de base de datos identifican al administrador con `auth.uid()`, que con `service_role` sería nulo.

## Compatibilidad con el móvil
La aplicación móvil sigue funcionando normalmente durante y después del despliegue del web. Ambos sistemas coexisten sin interrupciones.

## Rollback
- Código web: se puede desplegar una versión anterior en Vercel o deshabilitar el dominio
- Base de datos: `027_rollback.sql` revierte 026 y 027; borra el historial de carnets y la auditoría (irreversible para esos datos). `028_rollback.sql` borra el estado de alta y baja de todos los beneficiarios (irreversible para esos datos). `029_rollback.sql` quita las funciones y políticas de apoderados; no borra apoderados ni vínculos. `030_rollback.sql` restaura los grants quitados (sin pérdida de datos). El valor `administrador` del enum no se puede quitar, pero queda inerte si no se asigna

## Dominio
Decidido: solo Vercel, con el dominio por defecto `*.vercel.app`. Un dominio municipal propio queda como mejora futura.
