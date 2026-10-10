# DESIGN — Black Clover: La Senda del Rey Mago

Documento de diseño: arquitectura, decisiones y listado de contenido.
Las tablas de contenido salen de `js/data.js`. Si cambiás ese archivo, los números de acá pueden quedar desactualizados; la fuente de verdad siempre es `data.js`.

## 1. Plan y alcance

**Concepto:** roguelike de acción top-down en tiempo real. Te movés con WASD, el ataque y las habilidades son automáticos y la decisión del jugador está en **moverse, esquivar y armar la build**. Mezcla un "auto-shooter" (estilo Vampire Survivors) con salas y puertas (estilo Hades / Slay the Spire).

**Loop de una partida:**
1. Elegís personaje (+ semilla y rango opcionales).
2. Se genera el mapa: 5 reinos × 8 salas (combate inicial → 5 pisos con 2-3 puertas → descanso o tienda → jefe).
3. Sala de combate: oleadas → recompensa (1 de 3) → puertas → siguiente sala.
4. El jefe derrotado cura 40% y da una reliquia rara o mejor; se pasa al siguiente reino.
5. Al morir o ganar, las estrellas van a la progresión meta.

**Etapas de construcción (todas verificadas):**
| Etapa | Contenido | Verificación |
|---|---|---|
| 1 | Movimiento, combate básico de Asta, enemigos | Test "una sala se limpia" + capturas del navegador |
| 2 | Generación de salas con semilla y loop completo de una run | Tests de mapa (300 semillas) + simulación de run completa |
| 3 | Maná, hechizos, ítems, sinergias | Tests de stats, sinergias (genérico sobre todas) y recompensas |
| 4 | Yuno, Noelle, 5 jefes con fases, meta-progresión y guardado | Simulación de victoria con los 3 personajes, tests de guardado |
| 5 | Balance, pulido, README | `tests/balance.js` con bots de distinta habilidad + partidas en navegador |

## 2. Arquitectura

JavaScript puro + Canvas 2D, sin librerías ni build. Los archivos se cargan con `<script>` clásicos (no módulos ES, porque Chrome bloquea los módulos al abrir desde `file://`). Todos cuelgan de un objeto global `BC`.

```
data.js ─────────────► (datos editables)
rng.js, utils.js ────► base
stats.js, combat.js ─► fórmulas puras (testeables)
mapgen.js, run.js, loot.js, events.js, save.js ─► lógica pura de la run
entities.js, skills.js, enemies.js, game.js ────► motor en tiempo real (sin DOM)
bot.js ──────────────► jugador automático (tests / demo)
render.js, ui.js, audio.js, input.js, main.js ──► presentación (navegador)
```

**Separación clave:** el motor (`BC.Game`) no toca el DOM. Emite eventos (`reward`, `event`, `shop`, `rest`, `runEnd`...) que escucha `main.js` para abrir ventanas. Gracias a eso, `tests/run-tests.js` puede simular partidas completas en Node con `headless: true`.

**Estados del juego:** `idle → playing ⇄ (reward | event | shop | rest) → gameover | victory`. La simulación sólo avanza en `playing` y sin pausa.

**Aleatoriedad con semilla:** cada sistema usa su propio generador derivado de la semilla, así una elección no cambia el resto:
- `seed:map` → mapa · `seed:enc:<sala>` → oleadas · `seed:loot:<sala>:<tipo>:<re-tirada>` → recompensas
- `seed:event:<sala>` / `seed:shop:<sala>` → eventos y tienda · `seed:combat` → críticos, posiciones, IA
- Misma semilla + mismas decisiones = misma partida (cubierto por un test).

## 3. Decisiones de diseño

- **Ataques automáticos** (lo pide la guía): cada habilidad tiene enfriamiento y, si cuesta maná, espera a tener maná suficiente. Apuntan al enemigo más cercano dentro de su alcance. El jugador sólo controla movimiento y dash.
- **Dash** (Espacio/Shift) con invulnerabilidad corta: es la única acción manual de combate, para que esquivar tenga habilidad.
- **Definitivas manuales (tecla Q):** la barra se llena sola, pero el jugador decide cuándo usarla (sólo si está llena y hay enemigos). Si se aprieta Q antes, aparece un aviso y la tecla no queda "guardada". El bot de los tests la usa en jefes, élites, grupos de 4 o más, o con poca vida.
  - *Modo Demonio* (Asta): la barra se llena recibiendo daño (riesgo/recompensa), pegando y anulando hechizos. Da mucho poder, pero drena vida y al terminar te deja agotado.
  - *Sylph* (Yuno): se llena gastando maná. Explota en área y durante unos segundos los hechizos no cuestan maná.
  - *Armadura Valquiria* (Noelle): se llena con el maná alto. Da daño y armadura, y las balas de agua se vuelven lanzas.
  - *Zona de Maná* (Caballero Novato): se llena gastando maná y pegando. Daño, enfriamientos y regeneración de maná, y frena a los enemigos cercanos.
