# ☘️ Black Clover — La Senda del Rey Mago

Un roguelike de acción con vista desde arriba, basado en Black Clover. Elegís a Asta, Yuno, Noelle o al Caballero Novato, atravesás 5 reinos llenos de enemigos, juntás habilidades y reliquias, y enfrentás a Vetto, Vanica, Mars, Zenon y Dante. Si caés, perdés la partida, pero ganás estrellas para que tu escuadrón se haga más fuerte.

> Proyecto personal de fan. Black Clover pertenece a Yūki Tabata / Shueisha.

---

## ▶ Cómo abrirlo

1. Abrí la carpeta `BlackCloverRoguelike`.
2. Hacé **doble clic en `index.html`**.
3. Se abre en tu navegador (Chrome, Edge o Firefox). No hace falta instalar nada ni tener internet.

Si la ventana es chica, el juego se achica solo. Para verlo en pantalla completa apretá **F11**.

## 🎮 Controles

| Acción | Tecla |
|---|---|
| Moverse | **W A S D** o las **flechas** |
| Esquivar (dash, sos invulnerable un instante) | **Espacio** o **Shift** |
| Activar la definitiva (cuando la barra está llena) | **Q** |
| Pausa (y ver tu build completa) | **Esc** o **P** |
| Silenciar el sonido | **M** |
| Elegir una recompensa | Clic o teclas **1 2 3** |
| Re-tirar recompensas | **R** (si tenés re-tiradas) |

### 📱 En el celular

Se juega con el teléfono **acostado** (si está parado aparece un aviso para girarlo).

| Acción | Cómo |
|---|---|
| Moverse | Apoyá el dedo en cualquier parte de la pantalla y arrastralo (aparece un joystick) |
| Esquivar | Botón **💨** abajo a la derecha |
| Definitiva | Botón **✦** (se pone dorado y brilla cuando está lista) |
| Pausa / grimorio | Botón **❚❚** arriba a la derecha |
| Ventanas y menús | Se tocan directamente; si algo no entra, deslizá para abajo |

En Android, el menú principal tiene **⛶ Pantalla completa**. Para probar los controles táctiles en la computadora: `index.html?touch=1`.

**Para compartirlo:** `node tools/build-single.js` arma `dist/BlackClover.html`, todo el juego en un solo archivo.

**Atacar es automático:** tus habilidades se lanzan solas contra el enemigo más cercano cuando están listas. Vos te concentrás en moverte y esquivar. La **definitiva** la activás vos con **Q** cuando su barra (la tercera de arriba a la izquierda) está llena y parpadea en dorado. Guardala para el jefe o para cuando te rodean.

## 🧙 Los personajes

| Personaje | Estilo |
|---|---|
| ⚔️ **Asta** | Cuerpo a cuerpo, sin maná. Sus espadas destruyen hechizos. Definitiva: Modo Demonio. |
| 🌪️ **Yuno** | Viento a distancia, muy rápido. Definitiva: Sylph. |
| 🌊 **Noelle** | Agua y control de zona, más fuerte con el maná alto. Definitiva: Armadura Valquiria. |
| 🧙 **Caballero Novato** | Mago común con estadísticas promedio que puede aprender **las habilidades de los otros tres** (hasta 6 a la vez). Gana daño por cada estilo distinto que mezcle. Definitiva: Zona de Maná. |

## 👾 Gráficos

El juego se ve en **pixel art** (estilo Super Nintendo): personajes, enemigos, jefes, pisos y decoraciones están dibujados píxel por píxel con código. Todo está en **alta definición** (el doble de píxeles): los personajes tienen ojos de anime, mechones de pelo, luces y sombras en la ropa y armas con brillo, y cada reino tiene su propio piso (pasto, pétalos, mina de cristal, tierra rajada, baldosas de piedra) y ladrillos con relieve. Para ver todos los sprites juntos (antes y ahora) abrí `tests/sprites.html`. Los íconos de habilidades, reliquias, pasivas, sinergias y menús también son pixel art (no emojis): están en `js/icons.js` y se ven todos juntos en `tests/icons.html`. Los ataques (cortes, estocadas, rayos, explosiones, ondas) tienen brillo y estela. Si preferís el estilo anterior, en el menú principal o en la pausa está el botón **Gráficos: Pixel art / Clásicos**.

