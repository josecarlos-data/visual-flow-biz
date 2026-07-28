## Qué he comprobado

He intentado descargar el enlace que me has pasado sin autenticación: la API pública de OneDrive responde `User migrated / generalException` y el enlace directo devuelve la página de login. Es decir, **al ser un archivo de SharePoint corporativo protegido con contraseña, no se puede leer con un simple enlace**: hace falta autenticación real contra Microsoft. La contraseña del enlace sirve para un navegador humano, no para la app.

La solución correcta es conectar la cuenta de Microsoft de RIMOSA mediante el conector oficial (OAuth), que da acceso al archivo sin exponer credenciales y refresca los tokens solo.

## Plan

### 1. Conexión a Microsoft (OneDrive / SharePoint)
- Lanzar el conector de Microsoft OneDrive y hacer login con la cuenta que tiene el archivo (info3@rimosa.com) o con una cuenta que lo tenga compartido. Es un OAuth de Microsoft: la app solo recibe permiso de lectura de archivos, no la contraseña.
- Una vez conectado, listar los archivos, localizar el Excel y guardar su identificador.

### 2. Inspección real del Excel
- Leer las hojas del libro (nombres, cabeceras y una muestra de filas) para saber exactamente qué campos hay: ventas, clientes, productos y visitas.
- Con eso te presento un resumen de la información disponible antes de tocar nada más — ahí decidimos cómo rediseñar el panel de ventas.

### 3. Sincronización automática
- Reescribir la función `sync-onedrive` para que lea el fichero a través del conector (Microsoft Graph) en lugar de por enlace público, mapeando cada hoja a su tabla (`clientes`, `ventas_mensuales`, `productos`, `visitas`).
- Pantalla de administración con: archivo/hoja configurados, botón "Sincronizar ahora", fecha y resultado de la última sincronización, y registro de errores.
- Programar la sincronización diaria automática.
- La carga manual por Excel se mantiene como respaldo.

### 4. Accesos por perfil
- Dejar **Compras** fuera del alcance de los comerciales: por defecto, un usuario nuevo con rol comercial recibirá acceso a Ventas, Clientes, Agenda y Visitas; Compras queda solo para administración.
- Aplicar esa asignación a las cuentas de comercial existentes desde la pantalla de Administración → Usuarios.

### 5. Asistente IA
- Icono flotante presente en toda la app que abre un panel de chat.
- Consciente del contexto: si estás en la ficha de un cliente, responde sobre ese cliente (ventas, productos, visitas); si no, responde sobre la cartera visible según los permisos del usuario.
- Funciona sobre los datos que el usuario puede ver (respeta el filtro por rol/delegación).

## Detalles técnicos

- Conector: `microsoft_onedrive` (gateway de Lovable, tokens OAuth renovados automáticamente). Llamadas solo desde funciones de servidor, nunca desde el navegador.
- Lectura del libro con Microsoft Graph (`/me/drive/items/{id}/workbook/...`), paginando rangos para evitar timeouts en hojas grandes.
- Nuevo edge function `crm-assistant` usando la IA de Lovable, con las consultas a la base de datos ejecutadas bajo la sesión del usuario para respetar RLS.

## Siguiente paso

Al aprobar, lo primero será abrirte la tarjeta de conexión de Microsoft para que autorices la cuenta; sin ese paso no puedo leer el Excel.
