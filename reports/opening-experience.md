# Rendimiento y experiencia al abrir sobres

Verificación del 10 de octubre de 2026.

## Cambios

La colección abre en su producto habitual: Play, Draft, Set, Default o Jumpstart según disponibilidad. Solo se consultan en Scryfall las impresiones de ese producto, conservando «Todos los sobres» y los demás productos en el selector. EOE Play solicita 371 impresiones en cinco lotes; la vista completa contiene 872 y requiere doce. Al cambiar de sobre, una caché compartida reutiliza las impresiones disponibles.

Las peticiones de Scryfall se serializan con una separación de 150 ms. Las fuentes MTGJSON se cargan con cuatro trabajadores sin barreras entre grupos. Las tarjetas fuera de pantalla posponen su renderizado y las imágenes se descargan al entrar en pantalla.

El loader representa un sobre con cartas animadas. Muestra el tiempo transcurrido y un mensaje adicional en esperas largas, sin inventar porcentajes. Mantiene el contenido ocupado e inactivo hasta completar la navegación y evita que una navegación cancelada o antigua oculte el loader de una nueva.

Cada carta abre un diálogo nativo sin nuevas consultas HTTP. Permite elegir el tipo de sobre, ver el porcentaje estimado, una frecuencia «1 de cada…», ratios por acabado, precios normal/foil/etched, imagen ampliada y reverso, reglas, tipo, artista, EDHREC y enlace a Scryfall. Se cierra con Escape, el botón o el fondo, restaura el foco y funciona en móvil.

## Medición

| Obtención de datos de EOE, vista completa de 872 impresiones | Tiempo |
| --- | --- |
| Antes de optimizar | 17.917 ms |
| Tras optimizar cola y carga de fuentes | 6.342 ms |
| Repetición con caché de memoria | Menos de 1 ms |

La primera medición mejoró aproximadamente un 65 %. Son mediciones locales individuales de obtención de datos, no tiempos completos de navegador ni una garantía de latencia. La carga por producto, implementada después, reduce además las cartas consultadas. Su tiempo inicial exacto no se pudo medir en vivo porque MTGJSON empezó a devolver errores de conexión desde el entorno; Scryfall continuaba respondiendo correctamente.

## Validación

- 26 pruebas de lógica aprobadas, incluyendo probabilidades ponderadas, muestreo sin duplicados, temas fijos de Jumpstart, resultados extremadamente raros, separación de acabados, caché compartida y descarga exclusiva del producto seleccionado.
- Las siete pruebas de navegador pasaron con los proveedores reales antes del último ajuste de carga por producto. La versión final se verifica también con las siete pruebas usando el paquete de producción y las instantáneas oficiales del día, debido al fallo de conexión de MTGJSON. Las imágenes proceden del CDN real.
- El modal abrió en menos de un segundo en la prueba, sin peticiones de documento, fetch o XHR. Se comprobaron cambios de sobre, Escape, foco, reverso, cierre desde el fondo, móvil y navegación repetida con el loader.
- Se verificaron 1.089 rutas: catálogo, las 677 composiciones, 200 vistas completas y 200 vistas iniciales. Se conservan las 76.202 impresiones físicas distintas de la fuente, sin omisiones ni duplicados en una página.
- La auditoría de probabilidades verificó 170.102 combinaciones de impresión y producto. Los porcentajes están entre 0 y 100 %, las probabilidades por acabado son coherentes con la conjunta y la suma de copias esperadas coincide con el número de posiciones del sobre.
- Astro: cero errores y advertencias. Compilación y arranque de la función de producción aprobados.

Los datos oficiales no permiten reconstruir todas las correlaciones de la distribución física. Las probabilidades se indican como estimadas; las selecciones provisionales no reciben ratios inventados. Las colecciones sin composición oficial y las discrepancias entre fuentes siguen señaladas.

Resultados detallados: [rutas](rendered-coverage.json), [probabilidades](odds-coverage.json), [cobertura](coverage.json).

## Repetir las pruebas

```sh
pnpm check
pnpm test
pnpm test:e2e
pnpm test:e2e:snapshot
pnpm test:coverage
```

`test:e2e:snapshot` requiere los datos de `.cache/coverage`; compila la aplicación y arranca un servidor de prueba en el puerto 4322 con transporte de proveedores simulado usando las instantáneas reales. No altera las consultas de la aplicación normal. `test:coverage` descarga y prepara esas instantáneas cuando los proveedores están disponibles.

[Modal en escritorio](previews/modal-desktop.png) · [Modal en móvil](previews/modal-mobile.png) · [Loader](previews/loader.png)
