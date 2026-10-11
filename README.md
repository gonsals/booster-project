# MTG Top Picks

Consulta qué puede tocarte al abrir un sobre de Magic: The Gathering, cuánto vale cada impresión y su probabilidad estimada. Aplicación en español con Astro 7, Tailwind CSS 4 y el adaptador de Vercel.

## Desarrollo

Requiere Node.js 22.12 o posterior y pnpm 10.10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre http://localhost:4321. No necesita claves de API ni variables de entorno.

## Sobres, cartas y probabilidades

- El catálogo y la composición proceden de MTGJSON. Se incluyen todos los sobres físicos publicados: Play, Draft, Set, Collector, Jumpstart, Theme, VIP, Convention, promo, prerelease y muestras Collector. Las configuraciones digitales Arena/MTGO quedan fuera.
- Al abrir una colección se selecciona su sobre habitual: Play, Draft, Set, Default o Jumpstart según disponibilidad. Solo se descargan las impresiones de ese producto. «Todos los sobres» permite consultar la unión completa; la vista estándar agrupa Play, Draft, Set y Default.
- Las hojas resuelven impresiones de otras colecciones, bonus sheets y Special Guests mediante sus UUID e identificadores de Scryfall. No se infiere la presencia en el sobre a partir de etiquetas promocionales.
- Pulsa la imagen, el nombre o la tarjeta para abrir un modal sin nuevas consultas a la API. Incluye precios por acabado, imagen ampliada y reverso, reglas, tipo, artista, EDHREC y enlace a Scryfall.
- El modal permite elegir un sobre y consultar la probabilidad de obtener al menos una copia de esa impresión, con desglose normal, foil y etched. Cada producto tiene su propia probabilidad; no se mezclan ni promedian Play y Collector.
- El cálculo pondera las variantes de paquete y sus posiciones. Trata las listas fijas de Jumpstart como listas garantizadas una vez elegido el tema; las posiciones uniformes sin duplicados usan muestreo sin reemplazo. Las posiciones de pesos distintos con varias extracciones utilizan una aproximación. El equilibrio de colores y las correlaciones de la distribución física no están completamente descritos por los datos públicos: todas las cifras se presentan como estimaciones, y «1 de cada…» no es una garantía.
- En colecciones sin composición publicada se muestran las impresiones físicas conocidas como provisionales, sin inventar probabilidades. Las discrepancias entre proveedores sobre un acabado se señalan sin ocultar otras cartas.
- Scryfall proporciona precios USD por acabado. No se sustituyen por precios de otro acabado si faltan. Las cartas sin imagen conservan un marcador visible.

Fuentes: [MTGJSON Booster Config](https://mtgjson.com/data-models/booster/booster-config/), [Booster Sheet](https://mtgjson.com/data-models/booster/booster-sheet/), [Scryfall API](https://scryfall.com/docs/api).

## Rendimiento y actualización

Las cachés de memoria duran una hora, tienen capacidad limitada y agrupan peticiones simultáneas de la misma colección. Una caché compartida de hasta 12.000 impresiones evita volver a descargarlas cuando aparecen en otros sobres. Las fuentes MTGJSON se consultan con cuatro trabajadores, sin esperar a que acabe un grupo completo para iniciar el siguiente.

Scryfall se consulta en lotes de hasta 75 cartas, con peticiones serializadas y una separación de 150 ms, por debajo de sus [diez solicitudes por segundo](https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17). Un 429 activa un descanso de al menos 60 segundos y devuelve `Retry-After`. Los fallos no guardan selecciones parciales en caché.

Las páginas tienen una caché HTTP de cinco minutos para el CDN. Las imágenes se cargan al entrar en pantalla, y las tarjetas fuera de pantalla posponen su renderizado. El loader muestra un sobre animado, mensajes de espera y el tiempo transcurrido; termina cuando llega la respuesta real, sin fingir porcentajes de progreso. Las animaciones respetan la preferencia de movimiento reducido.

En una medición local de la descarga inicial de EOE, con 872 impresiones, el tiempo pasó de 17.917 ms a 6.342 ms. La consulta posterior de los datos en memoria tardó menos de 1 ms. Son tiempos de obtención de datos, no de descarga y pintado completos en navegador, y pueden variar con la red y los proveedores. La caché es por instancia del servidor; una instancia nueva tiene que realizar su primera carga.

## Comprobaciones

```sh
pnpm check
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:snapshot
pnpm build
pnpm test:build
pnpm test:coverage
pnpm audit
```

Las pruebas de lógica cubren precios, acabados, fallos parciales, caché compartida, carga por producto, límites del proveedor, probabilidades ponderadas, duplicados, Jumpstart y casos extremadamente raros. Playwright prueba navegación, filtros, móvil, imágenes, doble cara, modales sin peticiones adicionales, foco, cierre y loader. `test:e2e` usa las API públicas. `test:e2e:snapshot` reproduce las instantáneas oficiales descargadas en `.cache/coverage` y arranca un servidor de prueba separado en el puerto 4322; no altera los proveedores de la app normal. Las imágenes siguen descargándose del CDN real.

`test:build` arranca y ejecuta la función de producción generada con datos de prueba. `test:coverage` descarga las fuentes oficiales completas (unos 260 MB comprimidos), las procesa por streaming, valida cartas y probabilidades y reproduce todas las rutas del paquete de producción con esos datos reales. La caché de descarga está en `.cache/coverage`, ignorada por Git. La espera del limitador se elimina únicamente en esa reproducción sin red.

Informes: [verificación](reports/verification.md), [rendimiento y modal](reports/opening-experience.md), [cobertura de cartas](reports/coverage.json), [rutas renderizadas](reports/rendered-coverage.json), [probabilidades](reports/odds-coverage.json). Las capturas de navegador se guardan en `test-results/`.

## Despliegue

`pnpm build` genera `.vercel/output`. El servidor actualiza los datos sin recompilar la aplicación. El adaptador no admite `astro preview`; usa `pnpm dev` o una vista previa de Vercel.

`@astrojs/vercel` está fijado en 11.0.12 por una [regresión de arranque de la versión 11.0.13](https://github.com/withastro/astro/issues/18328). Antes de retirar el pin, comprueba también el arranque del paquete generado. Los permisos de compilación están en `pnpm-workspace.yaml` y las correcciones de dependencias indirectas en `pnpm.overrides`.

Magic: The Gathering pertenece a Wizards of the Coast. Este proyecto es independiente. Los precios son orientativos.
