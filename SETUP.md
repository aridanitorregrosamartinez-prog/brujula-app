# Brújula: activar la conexión privada

La web funciona en modo local sin contratar nada. El código de conexión está disponible, pero **no hay un proyecto Supabase conectado ni una prueba real de sincronización confirmada** en esta entrega. Los datos existentes no se han subido.

## Paso mínimo pendiente

Instala y autoriza la conexión **Supabase** en ChatGPT/Codex, o inicia sesión en [el panel de Supabase](https://supabase.com/dashboard). Con esa autorización se podrá comprobar si existe un proyecto adecuado, su plan y ejecutar la instalación. No pegues contraseñas, tokens de administración ni claves `service_role` en el chat ni en GitHub.

## Instalación del backend (una sola vez)

1. Utiliza una organización en plan **Free** y un proyecto dedicado a Brújula. Si no hay capacidad gratuita disponible, detente: no cambies a Pro, no añadas tarjeta ni contrates ampliaciones. El plan Free tiene límites y puede pausar proyectos inactivos.
2. Ejecuta `supabase/migrations/202610190001_brujula.sql` en el editor SQL de ese proyecto. El script crea una tabla aislada por usuario y una función de guardado con comprobación de versión. No contiene datos personales ni claves. Es una migración de ejecución única; no debe ejecutarse sobre una instalación ya existente.
3. En Authentication, habilita Email con confirmación de correo. Configura la URL del sitio como `https://aridanitorregrosamartinez-prog.github.io/brujula-app/`. La cuenta debe estar confirmada antes de iniciar sesión. El servicio de correo de prueba tiene restricciones; si no envía a tu dirección, crea/invita tu propio usuario desde el panel con un flujo de confirmación permitido o configura un proveedor de correo gratuito verificado. No desactives la confirmación para resolver el problema sin revisar la configuración.
4. Obtén la **Project URL** y la clave **publishable** del panel. Son configuración pública, no claves administrativas. En Brújula → Ajustes → Configurar la conexión, introdúcelas. Nunca uses `service_role`, `sb_secret_…` ni la contraseña de PostgreSQL.
5. Crea una cuenta de Brújula o inicia sesión con una cuenta ya confirmada. Se usa correo y contraseña; la contraseña se envía solo a tu proyecto mediante HTTPS y no se guarda en Brújula. La sesión se conserva únicamente en la pestaña.
6. En el dispositivo que tiene los datos originales, marca el consentimiento y pulsa **Subir este dispositivo**. Se descarga una copia previa y solo se permite subir si la cuenta está vacía.
7. En el segundo dispositivo, configura el mismo proyecto e inicia sesión con la misma cuenta. Marca el consentimiento y elige **Descargar los datos de la cuenta**. Guarda la copia previa: se reemplaza la vista local, sin borrar la copia descargada.

## Prueba real necesaria antes de dar la sincronización por verificada

- Crea una tarea de prueba en PC y comprueba que aparece en móvil al abrir Brújula o pulsar Sincronizar ahora. Complétala en móvil y comprueba el cambio en PC.
- Desconecta la red, crea otra tarea y recupera la conexión: el dato debe conservarse y sincronizarse.
- Modifica tareas distintas desde ambos dispositivos: deben combinarse. Modifica la misma tarea de forma incompatible: debe aparecer el aviso de conflicto sin sobrescritura automática. Descarga ambas copias antes de resolver.
- Prueba con **dos usuarios distintos**: cada uno solo debe poder leer su fila; una llamada sin sesión debe estar denegada. `supabase/tests/rls.sql` contiene comprobaciones transaccionales para un proyecto de prueba. Además verifica el acceso por la API con sesiones reales A y B.
- No marques una prueba como superada si no se ha ejecutado. Las pruebas automáticas incluidas usan datos ficticios; no sustituyen estas pruebas reales.

## Calendario

Desde Agenda puedes descargar un `.ics` con alarmas de 0, 5, 15, 30, 60 minutos o 1 día. Importa el archivo y revisa que tu calendario conserva el aviso y tiene permiso para notificar. Algunos calendarios ignoran alarmas importadas o duplican eventos al volver a importar. No es una suscripción ni una sincronización bidireccional. El enlace Google Calendar permite revisar y guardar una cita, pero no la guarda automáticamente. No se crearon eventos reales del usuario durante esta actualización.

## Tareas desde ChatGPT, sin API de pago

En Ajustes, pulsa **Preparar tareas para ChatGPT**. El archivo contiene solo tareas, no la sección Dinero, ventas, ideas ni proyectos. Revísalo antes de adjuntarlo. Pide los cambios y pega el JSON de respuesta en Brújula. **Revisar cambios** muestra qué va a ocurrir; **Aplicar cambios revisados** pide confirmación y descarga una copia previa.

El formato permite crear, editar y completar tareas. No elimina registros. Cada edición/completado incluye la tarea original en `before`, para rechazar cambios sobre datos desactualizados. Las aplicaciones repetidas se rechazan por id o por versión previa. No se ejecuta código procedente del chat.

Una integración directa requiere un conector o acción con autenticación autorizada. No está configurada ni verificada. No se debe usar GitHub Issues, un archivo público, la clave `service_role` o una URL con secretos para gestionar estas tareas. La disponibilidad de acciones/conectores depende de la cuenta; no se contratará un plan para activarlos.

## Seguridad y recuperación

- GitHub Pages solo publica código. La base de datos y las copias personales no se guardan en el repositorio.
- RLS limita lecturas al usuario; escrituras pasan por `brujula_save`, que usa `auth.uid()` y una versión esperada. No acepta un identificador de propietario enviado por el cliente.
- Se conserva la clave local original `brujula_personal_v2`. La actualización no migra automáticamente a la nube. Si el almacenamiento local es ilegible, se impide sobrescribirlo y se permite descargar el original.
- No se cachean respuestas de autenticación o del backend. El modo sin red conserva únicamente la aplicación pública y los datos locales existentes.
- Al cerrar sesión, la copia local permanece. No utilices un dispositivo compartido sin considerar que otro usuario del navegador podría leerla.
- Las copias locales y Supabase no constituyen cifrado de extremo a extremo. Protege tu cuenta y el dispositivo.
- No abras varias pestañas para editar a la vez: se detecta el cambio local y se pide recargar para evitar pérdidas.
- La última copia previa puede descargarse desde Ajustes. Las copias descargadas anteriores permanecen en tu carpeta de descargas.

## Referencias oficiales

- [Supabase Free y límites](https://supabase.com/pricing)
- [Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Claves públicas y secretas](https://supabase.com/docs/guides/getting-started/api-keys)
- [Autenticación para acciones de GPT](https://developers.openai.com/api/docs/actions/authentication)
