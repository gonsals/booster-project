# Verificación del despliegue — 11 de octubre de 2026

- Producción: https://booster-project.vercel.app
- Proyecto: `tumarres-projects/booster-project`.
- Despliegue: `dpl_DJJjUvE8qrQMetzL3q3qBmvtocEc`, estado READY.
- Compilación remota en Linux con Node.js 24, Astro 7.3.8 y adaptador Vercel 11.0.12: correcta.
- `pnpm check`: 0 errores, 0 advertencias, 0 sugerencias.
- Tests unitarios: 26 correctos.
- Tests Playwright contra el dominio público y los proveedores reales: 7 correctos en 43,7 segundos.

Los tests de navegador comprueban búsqueda y paginación del catálogo, cambios de sobre, precios foil, filtros combinados, cartas de doble cara, diseño móvil, respuestas 404, las 779 cartas de Foundations Jumpstart con imágenes al principio y al final, las 371 cartas del sobre Play de Edge of Eternities, el modal con probabilidades y gestión del foco, y el loader durante navegación.

La verificación del despliegue no utiliza los snapshots de datos. MTGJSON y Scryfall respondieron correctamente. La consulta final de logs devolvió una entrada por la colección inexistente `notaset`, solicitada deliberadamente por el test de respuesta 404; no mostró errores en las rutas válidas comprobadas.

Los datos descargados para auditorías, las credenciales locales, los informes y los scripts de prueba quedan excluidos de la subida a Vercel mediante `.vercelignore`.