- **Caballero Novato (personaje versátil):** estadísticas promedio. Su `skillPool` incluye su básica (*Bala Mágica*) más las 15 habilidades de los demás, con un tope de `maxSkills: 6` para que las mejoras de nivel sigan apareciendo. Su rasgo *Versátil* da +6% de daño por cada estilo distinto (Asta/Yuno/Noelle) que tenga. Las sinergias de habilidades (Anti-magia Absoluta, Tormenta Espiritual, Furia del Dragón) aceptan una lista de personajes y lo incluyen. *Valquiria Desbordante* no, porque depende de la definitiva de Noelle. Está disponible desde el inicio (sin `unlockCost`). Los guardados viejos lo reciben automáticamente.
- **Identidad anti-magia de Asta:** no usa maná. Sus tajos y estocadas **destruyen proyectiles mágicos** (todos los proyectiles enemigos son mágicos). La Espada Habitante acumula cargas con cada hechizo anulado. Su rasgo *Determinación* le da daño cada vez que recibe un golpe.
- **Sangre Real de Noelle:** hasta +40% de daño según el porcentaje de maná, lo que premia no gastarlo todo.
- **Experiencia y niveles:** los enemigos dan XP según su costo (élite 25, jefe 60). XP para el nivel N→N+1 = 22 × 1.25^(N-1), así que cada nivel cuesta más. Cada subida de nivel ofrece 3 mejoras, siempre al menos una de habilidad (nueva o mejora). Las salas de combate normales **no** dan recompensa al terminar; los élites y jefes dan reliquias. Se puede saltear (+15 yules) o re-tirar (mejora meta).
- **Límites de build:** máximo 6 reliquias por partida (al llegar, los élites/jefes/eventos dan otra cosa) y máximo 6 habilidades a la vez para los personajes con maná.
- **Hechizos elementales:** 8 elementos × 6 hechizos (nombres de la wiki de Black Clover; Rayo y parte de Tierra/Veneno inventados porque la wiki no los lista). Cada hechizo tiene `element` en `data.js` y al final del archivo se completan solos `shared`, `tags` y color, y se agregan al pool de los personajes con `learnsElements` (Yuno, Noelle, Novato; Asta no). Límite: 6 habilidades además de la básica. Pesos: cada elemental pesa `elementalNew` (bajo, porque son muchos), multiplicado por `1 + elementAffinity × (hechizos que ya tenés de ese elemento)`, para que juntar 6 del mismo sea posible.
- **Comportamientos nuevos:** `buff` (mejora temporal de armadura/velocidad/evasión/daño/regeneración o curación instantánea, que sólo se usa si te falta vida), `aura` (daño constante alrededor), zonas `field` (fuego, barro, polen, cadenas, nube venenosa) y veneno como daño en el tiempo separado de la quemadura. Los proyectiles del jugador pueden perseguir enemigos (`homing`).
- **Sinergias:** 8 de un solo elemento (6 hechizos), 10 de pares lógicos (3 + 3), una de Asta con sus 5 espadas, más las de reliquias e ítems. Usan el requisito `skillTags`. Las habilidades propias de Yuno tienen la etiqueta viento y las de Noelle agua, así que cuentan para esos elementos.
- **Grimorio secreto:** `save.discoveredSynergies` guarda las sinergias activadas alguna vez (`BC.Save.discoverSynergy`, llamado desde `main.js` al recibir el evento `synergy`). El Grimorio y las pistas de las cartas muestran ❔ ??? para las no descubiertas.
- **Legendarias y cofres:** la rareza legendaria tiene `bossOnly`: `relicPool` sólo la incluye con `fromBoss` (premio de jefe), y además cada legendaria requiere desbloqueo por jefe. Con todo desbloqueado aparece alguna en ~17% de los premios de jefe. Los cofres (`data.chests`) los suelta un enemigo común con 0,4%, un élite con 50% y los jefes siempre. Hay que caminar hasta ellos (no se atraen solos salvo al limpiar la sala). `BC.Loot.openChest` elige entre mejorar algo que ya tenés, yules (escalan por reino) o curación (sólo si te falta vida).
- **Enemigos especiales:** comportamientos `turret` (quieta, dispara), `exploder` (se acerca, avisa con círculo y explota muriendo), `blinker` (se teletransporta cerca del jugador) y `splitInto` (al morir aparecen N enemigos). Élites Rhya (copia hechizos: Jabalina de Agua, Aliento de Salamandra, Corte de Avidya) y Ladros (Million Laser), con nombres de la wiki.
- **Reino secreto:** el reino `capital` tiene `secret: true` y `floors: 4`. `generateMap` sólo lo incluye con `includeSecret` (ganaste `config.secretUnlockWins` = 3 veces). La partida termina con el último reino del mapa. Jefe: Lucius Zogratis (Magia de Alma / Tiempo), con ataque nuevo `timeStop` (frena 75% al jugador y después dispara en círculo).
- **Hechizos potenciados:** `inventory.evolved` (máx. `config.evolution.max` = 2). Sólo por cofres, con probabilidad fija `chests.evolveChance` (12%), sobre habilidades al nivel máximo. `skillLevelStats(def, nivel, evo)` aplica ×1.6 de daño, ×0.8 de enfriamiento, ×1.2 de tamaño y +1 de proyectiles/saltos. Los nombres están en `data.evolutions`.
- **Logros y estadísticas:** `js/progress.js` (`CHECKS` por logro, `recordRun` para estadísticas e historial de 30 partidas). `Save.applyRunResult` registra la partida, otorga los logros nuevos (sumando sus estrellas) y avisa si se desbloqueó el reino secreto. El resumen de partida incluye dashes, máximo de yules, jefes sin recibir daño, potenciados, legendarias y quién dio el golpe final (`by` en cada ataque enemigo).
- **Pixel art:** `js/pixel.js` arma los sprites con piezas (pelo, ropa, capa, arma, cuernos, alas...) sobre una grilla, con contorno automático y 2 cuadros de caminata; bestias, espíritus, plantas, bombas y cristales tienen su propia forma. `ENEMY_LOOKS` tiene una línea por enemigo (un test verifica que no falte ninguno). `js/render-pixel.js` dibuja el mundo en 320x180 y lo agranda x4 sin suavizar; las zonas y avisos usan tramado (dithering). Textos, HUD y carteles quedan en alta resolución con la fuente Pixelify Sans (si no hay internet, una monoespaciada). El estilo clásico sigue disponible (`settings.graphics`).
- **Estilo de las ventanas:** todas son hojas de pergamino (textura generada por `BC.Grimoire.parchment` al arrancar, guardada como WebP en las variables CSS `--parch` y `--parch-card`; en PNG pesaba varios MB y el navegador la descartaba). Títulos en IM Fell English SC y texto en EB Garamond, que tiene números modernos. Botones de cuero con borde dorado; el principal es lacre rojo. Los retratos de personajes y jefes son sus sprites en pixel art.
- **Fondo del menú:** `js/menuscene.js` dibuja en 320x180 un cielo con degradado tramado (matriz de Bayer), estrellas, luna, montañas, el castillo con ventanas que titilan, una fogata animada, los cuatro personajes, luciérnagas y hojas de trébol.
- **Grimorio (pausa):** `js/grimoire.js` reemplaza la pausa por un libro de dos páginas. El pergamino se genera con código (granulado, manchas, fibras, borde irregular y quemado) y se cachea como imagen. `BC.Loot.skillStatRows` da los números de cada habilidad y del próximo nivel; también se usan en las cartas de recompensa y en la tienda.
- **Duración y dificultad:** 8 salas por reino (40 en total). Mejoras de la Base con más niveles y costos (~430 ⭐ en total), y Yuno y Noelle más caros. La dificultad está pensada para que sin mejoras casi nunca se gane.
- **Mapa:** las salas especiales no se repiten en el piso siguiente (así no te ofrecen volver a la que terminaste) y el piso anterior a la sala previa al jefe no ofrece descanso/tienda. El combate sí se puede repetir dentro de un piso (cada puerta tiene enemigos distintos), y por eso las especiales son más raras.
- **Mejoras meta nuevas:** Meditación (regeneración), Entrenamiento de piernas (velocidad; las velocidades base bajaron ~15% y el máximo con la mejora sigue por debajo de las de antes) y Pacto de Maldición (daño propio + enemigos/vida enemiga + estrellas). Las partes "de mundo" de la maldición se suman a la ascensión con `BC.Stats.worldMods`.
- **Sinergias declarativas:** cada sinergia dice qué necesita (personaje, ítems concretos o cantidad de reliquias con una etiqueta) y qué da. `stats.js` las evalúa; no hay casos especiales en la lógica salvo los *flags* que leen las habilidades (p. ej. `zankaInfinitePierce`).
- **Telegrafía:** todo ataque fuerte de élites y jefes se avisa con círculos, líneas o brillos rojos antes de pegar. Los enemigos aparecen con un aviso previo y nunca pegados al jugador.
- **Escalado:** los enemigos comunes y élites escalan por reino (`hpMult`, `dmgMult`) y por sala. Los jefes tienen vida absoluta (más fácil de editar) y sólo escalan con la ascensión.
- **Reinos de Espada y Pica:** en el anime, "Espada" y "Pica" son dos traducciones del **mismo reino** (Spade). Como la guía pide 5 reinos con los dos nombres, el **Reino de Espada** representa las fronteras tomadas por la Tríada Oscura (jefe: Zenon) y el **Reino de Pica** el castillo de la Tríada / Puerta del Inframundo (jefe: Dante → Lucifero). Los nombres se cambian en `data.js → realms`.
- **Jefes elegidos (5):** Vetto (Ojos del Sol de Medianoche), Vanica, Mars, Zenon y Dante (con transformación en Lucifero en su última fase).
- **Gráficos:** formas y emojis generados por código. Los emojis se cachean como imágenes (`render.js`) por rendimiento. El fondo de cada sala se dibuja una sola vez.
- **Progresión meta:** estrellas por salas, élites, jefes y victoria (con bonus por rango). Se gastan en 6 mejoras permanentes y en desbloquear a Yuno y Noelle. Las reliquias legendarias se desbloquean derrotando jefes. Los 10 rangos de ascensión se desbloquean ganando.

