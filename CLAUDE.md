# CLAUDE.md — Proyecto Skadii (SKADIICELL S.A.S.)

> Este archivo lo lee Claude Code automáticamente al iniciar.
> Contiene el contexto y las reglas de trabajo del proyecto. Mantenerlo actualizado.

---

## Qué es este proyecto

PWA (Progressive Web App) de un solo archivo para la operación de **SKADIICELL S.A.S.**
(venta y servicio de equipos iPhone). Toda la aplicación vive en **`index.html`**
(~7.400 líneas): HTML + CSS + JavaScript puro, sin framework ni build step.

- **Sin frameworks**: JavaScript vanilla. No hay React, Vue, ni bundlers.
- **Sin compilación**: el archivo se sirve tal cual. No hay `npm build`, no hay `dist/`.
- **Backend = Google Drive + Google Sheets** vía OAuth (Google API JS + GIS).
  Cada documento se guarda como JSON en su carpeta de Drive y se registra en un spreadsheet.
- **Repositorio**: `davidpar146/Skadii`. Se publica como página estática desde `main`
  en **Netlify** (`netlify.toml`) y en **GitHub Pages** (`.github/workflows/jekyll-gh-pages.yml`).

Otros archivos:
- **`panel-admin.html`**: panel administrativo aparte. Trabaja con datos **importados** que
  quedan en el `localStorage` de ese navegador (no lee Drive). La contraseña NO está en el
  código: se crea en el primer ingreso de cada equipo (≥ 10 caracteres) y solo se guarda su
  hash PBKDF2 con sal (`admin-pass-hash` en `localStorage`).
- **`netlify.toml`**: la entrada `/` abre `index.html`, permite la cámara solo en la app y
  agrega encabezados de seguridad. Solo lo lee Netlify (GitHub Pages lo ignora).

---

## Regla de oro

**NO romper lo que ya funciona.** Este es un sistema en producción real.

- Hacer **cambios quirúrgicos y aislados**, no reescrituras.
- Un cambio a la vez; explicar qué se tocó y por qué.
- Preferir **funciones e IDs nuevos con prefijo propio** antes que modificar lógica existente.
- Cuando se reutilice lógica existente (p. ej. la lista de prestadores), **reutilizar los
  helpers compartidos** en lugar de duplicar datos.
- Ante la duda, preguntar antes de editar.

---

## Arquitectura de módulos

La app se organiza por módulos, cada uno con su prefijo de funciones e IDs.
Respetar SIEMPRE el prefijo del módulo al añadir código:

| Módulo               | Prefijo JS / IDs | Qué hace |
|----------------------|------------------|----------|
| Remisiones           | (base) `item-`, `payment-`, `estado-`, `success-` | Venta: consecutivo, dispositivos propios/prestados, pagos, fotos, OCR IMEI, código de barras |
| Accesorios           | `acc…`           | Catálogo por código dentro de Remisiones, precio u obsequio, populares |
| Recargos             | `rec…`           | Recargo por medio de pago (tarjeta, Gora, ADDI, crédito BdB, E-Credit); no afecta el cuadre |
| Borrador             | `borrador…`      | Guarda la remisión en curso en el celular (IndexedDB) y ofrece recuperarla |
| Pendientes de guardado | `rem…`, `success-pendientes` | Reintento solo de los pasos que fallaron tras guardar una remisión |
| Mantenimientos       | `mant…`          | Diagrama de daños sobre SVG del iPhone, firma, estados |
| Garantías / Cambios  | `gar…`           | Cambio de equipo, diferencia de precios, autorización por clave |
| Pagar Prestadores    | `prest…`, `prestadores…` | Agrupa equipos prestados pendientes y registra pagos |
| Ingresos Pendientes  | `ing…`           | Cobros a empresas financieras |
| Inventario / Gastos  | `inv…`, `gas…`   | Inventario y gastos con categorías y aprobaciones |

### Asesores
- `ASESORES_FIJOS`: aparecen en todos los módulos.
- `ASESORES_SOLO_REMISIONES` (hoy: Sandra): solo Asesor Principal y colaboradores de
  Remisiones; se filtran en Mantenimientos e Inventario aunque estén en Drive.
- `ASESORES_INACTIVOS` (hoy: Male): se excluyen al cargar aunque sigan en Drive.
- Claves de 4 dígitos y permisos (`autorizar_garantias`, `registrar_gastos`, `administrador`)
  viven en **`CLAVES-ASESORES-V2`** en Drive (`CONFIG_FILES.clavesAsesores`), no en el código.
  Garantías y Gastos listan a quien tenga el permiso en ese archivo.

