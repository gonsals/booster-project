# Adelantos en las colecciones — 11 de octubre de 2026

Las colecciones futuras o parcialmente reveladas consultan los adelantos públicos de Scryfall, además de la composición de MTGJSON. Se recorren todas las páginas, se conservan las variantes de impresión y se deduplican los identificadores. Se excluyen cartas digitales, oversized, tokens, emblemas y art series. El indicador `booster: false` no oculta un adelanto.

Las cartas sin asignación de producto aparecen dentro de la colección y al cambiar de sobre, con «Adelanto» y «Sobre por confirmar». La búsqueda y los filtros de acabado y Full Art siguen funcionando. Sus probabilidades son desconocidas; se conservan las probabilidades de las impresiones con composición publicada. El modal muestra fuente y fecha del adelanto cuando Scryfall las proporciona.

Los metadatos, las selecciones y las búsquedas de estas colecciones caducan a los cinco minutos. Los fallos de paginación no se guardan como descargas completas. Una consulta suplementaria fallida conserva el contenido conocido y avisa. Una colección anunciada sin cartas publicadas tiene su propio estado vacío.

## Validación

- `pnpm check`: 0 errores, 0 advertencias, 0 sugerencias.
- `pnpm test`: 33 tests correctos, incluidos adelantos anteriores a MTGJSON, paginación, deduplicación, filtros, composición mixta, fallos, TTL y propagación de `Retry-After`.
- `pnpm build` y `pnpm test:build`: correctos. La función compilada renderiza adelantos y colecciones anunciadas sin cartas, además del flujo existente.
- Playwright con instantáneas oficiales del 10 de octubre: 8 tests correctos. Se han recuperado los campos `games`, `layout` y `preview` de los mismos archivos originales, sin sustituir las instantáneas por datos de otra fecha.
- Playwright del caso de adelantos contra el servidor local y proveedores reales: correcto. Marvel: Darkhold Destiny mostró 12 impresiones; se verificaron etiquetas, fuente, fecha, probabilidad desconocida, modal sin consultas adicionales, cambio de filtro y diseño móvil.
- Cobertura de la función compilada: 1.089 rutas, 330.428 impresiones renderizadas y 76.212 impresiones físicas distintas, sin fallos.

La primera ejecución general del navegador en vivo encontró respuestas 429 de Scryfall; la repetición también quedó limitada y se detuvo. No se considera esa suite una validación completa en vivo. La comprobación específica de adelantos sí pasó en vivo, y el conjunto de 8 escenarios pasó con reproducción de las instantáneas. El mensaje de la aplicación ahora indica el tiempo de espera cuando el proveedor limita las peticiones.

La detección automática depende de que la carta esté publicada en Scryfall. Su inclusión en la colección no confirma que aparezca en un tipo concreto de sobre.