## 4. Balance (resultado de `tests/balance.js`)

El bot de pruebas tiene una "habilidad" de 0 a 1 que indica cuántos peligros ve y esquiva. "Meta" es qué fracción de los niveles de la Base tiene comprados. 12 partidas por personaje:

| Escenario | Asta | Yuno | Noelle | Caballero Novato |
|---|---|---|---|---|
| Bot torpe (0.5), sin mejoras | 1/12 | 0/12 | 1/12 | 1/12 |
| Bot torpe, mitad de las mejoras | 5/12 | 2/12 | 3/12 | 3/12 |
| Bot torpe, todas las mejoras | 11/12 | 10/12 | 8/12 | 8/12 |
| Bot experto (1), sin mejoras | 9/12 | 11/12 | 5/12 | 7/12 |

**Reino secreto** (con todas las mejoras, 20 partidas): el bot torpe llega 16 veces y vence a Lucius 9 (56% de los que llegan). El experto lo vence siempre.

Objetivo: terminar el juego requiere varias partidas para comprar mejoras (o jugar muy bien). Notas: el robo de vida del Modo Demonio es muy sensible (Asta golpea a muchos enemigos a la vez) y quedó en 0,6%. Las partidas más largas dan más niveles, por eso la XP por nivel crece 28%. El bot no juega como una persona: estos números sirven para comparar cambios.