### Accesorios
- `ACCESORIOS_CATALOGO`: `{ codigo, nombre, categoria }`. El **código** (ACxx / V-x) es el
  identificador oficial y no se repite. Categorías en `ACC_CATEGORIAS`.
- Agregar o quitar un accesorio = editar el catálogo. Quitarlo no afecta remisiones viejas
  (cada una guarda su código y nombre). Los populares salen de `ACCESORIOS-POPULARIDAD.json`
  en Drive, filtrados por el catálogo.

### Convenciones de naming ya en uso
- Selector de prestadores en Remisiones: `prest-chips-list`, `item-prestado-por`, `prestadoresLista` (lista compartida).
- Selector de prestadores en Garantías (equipo que sale): `gar-sale-…` (reutiliza `prestadoresLista`).
- Modales de éxito: `success-modal` (remisiones), `gar-success-modal` (garantías).
- El modal de éxito de Remisiones lleva el encabezado `success-encabezado`: logo SKADIICELL
  (PNG incrustado en base64), nombre y teléfono **317 146 5168**. Sin círculo verde ni título;
  la confirmación es la línea `success-drive-ok` (o la caja `success-pendientes`).
- `acc-cantidad` aparece dos veces a propósito (dos plantillas alternativas: precio u obsequio).

---

## Helpers compartidos (usarlos siempre)

- **`sinDobleToque(this, 'clave', fn)`**: todo botón que guarde en Drive se llama así en su
  `onclick`. Bloquea el botón ("⏳ Guardando...") hasta que termina y **renueva la sesión de
  Google** si venció (`asegurarSesionGoogle` / `renovarSesionGoogle`; el permiso dura ~1 hora).
  Excepción: `prestConfirmarPago`, que tiene su propio bloqueo.
- **`faltaCampo([[valor, 'id', 'Nombre visible'], ...])`** y **`marcarCampoFaltante(id, msg)`**:
  validaciones que dicen qué campo falta, lo marcan en rojo y llevan la pantalla hasta él.
- **`confirmarImeiDudoso(imei, idCampo)`**: si el IMEI no son 15 dígitos válidos (Luhn), pide confirmar.
- **Fechas — `fechaLocalISO()`, `fechaLocalYMD()`, `formatearFechaCorta()`**:
  - Toda fecha que se guarde en un documento usa `fechaLocalISO()` (hora local con zona, p. ej.
    `2026-11-22T20:30:00-05:00`). **Nunca `new Date().toISOString()`**: es UTC, 5 horas adelante
    de Colombia, y desde las 7 p. m. deja el archivo con fecha del día siguiente.
  - Valores por defecto de `<input type="date">`: `fechaLocalYMD()`.
  - Para mostrar una fecha guardada: `formatearFechaCorta(fecha)` o `new Date(fecha)`.
    **Nunca `fecha.slice(0, 10)`**: los registros viejos están en UTC.
- `parsearValor`, `formatMoney`, `formatearInput` para dinero; los campos de dinero llevan
  `inputmode="numeric"` (no el NIT ni el IMEI, que pueden llevar guión o letras).

---

## Guardado de una remisión (`guardarDocumento`)

1. Valida campos y, si los pagos no cuadran con el total, pide confirmar (no bloquea).
2. Reserva el consecutivo con un archivo `Remision-NNNN.lock` y sube `Remision-NNNN.json`.
3. **Desde que existe el JSON, nunca se repite el guardado completo** (crearía una remisión
   duplicada con otro número). Cada paso siguiente se intenta por separado y, si falla, se
   agrega a `fallas`: fotos, fila en Sheets, equipos prestados, cobros pendientes.
   `agregarFilaExcel`, `registrarPrestadosEnDrive` y `registrarCobrosPendientes` reciben el
   parámetro opcional `fallas` y agregan ahí el reintento del archivo exacto que falló.
4. El modal de éxito lista lo pendiente y "Reintentar lo pendiente" (`remReintentarPendientes`)
   repite solo eso. La frecuencia de prestadores y la popularidad de accesorios son informativas:
   si fallan no tumban la remisión.
5. `limpiarTodo()` limpia el formulario y borra el borrador del celular.

---

## Integraciones con Google (puntos sensibles)

- **OAuth**: `gapi` (Google API) + `google.accounts` (GIS). La inicialización está al final
  del script, en `window.addEventListener('load', …)`. No tocar el flujo de auth salvo necesidad.
  `handleAuthClick` registra cuándo vence el permiso (`tokenVenceEn`).
- **Carpetas de Drive**: definidas en el objeto `FOLDER_IDS`. Cada tipo de documento tiene su carpeta.
  No cambiar estos IDs sin confirmar con el usuario; apuntan a carpetas reales en producción.