El **menú principal** tiene un paisaje nocturno animado en pixel art (el castillo del Reino del Trébol y los cuatro caballeros alrededor de una fogata). Todas las ventanas (subida de nivel, tienda, eventos, Base, Grimorio, logros...) son hojas de pergamino gastado.

**La pausa es tu grimorio:** un libro de pergamino viejo con cuatro marcadores (Hechizos, Pasivas y Reliquias, Sinergias, Estado). Tocá un hechizo para ver sus números exactos y cuánto mejora en el próximo nivel. Se pasa de página con ← → o con las teclas 1 a 4.

## 🗺 Cómo es una partida

- Son **5 reinos**: Trébol → Corazón → Diamante → Espada → Pica. Cada uno tiene 8 salas y un jefe al final. Es un juego largo y difícil: lo normal es necesitar varias partidas (y mejoras de la Base) para terminarlo.
- Al terminar una sala aparecen **puertas** arriba. Caminá hacia la que quieras:
  - ⚔️ **Combate**: oleadas de enemigos. Ganás experiencia y yules. Puede haber varias puertas de combate, cada una con enemigos distintos.
  - 💀 **Élite**: un miembro de los Ojos del Sol de Medianoche. Ganás una reliquia (máximo 6 por partida).
  - 🛒 **Tienda**: gastás tus yules 💰.
  - ❓ **Evento**: una situación con opciones (Charmy, Yami, Finral...).
  - 🔥 **Descanso**: te curás o entrenás una habilidad.
  - 👹 **Jefe**: cada jefe tiene varias fases con ataques distintos.
