MTG Booster Cards Viewer
========================

Visualizador de cartas de **Magic: The Gathering** que aparecen en sobres (**Play Boosters** y **Collector / Booster Fun**) usando **Scryfall** y **MTGJSON**.

El proyecto se centra en mostrar **únicamente cartas que realmente salen en sobres**, con **la imagen y el precio correctos según la impresión**, resolviendo los problemas típicos donde las cartas Collector muestran la imagen o el precio incorrecto.

Características
---------------

*   Play Boosters visibles por defecto
    
*   Collector / Booster Fun ocultos por defecto
    
*   Activación manual de cartas Collector
    
*   Imagen correcta por impresión (normal, foil, etched)
    
*   Precio correcto según el tipo de carta
    
*   Ordenación por:
    
    *   Valor
        
    *   EDHREC Rank
        
*   Filtros:
    
    *   Booster Fun / Collector
        
    *   Full Art
        
*   Construido con Astro
    
*   Uso combinado de Scryfall y MTGJSON
    

APIs utilizadas
---------------

*   **Scryfall API**[https://scryfall.com/docs/api](https://scryfall.com/docs/api?utm_source=chatgpt.com)
    
*   **MTGJSON API**[https://mtgjson.com](https://mtgjson.com?utm_source=chatgpt.com)
    

Funcionamiento del sistema
--------------------------

### Scryfall (fuente principal)

Scryfall se usa para obtener:

*   Imágenes
    
*   Precios
    
*   EDHREC Rank
    
*   Tipo de impresión
    
*   Identificación de cartas Booster Fun / Collector

### MTGJSON (contexto del set)

MTGJSON proporciona la estructura del set y los boosters, pero:

*   No se usan imágenes de MTGJSON
    
*   No se usan precios de MTGJSON
    
*   Las cartas Collector **no se eliminan como promo**, porque Collector = promo
    

MTGJSON sirve para entender el contexto del set, no para renderizar cartas.

Control de cartas Collector / Booster Fun
-----------------------------------------

Por defecto:

*   **NO se muestran cartas Booster Fun / Collector**

Estructura del proyecto
-----------------------

src├── layouts│ └── MainLayout.astro├── pages│ └── boosters│ └── \[code\].astro├── styles│ └── global.css
    

Los filtros son combinables entre sí.

Problemas resueltos por este enfoque
------------------------------------

*   Cartas Collector mostrando la imagen del Play Booster
    
*   Precios incorrectos en cartas Collector
    
*   Cartas duplicadas con la misma imagen
    
*   Ocultación errónea de cartas por tratarse como promo
    
*   Sets con múltiples impresiones del mismo nombre

Créditos
--------

*   Scryfall — Base de datos oficial de cartas de Magic
    
*   MTGJSON — Datos estructurales de sets
    
*   Wizards of the Coast — Magic: The Gathering
    
Este proyecto no está afiliado con Wizards of the Coast.