## 5. Contenido

Total: **64 habilidades (48 elementales) + 11 pasivas + 23 reliquias = 98**, y **29 sinergias**. Personajes: Asta, Yuno, Noelle Silva, Caballero Novato.

### Habilidades de personaje

| Personaje | Habilidad | Comportamiento | Maná | Descripción |
|---|---|---|---|---|
| Caballero Novato | ✨ Bala Mágica (inicial) | projectile | - | Un proyectil de maná puro al enemigo más cercano. |
| Asta | 🗡️ Espada Mata-Demonios (inicial) | meleeArc | - | Tajo en arco al enemigo más cercano. Destruye los proyectiles mágicos que toca. |
| Asta | 🔱 Espada Destructora de Demonios | pierceLine | - | Estocada en línea que atraviesa a todos los enemigos y anula los hechizos del camino. |
| Asta | 🌀 Espada Habitante de Demonios | absorbRelease | - | Absorbe los hechizos que destruís (y un poco de maná del ambiente) y los libera en una onda cortante. |
| Asta | 🌙 Zanka (Tajo Volador) | projectile | - | Lanza tajos voladores anti-magia que atraviesan enemigos y destruyen proyectiles. |
| Asta | ☄️ Meteorito Negro | groundSlam | - | Un golpe anti-magia cae sobre el grupo de enemigos más denso. |
| Yuno | 🍃 Cuchillas de Viento (inicial) | projectile | - | Dispara cuchillas de viento al enemigo más cercano. |
| Yuno | 🌪️ Tornado Ascendente | zoneAtTarget | 18 | Crea un tornado sobre un enemigo que atrae y daña a los que estén cerca. |
| Yuno | 💨 Lluvia de Cuchillas | radialBurst | 22 | Lanza cuchillas de viento en todas las direcciones. |
| Yuno | 🌙 Media Luna de Viento | projectile | 16 | Una enorme media luna de viento que atraviesa todo a su paso. |
| Yuno | 🌀 Escudo de Viento | orbit | - | Cuchillas que giran a tu alrededor y cortan a los enemigos que se acercan. |
| Noelle Silva | 💧 Balas de Agua (inicial) | projectile | - | Esferas de agua que salpican al impactar. |
| Noelle Silva | 🐉 Rugido del Dragón Marino | beam | 28 | Un torrente de agua en línea recta que daña continuamente. |
| Noelle Silva | 🫧 Nido del Dragón Marino | dome | 30 | Una cúpula de agua a tu alrededor: frena a los enemigos, los daña y bloquea proyectiles. |
| Noelle Silva | 🔱 Lanza de la Valquiria | projectile | 20 | Una lanza de agua veloz que atraviesa varios enemigos. |
| Noelle Silva | 🌊 Marejada del Dragón | shockwave | 22 | Una ola circular que empuja y daña a los enemigos cercanos. |

### 🔥 Fuego (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🔥 Bola Flamígera Explosiva | projectile | 15 | Explota al impactar, daña en área y quema. |
| ☄️ Ametralladora de Bolas Flamígeras | projectile | 12 | Una ráfaga de pequeñas bolas de fuego que queman. |
| 🌀 Espiral de Fuego | zoneAtTarget | 18 | Un remolino de llamas sobre un enemigo que quema a todos los que toca. |
| 🦁 Leo Rugiens | beam | 26 | El rugido del león de fuego de Fuegoleon: un torrente de llamas en línea. |
| 🦎 Garra de Salamandra | meleeArc | 8 | Un zarpazo de fuego en arco que quema a los enemigos cercanos. |
| 🏛️ Ignis Columna | shockwave | 16 | Una columna de fuego que estalla a tu alrededor y empuja. |

