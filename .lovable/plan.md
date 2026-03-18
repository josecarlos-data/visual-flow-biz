
## Plan: Correccion de datos, filtrado por rol y mejoras visuales del Dashboard

### Problemas identificados

1. **Datos incompletos**: La tabla `clientes` tiene 3.227 registros y `ventas_mensuales` tiene 29.708. Las consultas sin limite solo devuelven 1.000 filas (limite por defecto), por lo que faltan datos en el dashboard y los filtros salen incompletos.

2. **Comercial ve todos los clientes**: El usuario `josecarlosrimosa@gmail.com` (rol `comercial`, vendedor `J. Antonio Bautista`) ve todos los clientes en lugar de solo los suyos. El hook `useHistoricoData` no filtra automaticamente segun el vendedor asignado al perfil del usuario.

3. **Leyenda superpuesta en graficos**: En `SalesChart`, la leyenda de Recharts se superpone con las etiquetas del eje X rotadas.

4. **Filtros limitados para admin**: `useVendedores` y `useDelegaciones` traen todos los registros de `clientes` (max 1000) y deduplicaban en el cliente. Al haber 3.227 registros, los resultados salen truncados.

5. **Nuevas funcionalidades solicitadas**: histograma comparativo mensual con lineas por anio, y filtros de anios/meses.

---

### Cambios planificados

#### 1. Corregir limite de 1000 filas en todas las consultas

**Archivo: `src/hooks/useHistoricoData.ts`**

- Modificar la consulta de `clientes` para paginar en bloques (igual que ya se hace con `ventas_mensuales`), asegurando que se traen los 3.227 registros completos.
- Para `useVendedores` y `useDelegaciones`: crear una funcion RPC en la base de datos que devuelva valores distintos directamente, evitando traer miles de filas duplicadas.

**Migracion SQL**: Crear dos funciones de base de datos:
```sql
CREATE OR REPLACE FUNCTION get_distinct_vendedores()
RETURNS TABLE(vendedor text) AS $$
  SELECT DISTINCT vendedor FROM clientes 
  WHERE vendedor IS NOT NULL ORDER BY vendedor;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_distinct_delegaciones()
RETURNS TABLE(delegacion text) AS $$
  SELECT DISTINCT delegacion FROM clientes 
  WHERE delegacion IS NOT NULL ORDER BY delegacion;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Actualizar `useVendedores` y `useDelegaciones` para llamar a estas funciones RPC.

#### 2. Filtrado automatico por rol del usuario

**Archivo: `src/hooks/useHistoricoData.ts`**

- Aceptar parametros adicionales: `userVendedor` (el `employee_code` del perfil) y `userDelegacion`.
- Si el rol es `comercial`, filtrar automaticamente por `vendedor = employee_code`.
- Si el rol es `jefe_de_zona`, filtrar por `delegacion = profiles.delegacion`.

**Archivo: `src/pages/Dashboard.tsx`**

- Pasar el `employee_code` y `delegacion` del perfil del usuario al hook.
- Ampliar `useAuth` para exponer `employeeCode` y `delegacion` del perfil (o hacer una consulta adicional en el Dashboard).

**Archivo: `src/hooks/useAuth.tsx`**

- Incluir `employee_code` y `delegacion` en `fetchUserData` para que esten disponibles en el contexto de autenticacion.

#### 3. Corregir superposicion de leyenda en graficos

**Archivo: `src/components/SalesChart.tsx`**

- Aumentar el margen inferior del grafico (de 60 a 90).
- Mover la leyenda a la parte superior del grafico con `<Legend verticalAlign="top" />`.

#### 4. Nuevo histograma comparativo mensual (lineas por anio)

**Nuevo archivo: `src/components/MonthlyComparisonChart.tsx`**

- Grafico de lineas con eje X = meses (Ene-Dic) y una linea por cada anio (2024, 2025, 2026).
- Agregar los datos mensuales de `ventas_mensuales` sumando todos los clientes filtrados por mes.
- Usar `LineChart` de Recharts con colores diferenciados por anio.

**Archivo: `src/pages/Dashboard.tsx`**

- Integrar el nuevo componente debajo de los graficos existentes.

#### 5. Filtros de anios y meses

**Archivo: `src/pages/Dashboard.tsx`**

- Anadir filtro de anios (2024, 2025, 2026) como checkboxes para seleccionar que anios mostrar en los graficos.
- Anadir filtro de rango de meses (mes inicio - mes fin) para limitar el periodo visible.
- Estos filtros afectaran al histograma mensual y opcionalmente a los graficos de barras existentes.

---

### Resumen de archivos

| Archivo | Accion |
|---|---|
| Migracion SQL | Funciones RPC para vendedores/delegaciones distintos |
| `src/hooks/useAuth.tsx` | Exponer `employeeCode` y `delegacion` del perfil |
| `src/hooks/useHistoricoData.ts` | Paginar clientes, filtrar por rol, usar RPCs |
| `src/pages/Dashboard.tsx` | Pasar filtros de rol, anadir filtros anio/mes, integrar histograma |
| `src/components/SalesChart.tsx` | Mover leyenda arriba, aumentar margen |
| `src/components/MonthlyComparisonChart.tsx` | Nuevo grafico de lineas mensual comparativo |