- Las salas especiales (élite, evento, descanso) son poco comunes y **nunca se repiten en el piso siguiente**. La tienda aparece más seguido y siempre antes del jefe.
- **Experiencia y niveles:** los enemigos dan XP (barra dorada arriba de todo). Al subir de nivel elegís una mejora entre 3. Cada nivel pide más XP que el anterior, así que subir cuesta cada vez más.
- **Re-tiradas:** si no te gusta ninguna de las 3 mejoras al subir de nivel, apretá **R** para sortear otras. Ganás **1 re-tirada cada 3 niveles**, y la mejora *Hojas de grimorio extra* de la Base te da más al empezar.
- **Pasivas:** máximo **5 distintas** por partida (las que ya tenés se pueden seguir subiendo).
- **Tienda:** cada cosa se compra una sola vez, incluida la poción de vida.
- **Reliquias:** máximo **6** por partida. Con 6, los élites, jefes y eventos te dan otra cosa.
- **Reliquias legendarias** (Katana de Yami, Espada de Licht, Calidus Brachium de Mereoleona, Grimorio del Primer Rey Mago y Capa del Rey Mago): **sólo salen como premio de jefe**, son poco probables y cada una se desbloquea derrotando a cierto jefe por primera vez.
- **Cofres 🎁:** los enemigos comunes casi nunca los sueltan, los élites la mitad de las veces y los **jefes siempre**. Caminá hasta el cofre para abrirlo: se abre una ventana que muestra lo que te tocó (sube de nivel algo que ya tenés, yules o vida).
- **Hechizos potenciados ✦:** si tenés una habilidad al nivel máximo, un cofre tiene 12% de probabilidad de **potenciarla**: cambia de nombre (por ejemplo *Bola Flamígera Explosiva → Máxima Bola Flamígera Explosiva*) y se vuelve mucho más fuerte. Máximo 2 por partida.
- **Enemigos especiales:** Lobos del Bosque (rápidos, en manada), Plantas Carnívoras (no se mueven, disparan), Gólems de Cristal (se parten en fragmentos al morir), Esclavos Malditos (**explotan**: alejate del círculo rojo) y Diablillos (se teletransportan al lado tuyo). Élites nuevos: **Rhya** (copia hechizos de otros) y **Ladros** (lásers de joya).
- **Reino secreto 👁️:** después de **ganar 3 veces**, al vencer a Dante se abre un reino más con el verdadero jefe final: **Lucius Zogratis**.
- **Hechizos elementales:** hay **8 elementos con 6 hechizos cada uno** (🔥 Fuego, 💧 Agua, 🪨 Tierra, 🌪️ Viento, ⚡ Rayo, ⚙️ Acero, 🌿 Planta, ☠️ Veneno), con nombres de la wiki de Black Clover. Los pueden aprender Yuno, Noelle y el Caballero Novato (Asta no, porque no tiene magia). Cada personaje puede tener hasta **6 habilidades además de la inicial**. Si ya tenés hechizos de un elemento, es más probable que te salgan más de ese elemento.
- **Sinergias:** con los **6 hechizos de un elemento** se activa su gran sinergia (por ejemplo *Llama Imperial* con los 6 de fuego). Con **3 de un elemento y 3 de otro** se activan sinergias de pares lógicos (fuego + viento = *Tormenta de Fuego*, agua + rayo = *Electrocución*, tierra + acero = *Fortaleza Inexpugnable*...). Las habilidades propias de Yuno cuentan como viento y las de Noelle como agua.
- **Grimorio secreto:** las sinergias aparecen como ❔ en el Grimorio hasta que las actives por primera vez. Ahí quedan guardadas para siempre.
- Los **círculos y líneas rojas** en el piso avisan dónde va a caer un ataque. ¡Salí de ahí!
- Ciertas combinaciones activan **sinergias** (por ejemplo, Noelle + 2 reliquias de maná = *Valquiria Desbordante*). Las ves en **Grimorio → Sinergias** y en la pausa.

## ⭐ Progreso entre partidas

- Al terminar una partida (ganes o pierdas) ganás **estrellas**. Las mejoras tienen muchos niveles: completarlas lleva bastantes partidas.
- En **Base de los Toros Negros** las gastás en mejoras permanentes: vida, daño, armadura, yules, re-tiradas, **Meditación** (cura pasiva), **Entrenamiento de piernas** (velocidad, 3 niveles), **Pacto de Maldición** (más daño, pero más enemigos y con más vida; da +15% de estrellas por nivel) y revivir, y para desbloquear a **Yuno** (15 ⭐) y **Noelle** (25 ⭐). **Asta** y el **Caballero Novato** están disponibles desde el principio.
- Al derrotar a cada jefe se desbloquea una **reliquia legendaria** nueva.
- Al ganar una partida se desbloquea el siguiente **Rango** (dificultad extra, más estrellas).
- El progreso se guarda solo en tu navegador. Si borrás los datos del navegador, se pierde. También podés borrarlo desde la Base.

## 🏆 Logros y 📊 Estadísticas

- **Logros** (botón en el menú): 18 desafíos, como ganar con cada personaje, ganar sin usar el dash o vencer a un jefe sin recibir daño. Cada uno da estrellas extra una sola vez.
- **Estadísticas:** partidas y victorias por personaje, tiempo jugado, quién te derrotó más veces, tus sinergias más usadas y tus últimas 10 partidas.

## 🎲 Semillas

Cada partida tiene una **semilla** (arriba a la derecha y en la pausa). Si escribís la misma semilla al elegir personaje, obtenés el mismo mapa, los mismos enemigos y las mismas recompensas. Sirve para repetir una partida o desafiar a un amigo.

---

## 🔧 Cómo modificar el juego (sin saber programar)