### 💧 Agua (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🔵 Bala Asesina de Agua Bendita | projectile | 12 | Una esfera de agua que atraviesa a un enemigo y frena 35% a los que toca durante 2 s. |
| 🔱 Jabalina de Agua | projectile | 14 | Una jabalina veloz que atraviesa a varios enemigos. |
| 🐍 Corte de la Serpiente del Mar | pierceLine | 16 | Un corte de agua en línea recta que atraviesa todo. |
| 🌊 Olas Crecientes | shockwave | 18 | Una ola que empuja lejos a los enemigos y los frena. |
| 🔨 Martillo del Dios del Mar | groundSlam | 22 | Un martillo de agua cae sobre el grupo más denso. |
| 🫧 Cortina de Agua | dome | 24 | Una cortina de agua a tu alrededor que bloquea proyectiles y frena enemigos. |

### 🪨 Tierra (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🪨 Violenta Madre Tierra | groundSlam | 18 | Pilares de roca brotan bajo el grupo de enemigos más denso y los empujan. |
| ⛰️ Terreno Elevado | radialBurst | 16 | El suelo estalla y lanza rocas en todas las direcciones. |
| 🧱 Muro de Tierra | buff | 18 | Te rodeás de tierra: +8 de armadura durante 5 s. |
| 🟫 Sello Terrón | zoneAtTarget | 14 | Convierte el suelo en barro: los enemigos se frenan 50% y reciben daño. |
| 👊 Puño de Roca | projectile | 14 | Una roca enorme que golpea fuerte y empuja. |
| 🌋 Pared de Tierra | shockwave | 16 | El suelo se levanta en un anillo que golpea y empuja. |

### 🌪️ Viento (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🌬️ Arco Blanco del Vendaval | shockwave | 14 | Una ráfaga circular que empuja lejos a los enemigos que se acercan. |
| 🌪️ Torre Tornado | zoneAtTarget | 18 | Un tornado que atrae y corta a los enemigos. |
| 🌀 Colmillo Tornado | projectile | 14 | Un remolino cortante que atraviesa todo a su paso. |
| 🦅 Halcón Blanco del Vendaval | projectile | 12 | Halcones de viento que persiguen a los enemigos. |
| 📍 Remolino de Agujas Perforantes | radialBurst | 16 | Decenas de agujas de viento en todas las direcciones. |
| ☁️ Nube del Ladrón | buff | 14 | Una nube te lleva: +25% de velocidad y +20% de evasión durante 4 s. |

### ⚡ Rayo (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| ⚡ Rayo en Cadena | chain | 16 | Un rayo que salta de enemigo en enemigo. |
| 👢 Botas del Dios del Trueno | buff | 14 | Las botas de Luck: +35% de velocidad y +20% de daño durante 4 s. |
| 🥊 Guantes del Dios del Trueno | meleeArc | 6 | Puñetazos eléctricos a los enemigos cercanos. |
| 🗲 Lanza del Trueno | projectile | 12 | Una lanza de rayo veloz que atraviesa. |
| 🐺 Bestias del Relámpago | orbit | - | Esferas de rayo que giran a tu alrededor (no gastan maná). |
| 🌩️ Juicio del Rayo | groundSlam | 20 | Un rayo cae del cielo sobre el grupo más denso. |

### ⚙️ Acero (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🌀 Lanza Giratoria Violenta | projectile | 14 | Una lanza de acero que gira y perfora varios enemigos. |
| 🗡️ Furiosa Lanza Perforante | pierceLine | 16 | Una estocada de acero muy larga que atraviesa todo. |
| 🏰 Pared Blindada del Castillo de Acero | buff | 22 | Un castillo de acero te protege: +14 de armadura durante 5 s. |
| 🏹 Flecha Relámpago | projectile | 14 | Una flecha de acero rapidísima con mucho daño. |
| ⛓️ Cadenas de Acero | zoneAtTarget | 16 | Cadenas que atrapan a los enemigos: los frenan 70% y los dañan. |
| ⚔️ Lluvia de Espadas de Acero | radialBurst | 20 | Espadas de acero salen disparadas en todas las direcciones. |

### 🌿 Planta (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| 🌺 Cañón Floral Mágico | projectile | 14 | Un cañonazo de flores que atraviesa enemigos. |
| 🧺 Cesta Floral de Curación de Sueños | buff | 20 | Mimosa te cura: recuperás 10% de tu vida al instante. |
| 👗 Vestido Floral de Recuperación | buff | 18 | Un vestido de flores: regenerás 4 de vida por segundo durante 5 s. |
| 🌼 Polen Mágico | zoneAtTarget | 14 | Una nube de polen que frena y daña a los enemigos. |
| 🌿 Enredadera Mágica de Control | groundSlam | 16 | Enredaderas brotan bajo los enemigos, los dañan y los frenan. |
| 🌸 Orientación Floral Mágica | orbit | - | Pétalos que giran a tu alrededor y cortan (no gastan maná). |

### ☠️ Veneno (elemental)

