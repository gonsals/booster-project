# Verificación de MTG Top Picks

Comprobación del 10 de octubre de 2026. El catálogo lleva al sobre concreto que quieres abrir; sus cartas muestran el valor y abren un modal con información y probabilidades estimadas.

| Comprobación | Resultado |
| --- | --- |
| Colecciones del catálogo | 200 |
| Colecciones con composición publicada | 188 |
| Composiciones de sobres físicos contrastadas | 677 |
| Rutas del paquete de producción verificadas | 1.089 |
| Impresiones físicas distintas renderizadas | 76.202 |
| Tarjetas comprobadas entre todas las vistas | 330.408 |
| Omisiones, duplicados o rutas fallidas en la reproducción completa | 0 |
| Combinaciones impresión/producto con probabilidades validadas | 170.102 |
| Pruebas de lógica | 26 aprobadas |
| Escenarios de navegador de la versión final | 7 aprobados con instantáneas oficiales |
| Análisis de Astro | 0 errores, 0 advertencias |
| Compilación y arranque de producción | Aprobados |

## Evidencia y límites

Se compara el HTML real de la función de producción con los UUID y pesos de las hojas oficiales, incluyendo cada sobre, la unión completa y el producto habitual elegido inicialmente. Las pruebas no se limitan a comprobar un HTTP 200 ni el contador de la página.

Fuentes: MTGJSON del 10 de octubre de 2026 y Scryfall `default_cards` actualizado el 10 de octubre de 2026 a las 09:06 UTC. La reproducción completa intercepta el transporte HTTP con esas instantáneas reales; no supone que se hayan hecho 1.089 consultas de navegador contra las API públicas.

Las siete pruebas de navegador pasaron con las API reales durante la implementación del modal y loader. En la comprobación final, tras añadir carga por producto, MTGJSON devolvía errores de conexión desde el entorno. Se repitieron los siete escenarios contra el paquete de producción con las instantáneas oficiales; las imágenes siguieron descargándose de su CDN real. Scryfall continuaba respondiendo correctamente. La app normal conserva sus proveedores reales y devuelve un error explícito cuando no están disponibles.

Las 188 colecciones con composición tienen referencias de imagen para todas sus impresiones. Se comprobó la carga real de imágenes representativas, incluido el principio y el final de la cuadrícula de Jumpstart; no se descargaron las 76.202 imágenes de golpe.

Hay 12 colecciones sin composición publicada: MDD, NAU, TRK, DPA, S00, PELP, PALP, PARL, BCHR, 4BB, FBB y FWB. Se muestran como provisionales sin inventar ratios ni cartas extra. MDD y FWB no tienen cartas publicadas en estas fuentes. Los acabados discrepantes en AKH, CMR, HOU, KLD, MBC y SOI se señalan sin bloquear las demás cartas. MBC tiene tres referencias que Scryfall todavía considera digitales y que se excluyen del recuento físico.

Las probabilidades se ponderan por variante y posición, distinguen los acabados y conservan el número esperado de cartas del sobre. Son estimaciones: los pesos públicos no describen todas las correlaciones de la distribución física. Las composiciones provisionales no reciben porcentajes inventados.

[Experiencia, mediciones y pruebas](opening-experience.md) · [Cobertura de cartas](coverage.json) · [Rutas renderizadas](rendered-coverage.json) · [Probabilidades](odds-coverage.json)

[Modal en escritorio](previews/modal-desktop.png) · [Modal en móvil](previews/modal-mobile.png) · [Loader](previews/loader.png)