**Todo el balance está en un solo archivo: `js/data.js`.** Abrilo con el Bloc de notas (clic derecho → Abrir con → Bloc de notas) o mejor con [Visual Studio Code](https://code.visualstudio.com/), que es gratis.

Reglas para no romper nada:
- Cambiá sólo **números** y **textos entre comillas**.
- No borres comas `,`, llaves `{ }` ni corchetes `[ ]`.
- Guardá el archivo y **recargá la página** (F5) para ver el cambio.

Ejemplos:

| Quiero... | Buscá en `data.js` | Cambiá |
|---|---|---|
| Que Asta tenga más vida | `asta:` → `base: { maxHp: 105` | `105` por `150` |
| Que la Zanka pegue más | `zanka:` → `base: { damage: 24` | `24` por `40` |
| Que el tornado de Yuno cueste menos maná | `tornado:` → `cost: 22` | `22` por `10` |
| Jefes más fáciles | `vetto:` → `hp: 2200` | bajá el número |
| Más enemigos por oleada | `difficulty:` → `waveBudgetBase: 7` | subilo |
| Más yules por enemigo | en cada enemigo, `yul: [1, 2]` | `[3, 5]` |
| Desbloquear a Noelle más barato | `noelle:` → `unlockCost: 15` | `5` |
| Cambiar un evento | `events:` | editá `title`, `text` u `options` |

Unidades: tiempos en **segundos**, distancias en **píxeles** (la arena mide 1280 × 720), porcentajes como decimales (`0.10` = 10 %).

**Si algo se rompe:** abrí `tests/tests.html` con doble clic. Te dice qué falla. Si el juego muestra un cuadro rojo con un error, copiá ese texto para reportarlo.

## 🧪 Tests

- **En el navegador:** doble clic en `tests/tests.html`.
- **Con Node.js** (opcional, si lo tenés instalado), desde la carpeta del juego:
  - `node tests/run-tests.js` → todos los tests (74)
  - `node tests/run-tests.js --fast` → sin las simulaciones largas
  - `node tests/balance.js 10` → un bot juega 10 partidas con cada personaje y muestra hasta dónde llega (útil después de tocar el balance)
  - `node tests/balance.js 10 skill=0.5` → el mismo reporte con un bot más torpe

Modo demo: abrí `index.html?demo=1` en el navegador y el bot juega solo.

## 📁 Qué hay en cada archivo

| Archivo | Qué hace |
|---|---|
| `index.html` | La página que abrís para jugar |
| `css/style.css` | Colores y estilos de los menús |
| `js/data.js` | **Todos los datos de balance** (personajes, habilidades, enemigos, jefes, reinos, eventos, precios) |
| `js/rng.js` | Números aleatorios con semilla |
| `js/stats.js` | Calcula tus estadísticas y qué sinergias tenés activas |
| `js/combat.js` | Fórmulas de daño y dificultad |
| `js/mapgen.js` | Genera el mapa y las oleadas de cada sala |
| `js/run.js` | Estado de una partida (vida, yules, inventario) |
| `js/loot.js` | Recompensas y tienda |
| `js/events.js` | Eventos |
| `js/save.js` | Guardado y progreso entre partidas |
| `js/entities.js` | Jugador, enemigos, proyectiles y zonas |
| `js/skills.js` | Cómo funciona cada habilidad y cada definitiva |
| `js/enemies.js` | Inteligencia de enemigos y ataques de los jefes |
| `js/game.js` | El motor: salas, oleadas, daño, puertas |
| `js/render.js` | Dibuja todo en pantalla |
| `js/ui.js` | Menús y ventanas |
| `js/audio.js` | Efectos de sonido |
| `js/input.js` | Teclado |
| `js/bot.js` | Jugador automático (tests y modo demo) |
| `js/main.js` | Arranque y loop del juego |
| `DESIGN.md` | Decisiones de diseño y lista de habilidades, objetos y sinergias |