| Hechizo | Comportamiento | Maná | Descripción |
|---|---|---|---|
| ☁️ Nido de Nubes Venenosas | zoneAtTarget | 16 | Una nube venenosa que envenena a los que la atraviesan. |
| 🦡 Aufwachen Dachs | projectile | 10 | Un tejón venenoso que muerde y envenena. |
| 🍎 Verboten Obst | projectile | 16 | La fruta prohibida: explota y envenena a todos alrededor. |
| ☂️ Violett Schirm | dome | 22 | Un paraguas violeta: bloquea proyectiles y envenena a los que se acercan. |
| 🟣 Aura Tóxica | aura | - | Un aura de veneno a tu alrededor que envenena a los cercanos (no gasta maná). |
| 🗡️ Dagas Venenosas | radialBurst | 14 | Dagas envenenadas en todas las direcciones. |

### Pasivas (11)

| Pasiva | Máx. | Efecto |
|---|---|---|
| 💪 Entrenamiento Muscular | 5 | +10% de daño. |
| ❤️ Vitalidad de Toro | 5 | +20 de vida máxima (y te cura 20). |
| 👟 Pies Ligeros | 3 | +5% de velocidad de movimiento. |
| 🔷 Concentración de Maná | 4 | +20% de maná máximo. *(sólo con maná)* |
| 💧 Flujo de Maná | 4 | +20% de regeneración de maná. *(sólo con maná)* |
| ⏱️ Celeridad | 5 | -7% de enfriamiento de habilidades. |
| 🛡️ Piel de Acero | 5 | +2 de armadura. |
| 🎯 Ojo de Halcón | 5 | +6% de probabilidad de crítico. |
| ✨ Recuperación | 4 | Regenerás 0.8 de vida por segundo. |
| 💰 Bolsillo de Yules | 3 | +30 de radio de recolección y +15% de yules. |
| 👁️ Sentido del Ki | 4 | +6% de evasión. |

### Reliquias (23, máximo 6 por partida)

| Reliquia | Rareza | Etiquetas | Efecto |
|---|---|---|---|
| 🐂 Capa de los Toros Negros | Común | toro | +20% de daño cuando tenés menos de 50% de vida. |
| 🚬 Cigarro de Yami | Rara | toro | +8% de crítico y +25% de daño crítico. |
| 🧵 Hilo Rojo del Destino | Épica | toro | Una vez por sala, un golpe mortal te deja con 1 de vida. |
| 🪞 Espejo de Gauche | Rara | toro | 25% de probabilidad de duplicar tus proyectiles. |
| 🍙 Banquete de Charmy | Común | toro | Al limpiar una sala curás 12% de tu vida. |
| ⚡ Chispas de Luck | Común | toro | +10% de velocidad. Tu dash daña a los enemigos que atravesás. |
| 🔥 Bate de Fuego de Magna | Común | toro | Tus golpes queman: 6 de daño por segundo durante 3 s. |
| 🚪 Portal de Finral | Común | toro | Tu dash se recarga 25% más rápido. |
| 🍀 Trébol de Cuatro Hojas | Rara | amanecer, mana | +25% de maná máximo y +10% de daño. |
| 🌅 Emblema del Amanecer Dorado | Común | amanecer, mana | +25% de regeneración de maná y -8% de enfriamiento. |
| 📿 Colgante de la Iglesia de Hage | Rara | hage | +12% de daño y la barra definitiva se carga 20% más rápido. |
| 🙏 Rosario de la Hermana Lily | Común | hage | +30 de vida máxima. |
| 💎 Piedra Mágica | Rara | mana | +25% de daño, pero tus hechizos cuestan 15% más maná. *(sólo con maná)* |
| 👑 Corona de la Casa Silva | Rara | realeza, mana | +20% de daño mientras tengas más de 70% de maná. *(sólo con maná)* |
| 🎖️ Insignia de Caballero Mágico | Común | caballero | +8% de daño y +15 de vida máxima. |
| 😈 Corazón de Liebe | Épica | demonio | La barra definitiva se carga 40% más rápido. *(se desbloquea derrotando a Vetto)* |
| 📕 Grimorio de Cinco Hojas | Épica | demonio | La definitiva dura 30% más y +10% de daño. *(se desbloquea derrotando a Vanica Zogratis)* |
| 🧥 Capa del Rey Mago | Legendaria | caballero, realeza | -15% de enfriamiento y +15% de daño. *(se desbloquea derrotando a Mars)* |
| ⏳ Reloj de Julius | Épica | realeza | Magia de tiempo: los enemigos son 12% más lentos. *(se desbloquea derrotando a Zenon Zogratis)* |
| 🗡️ Katana de Yami Sukehiro | Legendaria | toro | +15% de crítico, +60% de daño crítico y +10% de daño. "¡Superá tus límites!" *(se desbloquea derrotando a Vanica Zogratis)* |
| 🦁 Calidus Brachium de Mereoleona | Legendaria | realeza | Tus golpes queman 12 por segundo, +20% de daño y +30 de vida máxima. *(se desbloquea derrotando a Zenon Zogratis)* |
| ⚔️ Espada de Licht | Legendaria | caballero | La espada del líder elfo: +25% de daño y robás 1% de vida. *(se desbloquea derrotando a Dante Zogratis)* |
| 📜 Grimorio del Primer Rey Mago | Legendaria | caballero, realeza | El grimorio de Lumiere: -15% de enfriamiento, +30% de maná máximo, +15% de daño y la definitiva se carga 20% más rápido. *(se desbloquea derrotando a Dante Zogratis)* |

