# Brújula

Organizador personal estático: tareas, agenda, ideas, proyectos, ventas y movimientos.

- Conserva el diseño y los datos locales de la versión anterior.
- Conexión opcional a Supabase con autenticación, RLS, guardado por versión y detección de conflictos.
- Avisos exportables en formato iCalendar; el usuario debe importarlos y comprobar los permisos de su calendario.
- Cambios de tareas preparados en ChatGPT mediante JSON, con revisión, confirmación y copia previa.
- Sin dependencias externas, claves secretas ni llamadas a APIs de IA.

**Estado:** web preparada; activación y pruebas reales de Supabase pendientes de acceso autorizado. El intercambio de tareas con ChatGPT es manual, no una conexión directa.

Consulta [SETUP.md](SETUP.md) para activar la cuenta, revisar las limitaciones y ejecutar las pruebas reales.

## Desarrollo y pruebas

Servir esta carpeta con un servidor HTTP estático. Ejecutar con Node.js:

```text
node tests/core.test.cjs
node tests/sync.test.cjs
node tests/app.test.cjs
```

Las pruebas de sincronización usan un servidor simulado. No acreditan el funcionamiento del servicio desplegado ni las políticas de una base de datos real. `supabase/tests/rls.sql` está preparado para ejecutarse en un proyecto de prueba después de aplicar la migración.

No añadir copias personales, tokens, contraseñas o archivos de entorno al repositorio.
