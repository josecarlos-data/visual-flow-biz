## Punto de partida (verificado en la base)

- `clientes.ruta` está vacía; la ruta real del ERP está en `clientes.ruta_comercial` (262 rutas, p.ej. GU0MO 621 clientes, AL0MO 521).
- `clientes.direccion`, `localidad`, `cod_postal` y `provincia` están vacíos en los 11.592 clientes (no se cargaron en el último import) → hoy no hay dirección postal para el mapa.
- Sí hay coordenadas: `visitas` tiene 13.476 registros con latitud/longitud, que cubren **1.365 clientes distintos**. Esa es la fuente de geoposición de la fase 1.
- `visitas_planificadas` ya existe (agenda) y está vacía. La tabla `rutas` existe pero está vacía.

## Concepto

La ruta comercial del ERP es la base. El comercial entra en **Rutas**, ve sus rutas, abre una y trabaja sobre la lista de clientes: ve de un vistazo quién sube/baja, lanza acciones y vuelca la ruta a su agenda del día. Nada se cierra: puede quitar clientes del día, añadir otros o posponer.

## Fase 1 — Lo que se construye

**1. Datos**
- Rellenar `clientes.ruta` desde `ruta_comercial` (una sola pasada) y usar `ruta` como campo único de ruta en toda la app, para no duplicar lógica.
- Nuevas columnas `latitud`/`longitud` en `clientes` + función que las siembra con la última visita geolocalizada de cada cliente (1.365 clientes de salida). A partir de ahí, cada visita nueva con GPS actualiza el cliente si aún no tiene coordenadas.
- Nuevo RPC `rutas_visibles()`: devuelve las rutas del usuario (según sus permisos actuales) con nº de clientes, importe año actual vs año anterior YTD, clientes sin visitar en X días y cuántos tienen geoposición.
- Nuevo RPC `ruta_clientes(_ruta)`: clientes de la ruta con nombre, importe actual/anterior, tendencia, días sin comprar, última visita, situación especial y coordenadas.
- Registro del dashboard `rutas` para que el admin lo asigne por usuario como el resto.

**2. Listado de rutas** (`/rutas`)
Tarjetas por ruta: código, nº de clientes, ventas del año vs anterior con flecha de tendencia, y cuántos clientes llevan más de N días sin visita. Buscador por código.

**3. Ficha de ruta** (`/rutas/:codigo`)
- Cabecera con totales de la ruta y dos acciones principales: **Abrir en Google Maps** y **Planificar día**.
- Lista de clientes con: nombre, código, importe año actual vs anterior, indicador de tendencia sobrio (▲ crece / ▬ estable / ▼ baja, umbral ±5 %), días desde la última compra y desde la última visita, badge de situación especial (concurso, caída justificada…) reutilizando `SituacionBadge`, e icono de "sin geoposición".
- Orden configurable: por importe, por tendencia (primero los que caen) o por días sin visitar.
- Menú de acción por cliente: **Programar visita** (a la agenda, con fecha), **Registrar visita ahora** (va a `/visitas/nueva` con el cliente precargado), **Ver ficha**, **Llamar** (si hay teléfono).

**4. Volcar ruta a la agenda**
Diálogo "Planificar día": fecha, motivo de visita y selección de clientes (todos marcados por defecto, se desmarcan los que no interesan). Crea las `visitas_planificadas` del día respetando el orden elegido. Si ya hay planificadas de esa ruta y fecha, no se duplican.

**5. Mapa / navegación**
Botón que abre Google Maps en una pestaña nueva con las paradas geolocalizadas de la ruta (o de los clientes marcados), usando la URL pública de direcciones — sin API key ni conector. Se limita a 9 paradas por enlace (límite de Google) y, si hay más, se ofrece por tramos. Los clientes sin coordenadas se listan aparte con un aviso "sin geoposición".

**6. Cliente potencial / no creado**
En la ficha de ruta y en la agenda se permite añadir una parada como **cliente potencial** (solo nombre y localidad), que ya está soportada en `visitas.cliente_externo`. Cuando el jefe de zona revisa la visita, podrá vincularla al código de cliente definitivo una vez creado en el ERP — esto lo añado como campo en la pantalla de revisión.

## Mejoras que propongo (incluidas)

- **Geoposicionamiento progresivo**: cada visita registrada con GPS rellena las coordenadas del cliente si faltan. En pocas semanas la cobertura sube sola sin depender del ERP.
- **Semáforo de atención en vez de "en negativo"**: en lugar de un rojo genérico, el indicador combina caída de ventas + días sin visita, y respeta las situaciones justificadas ya implementadas.
- **Contador "sin visitar hace X"** por ruta, que es lo que realmente decide qué ruta hacer mañana.
- Sin pedidos ni depósitos en esta fase (no hay datos de pedidos en el CRM todavía).

## Detalles técnicos

- Migración: `UPDATE clientes SET ruta = ruta_comercial`, `ALTER TABLE clientes ADD latitud/longitud numeric`, función de siembra desde `visitas`, RPCs `rutas_visibles()` y `ruta_clientes(_ruta)` como `SECURITY DEFINER` filtradas por `clientes_permitidos(auth.uid())`, con `GRANT EXECUTE` solo a `authenticated`. Alta del dashboard `rutas` en `dashboards`.
- Frontend: `src/pages/Rutas.tsx`, `src/pages/RutaDetalle.tsx`, hooks `useRutas`, `useRutaClientes`, `usePlanificarRuta` en `src/hooks/useCrm.ts`, helper `src/lib/maps.ts` para construir el enlace de Google Maps. Entrada en `AppSidebar` y rutas en `App.tsx` protegidas por `dashboardKey="rutas"`.
- Diseño mobile-first (el comercial va en coche): tarjetas grandes, acciones al alcance del pulgar, formato es-ES ya existente.