### Sinergias (29) — ¡spoilers! En el juego están ocultas hasta descubrirlas

| Sinergia | Requisito y efecto |
|---|---|
| 🌊 Valquiria Desbordante | Noelle + 2 reliquias de maná: la Armadura Valquiria dura 4 s más y da +30% de daño extra. |
| 🐂 Espíritu de los Toros Negros | 3 reliquias de los Toros Negros: +20% de daño y +10% de velocidad. |
| ⛪ Hijos de Hage | Colgante de Hage + Rosario de Lily: +25 de vida máxima y la definitiva se carga 30% más rápido. |
| ⚫ Anti-magia Absoluta | Asta (o el Caballero Novato) con Espada Habitante y Zanka: Zanka atraviesa todo y la Habitante acumula el doble de cargas. |
| 🌪️ Tormenta Espiritual | Yuno (o el Caballero Novato) con Tornado y Lluvia de Cuchillas: tornados 40% más grandes que disparan cuchillas. |
| 🔥 Llama Imperial | Los 6 hechizos de Fuego: Tus golpes queman 12 por segundo y +25% de daño. |
| 💧 Señor del Mar | Los 6 hechizos de Agua: +40% de maná máximo, +50% de regeneración de maná y +20% de daño. |
| 🪨 Gólem de Tierra | Los 6 hechizos de Tierra: +10 de armadura y +60 de vida máxima. |
| 🌪️ Rey de los Vientos | Los 6 hechizos de Viento: +15% de velocidad, -20% de enfriamiento y +10% de evasión. |
| ⚡ Relámpago Divino | Los 6 hechizos de Rayo: +20% de crítico, +50% de daño crítico y +10% de velocidad. |
| ⚙️ Cuerpo de Acero | Los 6 hechizos de Acero: +12 de armadura, +15% de daño y un golpe mortal por sala te deja con 1 de vida. |
| 🌿 Árbol del Mundo | Los 6 hechizos de Planta: Regenerás 3 de vida por segundo y curás 20% al limpiar una sala. |
| ☠️ Plaga | Los 6 hechizos de Veneno: Todos tus golpes envenenan (10 por segundo) y +20% de daño. |
| 🔥 Tormenta de Fuego | 3 hechizos de Fuego + 3 de Viento: El viento aviva las llamas: tus golpes queman 6 por segundo y +15% de daño. |
| ⚡ Electrocución | 3 hechizos de Agua + 3 de Rayo: El agua conduce el rayo: +12% de crítico y +15% de daño. |
| 🏰 Fortaleza Inexpugnable | 3 hechizos de Tierra + 3 de Acero: +6 de armadura y +40 de vida máxima. |
| 🌸 Florecimiento | 3 hechizos de Planta + 3 de Agua: Regenerás 1.5 de vida por segundo y curás 10% al limpiar una sala. |
| 🍄 Jardín Tóxico | 3 hechizos de Veneno + 3 de Planta: Tus golpes envenenan (6 por segundo) y +10% de daño. |
| ⚒️ Forja Ardiente | 3 hechizos de Fuego + 3 de Acero: +10% de crítico y +40% de daño crítico. |
| ⛈️ Tempestad | 3 hechizos de Viento + 3 de Rayo: -12% de enfriamiento y +8% de velocidad. |
| 🐊 Pantano | 3 hechizos de Tierra + 3 de Agua: Los enemigos son 12% más lentos y +2 de armadura. |
| 🌫️ Niebla Venenosa | 3 hechizos de Veneno + 3 de Viento: Tus golpes envenenan (5 por segundo) y +8% de evasión. |
| 🌋 Magma | 3 hechizos de Fuego + 3 de Tierra: Tus golpes queman 5 por segundo y +4 de armadura. |
| ⚔️ Maestro de las Espadas Demoníacas | Asta con sus 5 espadas: +10% de daño y la barra definitiva se carga 15% más rápido. |
| 🌅 Orgullo del Amanecer Dorado | 2 reliquias del Amanecer Dorado: +30% de regeneración de maná y -10% de enfriamiento. |
| 😈 Pacto Demoníaco | 2 reliquias demoníacas: la definitiva dura 50% más y robás 5% de vida. |
| ⚡ Locos de la Batalla | Bate de Magna + Chispas de Luck: tu dash quema y +10% de crítico. |
| 👑 Nobleza Obliga | 2 reliquias de la realeza: +15% de daño y +3 de armadura. |
| 🐉 Furia del Dragón Marino | Noelle (o el Caballero Novato) con Rugido y Nido del Dragón: el Rugido es 50% más ancho y el Nido dura 2 s más. |

### Mejoras permanentes (Base)