- **Subida de archivos**: helpers `subirArchivoDrive(...)` y `subirImagenDrive(...)`.
- **Registro en Sheets**: `agregarFilaExcel(...)`. El ID de la hoja se guarda **por equipo** en
  `localStorage` (`spreadsheet_id`); si un equipo no lo tiene, `verificarOCrearSpreadsheet`
  crea una hoja nueva.
- **Compatibilidad entre módulos**: el módulo "Pagar Prestadores" detecta archivos cuyo nombre
  empieza por `Prestado-` en la carpeta `prestamosPagos`, con `estado: 'pendiente'` y un array
  `equipos[]`. Cualquier registro nuevo de equipo prestado DEBE seguir ese mismo formato para que
  el reporte de pagos lo recoja. (Ver `registrarPrestadosEnDrive` y `garRegistrarPrestadoEntregado`.)

## Librerías externas (con verificación de integridad)

`html5-qrcode@2.3.8` (escáner) y `tesseract.js@5.1.1` (OCR del IMEI) se cargan desde unpkg con
`integrity` (SRI sha384) y `crossorigin="anonymous"`. **Si se cambia la versión hay que
recalcular el hash**, o el navegador bloquea la librería y dejan de funcionar el escáner y el OCR.
Calcularlo sobre el archivo del paquete oficial de npm:
`openssl dgst -sha384 -binary archivo.min.js | openssl base64 -A`.

---

## Flujo de trabajo con Git (importante)

Como toda la app es un único archivo crítico:

1. **Trabajar en una rama**, nunca directo en `main`:
   ```
   git checkout -b ajuste/<descripcion-corta>
   ```
2. Aplicar el cambio en `index.html`.
3. Revisar SIEMPRE el diff antes de confirmar:
   ```
   git diff
   ```
4. Commit con mensaje claro en español describiendo el ajuste.
5. Abrir Pull Request hacia `main`, mergear (squash) y borrar la rama.

### Política de automatización (acordada con el usuario)

El usuario pidió el flujo **totalmente automático**: el asistente ejecuta
solo los pasos 1–5 (rama → commit → push → PR → **merge a `main`** → limpieza
de la rama) sin pedir confirmación manual para cada paso. Aun así:

- Cada cambio se evalúa primero **dónde encaja** (dónde se agrega o reescribe)
  y se aplica de forma **quirúrgica y aislada**, sin tocar lo que ya funciona.
- Se respetan SIEMPRE las validaciones de la sección siguiente antes de mergear.
- El merge se hace por **squash** para mantener `main` limpio.
- Los PR/merge se gestionan por la **API de GitHub** usando las credenciales ya
  guardadas (Git Credential Manager); no hay `gh` instalado en el equipo.
- GitHub tiene activo **"Automatically delete head branches"**: al mergear, la rama del PR
  se borra sola. Para el siguiente ajuste, volver a crearla desde `main`.
- En sesiones en la nube (Claude Code web) se trabaja en la rama asignada a la sesión y los
  PR/merge se hacen con `gh api` (REST). Desde ahí **no** se pueden borrar ramas ni cambiar la
  configuración del repositorio: esos pasos los hace el usuario en GitHub.

---

## Validaciones antes de dar por bueno un cambio

Antes de declarar terminado cualquier ajuste a `index.html`, verificar:

- [ ] **IDs únicos**: ningún `id="..."` nuevo duplica uno existente.
- [ ] **Etiquetas balanceadas**: `<div>`/`</div>`, `<button>`/`</button>`, `<script>`/`</script>`.
- [ ] **Sintaxis JS válida**: extraer el bloque `<script>` principal y pasar `node --check`
      (también el de `panel-admin.html` si se toca).
- [ ] **onclick → función real**: cada `onclick="fn(...)"` nuevo apunta a una función definida.
- [ ] **No se rompió otro módulo**: confirmar que los IDs/funciones de los demás prefijos siguen intactos.
- [ ] **Reset de formularios**: si se añaden campos, agregarlos a la función de limpieza del módulo.
- [ ] **Botones de guardar nuevos** pasan por `sinDobleToque`; **fechas nuevas** usan `fechaLocalISO()`.
- [ ] **Prueba en navegador** cuando el cambio tiene comportamiento: Chromium headless
      (Playwright) con `gapi`/Drive simulados. La app está detrás del login: en la prueba,
      ocultar `#login-screen` y mostrar `#main-content`.

---

## Tono y estilo

- Comentarios y mensajes de UI en **español**.
- Mantener el esquema visual existente (variables CSS `--primary`, `--success`, `--danger`, etc.).
- No introducir dependencias externas nuevas sin confirmar.