| Mejora | Efecto | Costos (⭐) |
|---|---|---|
| ❤️ Entrenamiento físico | +10 de vida máxima por nivel. | 3, 5, 7, 10, 13, 17, 22, 28 |
| 💪 Práctica de combate | +5% de daño por nivel. | 4, 6, 9, 12, 16, 21, 27, 34 |
| 🛡️ Disciplina de caballero | +1 de armadura por nivel. | 4, 7, 11, 16, 22 |
| 💰 Ahorros del escuadrón | Empezás cada run con +25 yules por nivel. | 2, 4, 7, 11 |
| 📖 Hojas de grimorio extra | +1 re-tirada de recompensas por run. | 5, 10, 16 |
| 🧘 Meditación | Regenerás 0.2 de vida por segundo por nivel. | 4, 8, 13 |
| 👟 Entrenamiento de piernas | +3% de velocidad de movimiento por nivel. | 4, 8, 13 |
| 💀 Pacto de Maldición | Por nivel: +12% de daño, pero 15% más enemigos y +15% de vida enemiga. También +15% de estrellas. | 2, 4, 6 |
| ✝️ Segunda oportunidad | Una vez por run, al morir revivís con 40% de vida. | 25 |

### Enemigos

| Enemigo | Comportamiento | Aparece en |
|---|---|---|
| 🗡️ Bandido | chase | Reino del Trébol |
| 🔥 Mago Bandido | ranged | Reino del Trébol |
| 🐗 Bestia Corrompida | charger | Reino del Trébol, Reino del Corazón, Reino del Diamante, Reino de Espada, Reino de Pica |
| 🪖 Soldado de Pica | chase | Reino del Corazón |
| 👻 Espíritu Maldito | ranged | Reino del Corazón |
| 🛡️ Soldado de Diamante | chase | Reino del Diamante |
| 💠 Mago de Cristal | ranged | Reino del Diamante |
| ⚔️ Guerrero de la Tríada | chase | Reino de Espada, Reino de Pica |
| 🌑 Mago de Gravedad | ranged | Reino de Espada, Reino de Pica |
| ☀️ Mago del Sol de Medianoche | caster | Reino del Trébol, Reino del Corazón, Reino del Diamante, Reino de Espada, Reino de Pica, Capital del Reino del Trébol |
| 💀 Cadáver Reanimado | chase | (invocado) |
| 🐺 Lobo del Bosque | chase | Reino del Trébol |
| 🪴 Planta Carnívora | turret | Reino del Corazón |
| 🗿 Gólem de Cristal | chase | Reino del Diamante |
| 🔹 Fragmento de Cristal | chase | (invocado) |
| 💣 Esclavo Maldito | exploder | Reino de Espada, Reino de Pica |
| 😈 Diablillo | blinker | Reino de Pica, Capital del Reino del Trébol |
| 🛡️ Paladín de Lucius | chase | Capital del Reino del Trébol |
| 🎭 Rhya (élite) | pattern: fan, radial, line, teleport | Reino del Corazón, Reino de Pica, Capital del Reino del Trébol |
| 💍 Ladros (élite) | pattern: line, spikes, shield | Reino del Diamante, Reino de Espada, Reino de Pica, Capital del Reino del Trébol |
| 🌀 Valtos (élite) | pattern: teleport, fan, portalVolley | Reino del Trébol, Reino de Espada, Reino de Pica |
| 🧟 Rades (élite) | pattern: summon, aimed | Reino del Corazón, Reino de Espada, Reino de Pica |
| 🦎 Fana (élite) | pattern: radial, line, spikes | Reino del Diamante, Reino de Pica |

### Jefes

| Reino | Jefe | Fases y ataques |
|---|---|---|
| Reino del Trébol | 🦁 Vetto — Ojo del Sol de Medianoche — Magia Bestia | **Garras de la Bestia** (100%): charge, radial, nova<br>**Cuarta Bestia: Desesperación** (50%): charge, radial |
| Reino del Corazón | 🩸 Vanica Zogratis — Tríada Oscura — Magia de Sangre + Megicula | **Magia de Sangre** (100%): fan, aimed<br>**Maldición de Megicula** (60%): spikes, fan<br>**Megicula Despierta** (25%): spiral, spikes |
| Reino del Diamante | 💎 Mars — Mago del Reino del Diamante — Magia Mineral | **Magia Mineral** (100%): spikes, fan, line<br>**Armadura de Cristal** (50%): shield, rain, radial |
| Reino de Espada | 🦴 Zenon Zogratis — Tríada Oscura — Magia de Hueso + Zagred | **Magia de Hueso** (100%): fan, line, nova<br>**Magia Espacial de Zagred** (50%): teleport, portalVolley, spiral |
| Reino de Pica | 🖤 Dante Zogratis — Tríada Oscura — Magia Corporal + Lucifero | **Magia Corporal** (100%): line, aimed, summon<br>**Gravedad de Lucifero** (60%): pull, gravityWell, radial<br>**Descenso de Lucifero** (30%): spiral, gravityWell, rain, nova |
| Capital del Reino del Trébol | 👼 Lucius Zogratis — El verdadero Rey Mago — Magia de Alma y de Tiempo | **Magia de Alma** (100%): aimed, summon, portalVolley<br>**Magia del Tiempo** (65%): timeStop, spiral, rain<br>**Paladín Supremo** (30%): spiral, timeStop, gravityWell, nova, summon |
