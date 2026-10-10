/*
 * ============================================================
 *  DATOS DE BALANCE — Black Clover: La Senda del Rey Mago
 * ============================================================
 *  Este es el archivo que podés editar para cambiar el juego:
 *  vida, daño, velocidad, enfriamientos, costos de maná,
 *  precios, jefes, eventos, etc.
 *
 *  Reglas para editar sin romper nada:
 *   - Cambiá sólo NÚMEROS y TEXTOS entre comillas.
 *   - No borres comas ni llaves { }.
 *   - Si algo se rompe, abrí tests/tests.html: te dice qué falla.
 *
 *  Unidades:
 *   - Tiempos (cooldown, duration, windup...) en SEGUNDOS.
 *   - Distancias (range, radius...) en PÍXELES (la arena mide 1280 x 720).
 *   - Velocidades en píxeles por segundo.
 *   - Porcentajes como decimales: 0.10 = 10 %.
 * ============================================================
 */
(function (root) {
  const BC = (root.BC = root.BC || {});

  BC.DATA = {
    version: 1,

    // ---------------------------------------------------------
    // CONFIGURACIÓN GENERAL
    // ---------------------------------------------------------
    config: {
      width: 1280,
      height: 720,
      wallTop: 72, // la parte de arriba deja lugar para la interfaz
      wall: 36,
      floorsPerRealm: 8, // salas por reino (la última siempre es el jefe)
      dash: { distance: 100, duration: 0.11, invuln: 0.24 },
      invulnAfterHit: 0.55,
      contactCooldown: 0.8,
      pickupRadius: 70,
      magnetSpeed: 520,
      rewardChoices: 3,
      waveNextThreshold: 2, // la siguiente oleada llega cuando quedan esta cantidad de enemigos o menos
      waveMaxTime: 13, // ...o cuando pasan estos segundos
      spawnTelegraph: 0.8,
      spawnMinDistance: 230,
      maxSkillLevel: 5,
      maxRelics: 6, // máximo de reliquias por partida
      maxPassives: 5, // máximo de pasivas DISTINTAS (las que tenés se pueden seguir subiendo)
      rerollEveryLevels: 3, // ganás 1 re-tirada de mejoras cada 3 niveles
      secretUnlockWins: 3, // victorias necesarias para que aparezca el reino secreto
      // HECHIZOS POTENCIADOS: salen de cofres, sobre una habilidad al nivel máximo
      evolution: { max: 2, damageMult: 1.6, cooldownMult: 0.8, sizeMult: 1.2, extraCount: 1 },
      // EXPERIENCIA: los enemigos dan XP; cada nivel pide más que el anterior
      //  XP para pasar del nivel N al N+1 = base * growth^(N-1)
      xp: { base: 30, growth: 1.33, perCost: 3, elite: 25, boss: 60 },
      // balas de los enemigos: multiplicador de velocidad (1 = la del enemigo en esta lista)
      enemyProjectileSpeed: 1.35,
    },

    // ---------------------------------------------------------
    // PERSONAJES
    // ---------------------------------------------------------
    characters: {
      asta: {
        id: 'asta',
        name: 'Asta',
        title: 'El chico sin magia de los Toros Negros',
        description:
          'No tiene maná, pero sus espadas anti-magia destruyen hechizos. Pelea cuerpo a cuerpo y se hace más fuerte cuando recibe daño.',
        color: '#2a2a2a',
        accent: '#f0f0f0',
        icon: '⚔️',
        letter: 'A',
        usesMana: false,
        base: { maxHp: 115, speed: 185, armor: 2, maxMana: 0, manaRegen: 0, critChance: 0.05, critMult: 1.5, dashCooldown: 1.0 },
        basicSkill: 'mataDemonios',
        skillPool: ['mataDemonios', 'destructora', 'habitante', 'zanka', 'meteorito'],
        trait: {
          id: 'determinacion',
          name: 'Determinación',
          desc: 'Cada golpe que recibís te da +5% de daño por 5 s (hasta 5 veces).',
          perStack: 0.05,
          maxStacks: 5,
          duration: 5,
        },
        ultimate: {
          id: 'modoDemonio',
          name: 'Modo Demonio',
          desc: 'Con la barra llena, apretá Q: +60% de daño, +25% de velocidad, -25% de enfriamientos y un poco de robo de vida. Riesgo: drena 2% de tu vida por segundo y al terminar quedás agotado 2 s.',
          gaugeMax: 100,
          gainPerHpLost: 0.55,
          gainPerDamageDealt: 0.008,
          gainPerAntimagic: 1.5,
          duration: 8,
          mods: { damagePct: 0.6, speedPct: 0.25, cooldownPct: 0.25, lifesteal: 0.006 },
          drainPctPerSec: 0.02,
          exhaustDuration: 2,
          exhaustSlow: 0.4,
        },
        quotes: {
          start: '¡Nunca me rendiré!',
          ult: '¡MODO DEMONIO!',
          boss: '¡Superaré mis límites aquí y ahora!',
          win: '¡Voy a ser el Rey Mago!',
          death: 'Esto... no termina acá...',
        },
      },

      yuno: {
        id: 'yuno',
        name: 'Yuno',
        title: 'Vicecapitán del Amanecer Dorado',
        description:
          'Magia de viento. Muy rápido, dispara cuchillas a distancia y su definitiva invoca a Sylph, el espíritu del viento.',
        color: '#1d3b5c',
        accent: '#7fe0c8',
        icon: '🌪️',
        letter: 'Y',
        usesMana: true,
        base: { maxHp: 115, speed: 210, armor: 2, maxMana: 100, manaRegen: 9, critChance: 0.08, critMult: 1.6, dashCooldown: 0.7 },
        basicSkill: 'cuchillasViento',
        skillPool: ['cuchillasViento', 'tornado', 'lluviaCuchillas', 'medialuna', 'escudoViento'],
        learnsElements: true, // puede aprender los hechizos elementales
        maxSkills: 6, // habilidades a la vez (sin contar la básica)
        trait: {
          id: 'vientoLibre',
          name: 'Viento Libre',
          desc: 'Tu dash se recarga más rápido y te devuelve 12 de maná.',
          manaOnDash: 12,
        },
        ultimate: {
          id: 'sylph',
          name: 'Sylph, Espíritu del Viento',
          desc: 'Con la barra llena, apretá Q: una tormenta daña a todos los enemigos cercanos; durante 9 s tus hechizos no cuestan maná, se recargan 40% más rápido y hacen +35% de daño.',
          gaugeMax: 100,
          gainPerManaSpent: 0.22,
          gainPerDamageDealt: 0.008,
          duration: 9,
          mods: { cooldownPct: 0.4, damagePct: 0.35, speedPct: 0.2 },
          freeMana: true,
          burst: { damage: 120, radius: 300 },
        },
        quotes: {
          start: 'Voy a ser el Rey Mago. No vos.',
          ult: '¡Sylph, presta tu poder!',
          boss: 'El viento está de mi lado.',
          win: 'Esta victoria es sólo un paso más.',
          death: 'Asta... seguí vos...',
        },
        unlockCost: 15,
      },

      noelle: {
        id: 'noelle',
        name: 'Noelle Silva',
        title: 'Princesa de la Casa Silva — Toros Negros',
        description:
          'Magia de agua. Controla zonas, frena enemigos y pega más fuerte cuanto más maná tiene. Su definitiva es la Armadura Valquiria.',
        color: '#5b4a8a',
        accent: '#8fd3ff',
        icon: '🌊',
        letter: 'N',
        usesMana: true,
        base: { maxHp: 125, speed: 185, armor: 4, maxMana: 160, manaRegen: 14, critChance: 0.05, critMult: 1.5, dashCooldown: 1.1 },
        basicSkill: 'balasAgua',
        skillPool: ['balasAgua', 'rugidoDragon', 'nidoDragon', 'lanzaValquiria', 'marejada'],
        learnsElements: true,
        maxSkills: 6,
        trait: {
          id: 'sangreReal',
          name: 'Sangre Real',
          desc: 'Hacés hasta +40% de daño según el porcentaje de maná que tengas.',
          maxBonus: 0.4,
        },
        ultimate: {
          id: 'valquiria',
          name: 'Armadura Valquiria',
          desc: 'Con la barra llena, apretá Q: +50% de daño, +6 de armadura y el doble de regeneración de maná. Tus balas de agua se vuelven lanzas que atraviesan.',
          gaugeMax: 100,
          gainPerSecHighMana: 2.2,
          gainPerDamageDealt: 0.009,
          duration: 9,
          mods: { damagePct: 0.5, armor: 6, manaRegenPct: 1.0 },
          empowerBasic: { pierce: 3, damagePct: 0.5 },
        },
        quotes: {
          start: '¡N-no lo hago por ustedes!',
          ult: '¡Armadura Valquiria!',
          boss: 'Una Silva no retrocede.',
          win: '¡Lo logré! ...Digo, era obvio.',
          death: 'Todavía... no soy suficiente...',
        },
        unlockCost: 25,
      },

      mago: {
        id: 'mago',
        name: 'Caballero Novato',
        title: 'Recién llegado a los Caballeros Mágicos',
        description:
          'Un mago común con estadísticas promedio, pero que puede aprender las habilidades de Asta, Yuno y Noelle (hasta 6 a la vez). Ideal para armar builds mezcladas.',
        color: '#3b4a3a',
        accent: '#ffd76a',
        icon: '🧙',
        letter: 'M',
        usesMana: true,
        base: { maxHp: 105, speed: 192, armor: 2, maxMana: 110, manaRegen: 9, critChance: 0.06, critMult: 1.5, dashCooldown: 0.9 },
        basicSkill: 'balaMagica',
        // puede aprender las habilidades de todos los personajes
        skillPool: [
          'balaMagica',
          'mataDemonios', 'destructora', 'habitante', 'zanka', 'meteorito',
          'cuchillasViento', 'tornado', 'lluviaCuchillas', 'medialuna', 'escudoViento',
          'balasAgua', 'rugidoDragon', 'nidoDragon', 'lanzaValquiria', 'marejada',
        ],
        learnsElements: true,
        maxSkills: 6, // habilidades a la vez (sin contar la básica)
        versatile: true, // aprende habilidades de otros personajes
        trait: {
          id: 'versatil',
          name: 'Versátil',
          desc: '+6% de daño por cada estilo distinto que domines (espadas de Asta, viento de Yuno, agua de Noelle).',
          perSchool: 0.06,
        },
        ultimate: {
          id: 'zonaMana',
          name: 'Zona de Maná',
          desc: 'Con la barra llena, apretá Q: durante 8 s controlás el maná del ambiente: +40% de daño, -35% de enfriamientos, el triple de regeneración de maná y los enemigos cercanos se frenan.',
          gaugeMax: 100,
          gainPerManaSpent: 0.16,
          gainPerDamageDealt: 0.009,
          duration: 8,
          mods: { damagePct: 0.4, cooldownPct: 0.35, manaRegenPct: 2.0 },
          slowRadius: 220,
          slow: 0.35,
        },
        quotes: {
          start: '¡Voy a demostrar lo que vale un mago común!',
          ult: '¡Zona de Maná!',
          boss: 'No soy especial... ¡pero no me rindo!',
          win: '¡Un mago común también puede llegar lejos!',
          death: 'Todavía... me falta entrenar...',
        },
      },
    },

    // ---------------------------------------------------------
    // HABILIDADES (GRIMORIO)  — se usan automáticamente
    //  base: valores en nivel 1
    //  perLevel: cuánto suma cada nivel
    //  at: bonus especiales al llegar a cierto nivel
    //  cost: maná por uso (Asta no usa maná)
    // ---------------------------------------------------------
    skills: {
      // ---------------- CABALLERO NOVATO ----------------
      balaMagica: {
        name: 'Bala Mágica',
        character: 'mago',
        icon: '✨',
        basic: true,
        behavior: 'projectile',
        cost: 0,
        desc: 'Un proyectil de maná puro al enemigo más cercano.',
        base: { damage: 16, cooldown: 0.55, count: 1, spread: 10, speed: 560, radius: 9, pierce: 0, range: 500, life: 1.0 },
        perLevel: { damage: 5 },
        at: { 3: { count: 1 }, 5: { pierce: 1 } },
        tags: ['magia'],
        projectileStyle: 'orb',
        color: '#ffe58a',
      },

      // ---------------- ELEMENTALES (Yuno, Noelle y el Caballero Novato; Asta no) ----------------
      // 8 elementos x 6 hechizos. Con los 6 de un elemento se activa su sinergia.
      // Nombres tomados de la wiki de Black Clover.

      // ===== FUEGO =====
      bolaFuego: {
        name: 'Bola Flamígera Explosiva', element: 'fuego', icon: '🔥', behavior: 'projectile', cost: 15,
        desc: 'Explota al impactar, daña en área y quema.',
        base: { damage: 30, cooldown: 2.4, count: 1, spread: 12, speed: 480, radius: 14, pierce: 0, splash: 60, splashPct: 0.6, range: 500, life: 1.2, burn: 8 },
        perLevel: { damage: 10, burn: 3 }, projectileStyle: 'orb',
      },
      ametralladoraFuego: {
        name: 'Ametralladora de Bolas Flamígeras', element: 'fuego', icon: '☄️', behavior: 'projectile', cost: 12,
        desc: 'Una ráfaga de pequeñas bolas de fuego que queman.',
        base: { damage: 10, cooldown: 1.6, count: 3, spread: 16, speed: 620, radius: 8, pierce: 0, range: 480, life: 0.9, burn: 4 },
        perLevel: { damage: 3, burn: 1 }, at: { 3: { count: 1 }, 5: { count: 1 } }, projectileStyle: 'orb',
      },
      espiralFuego: {
        name: 'Espiral de Fuego', element: 'fuego', icon: '🌀', behavior: 'zoneAtTarget', cost: 18,
        desc: 'Un remolino de llamas sobre un enemigo que quema a todos los que toca.',
        base: { damage: 9, tickRate: 0.25, duration: 3, radius: 75, pull: 0, cooldown: 5, range: 450, burn: 6 },
        perLevel: { damage: 3, radius: 6 }, zoneKind: 'field', zoneIcon: '🔥',
      },
      leoRugiens: {
        name: 'Leo Rugiens', element: 'fuego', icon: '🦁', behavior: 'beam', cost: 26,
        desc: 'El rugido del león de fuego de Fuegoleon: un torrente de llamas en línea.',
        base: { damage: 18, tickRate: 0.1, duration: 0.7, length: 380, width: 60, cooldown: 6, range: 380 },
        perLevel: { damage: 6, length: 25 }, beamIcon: '🦁',
      },
      garraSalamandra: {
        name: 'Garra de Salamandra', element: 'fuego', icon: '🦎', behavior: 'meleeArc', cost: 8,
        desc: 'Un zarpazo de fuego en arco que quema a los enemigos cercanos.',
        base: { damage: 22, cooldown: 1.2, range: 110, arc: 140, knockback: 120, noAntimagic: 1, burn: 5 },
        perLevel: { damage: 7, range: 6 }, slashColor: '#ff7b3a',
      },
      ignisColumna: {
        name: 'Ignis Columna', element: 'fuego', icon: '🏛️', behavior: 'shockwave', cost: 16,
        desc: 'Una columna de fuego que estalla a tu alrededor y empuja.',
        base: { damage: 28, maxRadius: 190, speed: 460, knockback: 260, cooldown: 5, triggerRange: 170 },
        perLevel: { damage: 9, maxRadius: 12 },
      },

      // ===== AGUA =====
      esferaAgua: {
        name: 'Bala Asesina de Agua Bendita', element: 'agua', icon: '🔵', behavior: 'projectile', cost: 12,
        desc: 'Una esfera de agua que atraviesa a un enemigo y frena 35% a los que toca durante 2 s.',
        base: { damage: 18, cooldown: 2.0, count: 1, spread: 14, speed: 420, radius: 13, pierce: 1, range: 480, life: 1.3, slowOnHit: 0.35, slowTime: 2 },
        perLevel: { damage: 6 }, at: { 3: { count: 1 }, 5: { count: 1 } }, projectileStyle: 'orb',
      },
      jabalinaAgua: {
        name: 'Jabalina de Agua', element: 'agua', icon: '🔱', behavior: 'projectile', cost: 14,
        desc: 'Una jabalina veloz que atraviesa a varios enemigos.',
        base: { damage: 32, cooldown: 2.2, count: 1, spread: 10, speed: 760, radius: 11, pierce: 3, range: 560, life: 0.9 },
        perLevel: { damage: 10 }, at: { 4: { count: 1 } }, projectileStyle: 'spear',
      },
      corteSerpiente: {
        name: 'Corte de la Serpiente del Mar', element: 'agua', icon: '🐍', behavior: 'pierceLine', cost: 16,
        desc: 'Un corte de agua en línea recta que atraviesa todo.',
        base: { damage: 36, cooldown: 3, range: 320, width: 50, noAntimagic: 1 },
        perLevel: { damage: 12, range: 15 }, slashColor: '#4fb6ff',
      },
      olasCrecientes: {
        name: 'Olas Crecientes', element: 'agua', icon: '🌊', behavior: 'shockwave', cost: 18,
        desc: 'Una ola que empuja lejos a los enemigos y los frena.',
        base: { damage: 20, maxRadius: 220, speed: 420, knockback: 380, cooldown: 5.5, triggerRange: 170, slow: 0.4 },
        perLevel: { damage: 7, maxRadius: 14 },
      },
      martilloDiosMar: {
        name: 'Martillo del Dios del Mar', element: 'agua', icon: '🔨', behavior: 'groundSlam', cost: 22,
        desc: 'Un martillo de agua cae sobre el grupo más denso.',
        base: { damage: 60, cooldown: 6, radius: 105, range: 420, knockback: 220, delay: 0.45 },
        perLevel: { damage: 20, radius: 8 }, slamIcon: '💧',
      },
      cortinaAgua: {
        name: 'Cortina de Agua', element: 'agua', icon: '🫧', behavior: 'dome', cost: 24,
        desc: 'Una cortina de agua a tu alrededor que bloquea proyectiles y frena enemigos.',
        base: { damage: 5, tickRate: 0.5, duration: 4, radius: 120, slow: 0.35, cooldown: 10, triggerRange: 240 },
        perLevel: { damage: 3, radius: 10, duration: 0.4 },
      },

      // ===== TIERRA =====
      pilaresTierra: {
        name: 'Violenta Madre Tierra', element: 'tierra', icon: '🪨', behavior: 'groundSlam', cost: 18,
        desc: 'Pilares de roca brotan bajo el grupo de enemigos más denso y los empujan.',
        base: { damage: 55, cooldown: 5.5, radius: 95, range: 400, knockback: 200, delay: 0.5 },
        perLevel: { damage: 18, radius: 8 }, slamIcon: '🪨',
      },
      terrenoElevado: {
        name: 'Terreno Elevado', element: 'tierra', icon: '⛰️', behavior: 'radialBurst', cost: 16,
        desc: 'El suelo estalla y lanza rocas en todas las direcciones.',
        base: { damage: 18, count: 8, speed: 440, radius: 11, pierce: 0, cooldown: 4, life: 0.8, triggerRange: 260 },
        perLevel: { damage: 6, count: 1 }, projectileStyle: 'orb',
      },
      muroTierra: {
        name: 'Muro de Tierra', element: 'tierra', icon: '🧱', behavior: 'buff', cost: 18,
        desc: 'Te rodeás de tierra: +8 de armadura durante 5 s.',
        base: { cooldown: 11, duration: 5, armor: 8, triggerRange: 260 },
        perLevel: { armor: 2, duration: 0.5 },
      },
      selloTerron: {
        name: 'Sello Terrón', element: 'tierra', icon: '🟫', behavior: 'zoneAtTarget', cost: 14,
        desc: 'Convierte el suelo en barro: los enemigos se frenan 50% y reciben daño.',
        base: { damage: 6, tickRate: 0.5, duration: 4, radius: 90, pull: 0, cooldown: 5.5, range: 420, slow: 0.5 },
        perLevel: { damage: 3, radius: 8 }, zoneKind: 'field', zoneIcon: '🟫',
      },
      punoRoca: {
        name: 'Puño de Roca', element: 'tierra', icon: '👊', behavior: 'projectile', cost: 14,
        desc: 'Una roca enorme que golpea fuerte y empuja.',
        base: { damage: 44, cooldown: 2.6, count: 1, spread: 10, speed: 400, radius: 18, pierce: 0, range: 450, life: 1.3, knockback: 320 },
        perLevel: { damage: 14 }, projectileStyle: 'orb',
      },
      paredTierra: {
        name: 'Pared de Tierra', element: 'tierra', icon: '🌋', behavior: 'shockwave', cost: 16,
        desc: 'El suelo se levanta en un anillo que golpea y empuja.',
        base: { damage: 26, maxRadius: 200, speed: 380, knockback: 340, cooldown: 6, triggerRange: 160 },
        perLevel: { damage: 9, maxRadius: 12 },
      },

      // ===== VIENTO =====
      rafagaViento: {
        name: 'Arco Blanco del Vendaval', element: 'viento', icon: '🌬️', behavior: 'shockwave', cost: 14,
        desc: 'Una ráfaga circular que empuja lejos a los enemigos que se acercan.',
        base: { damage: 22, maxRadius: 230, speed: 520, knockback: 420, cooldown: 5, triggerRange: 160 },
        perLevel: { damage: 8, maxRadius: 15 },
      },
      torreTornado: {
        name: 'Torre Tornado', element: 'viento', icon: '🌪️', behavior: 'zoneAtTarget', cost: 18,
        desc: 'Un tornado que atrae y corta a los enemigos.',
        base: { damage: 9, tickRate: 0.25, duration: 3, radius: 70, pull: 150, cooldown: 5.5, range: 450 },
        perLevel: { damage: 3, radius: 7 },
      },
      colmilloTornado: {
        name: 'Colmillo Tornado', element: 'viento', icon: '🌀', behavior: 'projectile', cost: 14,
        desc: 'Un remolino cortante que atraviesa todo a su paso.',
        base: { damage: 26, cooldown: 3, count: 1, spread: 14, speed: 420, radius: 22, pierce: 99, range: 520, life: 1.4 },
        perLevel: { damage: 9 }, at: { 4: { count: 1 } }, projectileStyle: 'crescent',
      },
      halconVendaval: {
        name: 'Halcón Blanco del Vendaval', element: 'viento', icon: '🦅', behavior: 'projectile', cost: 12,
        desc: 'Halcones de viento que persiguen a los enemigos.',
        base: { damage: 16, cooldown: 1.8, count: 2, spread: 40, speed: 420, radius: 10, pierce: 0, range: 520, life: 1.8, homing: 5 },
        perLevel: { damage: 5 }, at: { 3: { count: 1 }, 5: { count: 1 } }, projectileStyle: 'blade',
      },
      agujasPerforantes: {
        name: 'Remolino de Agujas Perforantes', element: 'viento', icon: '📍', behavior: 'radialBurst', cost: 16,
        desc: 'Decenas de agujas de viento en todas las direcciones.',
        base: { damage: 9, count: 14, speed: 560, radius: 6, pierce: 1, cooldown: 3.5, life: 0.7, triggerRange: 260 },
        perLevel: { damage: 3, count: 2 }, projectileStyle: 'blade',
      },
      nubeLadron: {
        name: 'Nube del Ladrón', element: 'viento', icon: '☁️', behavior: 'buff', cost: 14,
        desc: 'Una nube te lleva: +25% de velocidad y +20% de evasión durante 4 s.',
        base: { cooldown: 10, duration: 4, speedPct: 0.25, evasion: 0.2, triggerRange: 240 },
        perLevel: { duration: 0.5, evasion: 0.03 },
      },

      // ===== RAYO =====
      rayoCadena: {
        name: 'Rayo en Cadena', element: 'rayo', icon: '⚡', behavior: 'chain', cost: 16,
        desc: 'Un rayo que salta de enemigo en enemigo.',
        base: { damage: 26, cooldown: 2.2, range: 420, jumps: 3, jumpRange: 170 },
        perLevel: { damage: 8 }, at: { 3: { jumps: 1 }, 5: { jumps: 2 } },
      },
      botasTrueno: {
        name: 'Botas del Dios del Trueno', element: 'rayo', icon: '👢', behavior: 'buff', cost: 14,
        desc: 'Las botas de Luck: +35% de velocidad y +20% de daño durante 4 s.',
        base: { cooldown: 10, duration: 4, speedPct: 0.35, damagePct: 0.2, triggerRange: 260 },
        perLevel: { duration: 0.5, damagePct: 0.05 },
      },
      guantesTrueno: {
        name: 'Guantes del Dios del Trueno', element: 'rayo', icon: '🥊', behavior: 'meleeArc', cost: 6,
        desc: 'Puñetazos eléctricos a los enemigos cercanos.',
        base: { damage: 20, cooldown: 0.9, range: 95, arc: 100, knockback: 160, noAntimagic: 1 },
        perLevel: { damage: 6 }, slashColor: '#fff36a',
      },
      lanzaTrueno: {
        name: 'Lanza del Trueno', element: 'rayo', icon: '🗲', behavior: 'projectile', cost: 12,
        desc: 'Una lanza de rayo veloz que atraviesa.',
        base: { damage: 28, cooldown: 1.8, count: 1, spread: 10, speed: 950, radius: 9, pierce: 2, range: 600, life: 0.7 },
        perLevel: { damage: 9 }, projectileStyle: 'spear',
      },
      bestiaRayo: {
        name: 'Bestias del Relámpago', element: 'rayo', icon: '🐺', behavior: 'orbit', cost: 0,
        desc: 'Esferas de rayo que giran a tu alrededor (no gastan maná).',
        base: { damage: 14, count: 2, orbitRadius: 90, angularSpeed: 4.2, radius: 11, hitCooldown: 0.4 },
        perLevel: { damage: 4, count: 1 },
      },
      juicioRayo: {
        name: 'Juicio del Rayo', element: 'rayo', icon: '🌩️', behavior: 'groundSlam', cost: 20,
        desc: 'Un rayo cae del cielo sobre el grupo más denso.',
        base: { damage: 70, cooldown: 5.5, radius: 80, range: 450, knockback: 120, delay: 0.25 },
        perLevel: { damage: 22, radius: 6 }, slamIcon: '⚡',
      },

      // ===== ACERO =====
      lanzaGiratoria: {
        name: 'Lanza Giratoria Violenta', element: 'acero', icon: '🌀', behavior: 'projectile', cost: 14,
        desc: 'Una lanza de acero que gira y perfora varios enemigos.',
        base: { damage: 30, cooldown: 2.2, count: 1, spread: 12, speed: 620, radius: 12, pierce: 3, range: 540, life: 1 },
        perLevel: { damage: 10 }, at: { 4: { count: 1 } }, projectileStyle: 'spear',
      },
      lanzaPerforante: {
        name: 'Furiosa Lanza Perforante', element: 'acero', icon: '🗡️', behavior: 'pierceLine', cost: 16,
        desc: 'Una estocada de acero muy larga que atraviesa todo.',
        base: { damage: 40, cooldown: 3, range: 380, width: 34, noAntimagic: 1 },
        perLevel: { damage: 13, range: 15 }, slashColor: '#b8c4cc',
      },
      castilloAcero: {
        name: 'Pared Blindada del Castillo de Acero', element: 'acero', icon: '🏰', behavior: 'buff', cost: 22,
        desc: 'Un castillo de acero te protege: +14 de armadura durante 5 s.',
        base: { cooldown: 12, duration: 5, armor: 14, triggerRange: 260 },
        perLevel: { armor: 3, duration: 0.5 },
      },
      flechaRelampago: {
        name: 'Flecha Relámpago', element: 'acero', icon: '🏹', behavior: 'projectile', cost: 14,
        desc: 'Una flecha de acero rapidísima con mucho daño.',
        base: { damage: 48, cooldown: 2.4, count: 1, spread: 8, speed: 1000, radius: 8, pierce: 0, range: 650, life: 0.7 },
        perLevel: { damage: 15 }, at: { 5: { count: 1 } }, projectileStyle: 'spear',
      },
      cadenasAcero: {
        name: 'Cadenas de Acero', element: 'acero', icon: '⛓️', behavior: 'zoneAtTarget', cost: 16,
        desc: 'Cadenas que atrapan a los enemigos: los frenan 70% y los dañan.',
        base: { damage: 7, tickRate: 0.5, duration: 3, radius: 80, pull: 40, cooldown: 6, range: 420, slow: 0.7 },
        perLevel: { damage: 3, radius: 6, duration: 0.3 }, zoneKind: 'field', zoneIcon: '⛓️',
      },
      espadasAcero: {
        name: 'Lluvia de Espadas de Acero', element: 'acero', icon: '⚔️', behavior: 'radialBurst', cost: 20,
        desc: 'Espadas de acero salen disparadas en todas las direcciones.',
        base: { damage: 20, count: 10, speed: 520, radius: 9, pierce: 2, cooldown: 4.5, life: 0.8, triggerRange: 280 },
        perLevel: { damage: 7, count: 1 }, projectileStyle: 'blade',
      },

      // ===== PLANTA =====
      canonFloral: {
        name: 'Cañón Floral Mágico', element: 'planta', icon: '🌺', behavior: 'projectile', cost: 14,
        desc: 'Un cañonazo de flores que atraviesa enemigos.',
        base: { damage: 30, cooldown: 2.2, count: 1, spread: 12, speed: 520, radius: 15, pierce: 2, range: 520, life: 1.1 },
        perLevel: { damage: 10 }, at: { 4: { count: 1 } }, projectileStyle: 'orb',
      },
      cestaFloral: {
        name: 'Cesta Floral de Curación de Sueños', element: 'planta', icon: '🧺', behavior: 'buff', cost: 20,
        desc: 'Mimosa te cura: recuperás 10% de tu vida al instante.',
        base: { cooldown: 12, duration: 0.1, healPct: 0.1, whenHurt: 0.8 },
        perLevel: { healPct: 0.02 },
      },
      vestidoFloral: {
        name: 'Vestido Floral de Recuperación', element: 'planta', icon: '👗', behavior: 'buff', cost: 18,
        desc: 'Un vestido de flores: regenerás 4 de vida por segundo durante 5 s.',
        base: { cooldown: 12, duration: 5, regen: 4, whenHurt: 0.9 },
        perLevel: { regen: 1 },
      },
      polenMagico: {
        name: 'Polen Mágico', element: 'planta', icon: '🌼', behavior: 'zoneAtTarget', cost: 14,
        desc: 'Una nube de polen que frena y daña a los enemigos.',
        base: { damage: 7, tickRate: 0.5, duration: 4, radius: 95, pull: 0, cooldown: 5.5, range: 420, slow: 0.35 },
        perLevel: { damage: 3, radius: 8 }, zoneKind: 'field', zoneIcon: '🌼',
      },
      enredadera: {
        name: 'Enredadera Mágica de Control', element: 'planta', icon: '🌿', behavior: 'groundSlam', cost: 16,
        desc: 'Enredaderas brotan bajo los enemigos, los dañan y los frenan.',
        base: { damage: 40, cooldown: 5, radius: 100, range: 420, knockback: 0, delay: 0.4, slow: 0.6 },
        perLevel: { damage: 13, radius: 8 }, slamIcon: '🌿',
      },
      orientacionFloral: {
        name: 'Orientación Floral Mágica', element: 'planta', icon: '🌸', behavior: 'orbit', cost: 0,
        desc: 'Pétalos que giran a tu alrededor y cortan (no gastan maná).',
        base: { damage: 11, count: 3, orbitRadius: 65, angularSpeed: 2.6, radius: 10, hitCooldown: 0.5 },
        perLevel: { damage: 4, count: 1 },
      },

      // ===== VENENO =====
      nidoNubesVenenosas: {
        name: 'Nido de Nubes Venenosas', element: 'veneno', icon: '☁️', behavior: 'zoneAtTarget', cost: 16,
        desc: 'Una nube venenosa que envenena a los que la atraviesan.',
        base: { damage: 5, tickRate: 0.5, duration: 4.5, radius: 95, pull: 0, cooldown: 5.5, range: 430, poison: 6 },
        perLevel: { damage: 2, radius: 8, poison: 2 }, zoneKind: 'field', zoneIcon: '☠️',
      },
      aufwachenDachs: {
        name: 'Aufwachen Dachs', element: 'veneno', icon: '🦡', behavior: 'projectile', cost: 10,
        desc: 'Un tejón venenoso que muerde y envenena.',
        base: { damage: 14, cooldown: 1.6, count: 1, spread: 12, speed: 480, radius: 11, pierce: 0, range: 480, life: 1.1, poison: 7 },
        perLevel: { damage: 4, poison: 2 }, at: { 3: { count: 1 } }, projectileStyle: 'orb',
      },
      verbotenObst: {
        name: 'Verboten Obst', element: 'veneno', icon: '🍎', behavior: 'projectile', cost: 16,
        desc: 'La fruta prohibida: explota y envenena a todos alrededor.',
        base: { damage: 22, cooldown: 3, count: 1, spread: 12, speed: 420, radius: 14, pierce: 0, splash: 75, splashPct: 0.7, range: 480, life: 1.2, poison: 8 },
        perLevel: { damage: 7, poison: 2, splash: 5 }, projectileStyle: 'orb',
      },
      violettSchirm: {
        name: 'Violett Schirm', element: 'veneno', icon: '☂️', behavior: 'dome', cost: 22,
        desc: 'Un paraguas violeta: bloquea proyectiles y envenena a los que se acercan.',
        base: { damage: 6, tickRate: 0.5, duration: 4, radius: 125, slow: 0.25, cooldown: 10, triggerRange: 240, poison: 6 },
        perLevel: { damage: 3, radius: 8, poison: 2 },
      },
      auraToxica: {
        name: 'Aura Tóxica', element: 'veneno', icon: '🟣', behavior: 'aura', cost: 0,
        desc: 'Un aura de veneno a tu alrededor que envenena a los cercanos (no gasta maná).',
        base: { damage: 3, tickRate: 0.5, radius: 95, poison: 4 },
        perLevel: { damage: 1, radius: 8, poison: 1.5 },
      },
      dagasVeneno: {
        name: 'Dagas Venenosas', element: 'veneno', icon: '🗡️', behavior: 'radialBurst', cost: 14,
        desc: 'Dagas envenenadas en todas las direcciones.',
        base: { damage: 11, count: 8, speed: 500, radius: 8, pierce: 1, cooldown: 3.5, life: 0.75, triggerRange: 260, poison: 5 },
        perLevel: { damage: 4, count: 1, poison: 1 }, projectileStyle: 'blade',
      },

      // ---------------- ASTA ----------------
      mataDemonios: {
        name: 'Espada Mata-Demonios',
        character: 'asta',
        icon: '🗡️',
        basic: true,
        behavior: 'meleeArc',
        cost: 0,
        desc: 'Tajo en arco al enemigo más cercano. Destruye los proyectiles mágicos que toca.',
        base: { damage: 20, cooldown: 0.6, range: 95, arc: 110, knockback: 140 },
        perLevel: { damage: 6, range: 5, arc: 8 },
        tags: ['espada', 'antimagia'],
      },
      destructora: {
        name: 'Espada Destructora de Demonios',
        character: 'asta',
        icon: '🔱',
        behavior: 'pierceLine',
        cost: 0,
        desc: 'Estocada en línea que atraviesa a todos los enemigos y anula los hechizos del camino.',
        base: { damage: 42, cooldown: 3.0, range: 300, width: 36 },
        perLevel: { damage: 14, range: 20, cooldown: -0.2 },
        tags: ['espada', 'antimagia'],
      },
      habitante: {
        name: 'Espada Habitante de Demonios',
        character: 'asta',
        icon: '🌀',
        behavior: 'absorbRelease',
        cost: 0,
        desc: 'Absorbe los hechizos que destruís (y un poco de maná del ambiente) y los libera en una onda cortante.',
        base: { damage: 30, perCharge: 10, maxCharges: 10, chargesPerSecond: 0.6, cooldown: 4.5, speed: 520, radius: 28, range: 600, life: 1.3 },
        perLevel: { damage: 10, perCharge: 3, maxCharges: 2 },
        tags: ['espada', 'antimagia'],
      },
      zanka: {
        name: 'Zanka (Tajo Volador)',
        character: 'asta',
        icon: '🌙',
        behavior: 'projectile',
        cost: 0,
        desc: 'Lanza tajos voladores anti-magia que atraviesan enemigos y destruyen proyectiles.',
        base: { damage: 24, cooldown: 2.2, count: 1, spread: 14, speed: 560, radius: 18, pierce: 3, range: 520, life: 1.0, antimagic: 1 },
        perLevel: { damage: 6 },
        at: { 3: { count: 1 }, 5: { count: 1, pierce: 2 } },
        tags: ['espada', 'antimagia'],
        projectileStyle: 'crescent',
        color: '#e9e9e9',
      },
      meteorito: {
        name: 'Meteorito Negro',
        character: 'asta',
        icon: '☄️',
        behavior: 'groundSlam',
        cost: 0,
        desc: 'Un golpe anti-magia cae sobre el grupo de enemigos más denso.',
        base: { damage: 65, cooldown: 7, radius: 110, range: 380, knockback: 260, delay: 0.35 },
        perLevel: { damage: 18, radius: 10, cooldown: -0.4 },
        tags: ['espada'],
      },

      // ---------------- YUNO ----------------
      cuchillasViento: {
        name: 'Cuchillas de Viento',
        character: 'yuno',
        icon: '🍃',
        basic: true,
        behavior: 'projectile',
        cost: 0,
        desc: 'Dispara cuchillas de viento al enemigo más cercano.',
        base: { damage: 16, cooldown: 0.5, count: 1, spread: 10, speed: 640, radius: 9, pierce: 0, range: 520, life: 0.95 },
        perLevel: { damage: 4 },
        at: { 2: { count: 1 }, 4: { count: 1 }, 5: { pierce: 1 } },
        tags: ['viento'],
        projectileStyle: 'blade',
        color: '#9ff5d6',
      },
      tornado: {
        name: 'Tornado Ascendente',
        character: 'yuno',
        icon: '🌪️',
        behavior: 'zoneAtTarget',
        cost: 18,
        desc: 'Crea un tornado sobre un enemigo que atrae y daña a los que estén cerca.',
        base: { damage: 10, tickRate: 0.25, duration: 3, radius: 70, pull: 140, cooldown: 5, range: 450 },
        perLevel: { damage: 4, radius: 8, duration: 0.3 },
        tags: ['viento'],
      },
      lluviaCuchillas: {
        name: 'Lluvia de Cuchillas',
        character: 'yuno',
        icon: '💨',
        behavior: 'radialBurst',
        cost: 22,
        desc: 'Lanza cuchillas de viento en todas las direcciones.',
        base: { damage: 20, count: 8, speed: 520, radius: 9, pierce: 1, cooldown: 4, life: 0.8, triggerRange: 300 },
        perLevel: { damage: 6, count: 2 },
        tags: ['viento'],
        projectileStyle: 'blade',
        color: '#c4fff0',
      },
      medialuna: {
        name: 'Media Luna de Viento',
        character: 'yuno',
        icon: '🌙',
        behavior: 'projectile',
        cost: 16,
        desc: 'Una enorme media luna de viento que atraviesa todo a su paso.',
        base: { damage: 45, cooldown: 2.6, count: 1, spread: 18, speed: 480, radius: 28, pierce: 99, range: 560, life: 1.3 },
        perLevel: { damage: 14 },
        at: { 4: { count: 1 } },
        tags: ['viento'],
        projectileStyle: 'crescent',
        color: '#7fe0c8',
      },
      escudoViento: {
        name: 'Escudo de Viento',
        character: 'yuno',
        icon: '🌀',
        behavior: 'orbit',
        cost: 0,
        desc: 'Cuchillas que giran a tu alrededor y cortan a los enemigos que se acercan.',
        base: { damage: 12, count: 2, orbitRadius: 72, angularSpeed: 3.2, radius: 12, hitCooldown: 0.5 },
        perLevel: { damage: 4, count: 1 },
        tags: ['viento'],
      },

      // ---------------- NOELLE ----------------
      balasAgua: {
        name: 'Balas de Agua',
        character: 'noelle',
        icon: '💧',
        basic: true,
        behavior: 'projectile',
        cost: 0,
        desc: 'Esferas de agua que salpican al impactar.',
        base: { damage: 18, cooldown: 0.6, count: 1, spread: 12, speed: 440, radius: 11, pierce: 0, splash: 40, splashPct: 0.5, range: 480, life: 1.2 },
        perLevel: { damage: 5, splash: 6 },
        at: { 3: { count: 1 }, 5: { count: 1 } },
        tags: ['agua'],
        projectileStyle: 'orb',
        color: '#5ec8ff',
      },
      rugidoDragon: {
        name: 'Rugido del Dragón Marino',
        character: 'noelle',
        icon: '🐉',
        behavior: 'beam',
        cost: 28,
        desc: 'Un torrente de agua en línea recta que daña continuamente.',
        base: { damage: 16, tickRate: 0.1, duration: 0.8, length: 420, width: 46, cooldown: 4.5, range: 420 },
        perLevel: { damage: 5, length: 30, width: 6 },
        tags: ['agua'],
      },
      nidoDragon: {
        name: 'Nido del Dragón Marino',
        character: 'noelle',
        icon: '🫧',
        behavior: 'dome',
        cost: 30,
        desc: 'Una cúpula de agua a tu alrededor: frena a los enemigos, los daña y bloquea proyectiles.',
        base: { damage: 8, tickRate: 0.5, duration: 4, radius: 140, slow: 0.45, cooldown: 9, triggerRange: 250 },
        perLevel: { damage: 4, radius: 14, duration: 0.5 },
        tags: ['agua'],
      },
      lanzaValquiria: {
        name: 'Lanza de la Valquiria',
        character: 'noelle',
        icon: '🔱',
        behavior: 'projectile',
        cost: 20,
        desc: 'Una lanza de agua veloz que atraviesa varios enemigos.',
        base: { damage: 55, cooldown: 3.2, count: 1, spread: 10, speed: 720, radius: 14, pierce: 4, range: 600, life: 0.9 },
        perLevel: { damage: 16 },
        at: { 5: { count: 1 } },
        tags: ['agua'],
        projectileStyle: 'spear',
        color: '#bfe9ff',
      },
      marejada: {
        name: 'Marejada del Dragón',
        character: 'noelle',
        icon: '🌊',
        behavior: 'shockwave',
        cost: 22,
        desc: 'Una ola circular que empuja y daña a los enemigos cercanos.',
        base: { damage: 30, maxRadius: 200, speed: 420, knockback: 320, cooldown: 5.5, triggerRange: 180 },
        perLevel: { damage: 10, maxRadius: 15 },
        tags: ['agua'],
      },
    },

    // ---------------------------------------------------------
    // ELEMENTOS (para los hechizos elementales)
    // ---------------------------------------------------------
    elements: {
      fuego: { name: 'Fuego', icon: '🔥', color: '#ff7b3a' },
      agua: { name: 'Agua', icon: '💧', color: '#4fb6ff' },
      tierra: { name: 'Tierra', icon: '🪨', color: '#c08a4a' },
      viento: { name: 'Viento', icon: '🌪️', color: '#c4fff0' },
      rayo: { name: 'Rayo', icon: '⚡', color: '#fff36a' },
      acero: { name: 'Acero', icon: '⚙️', color: '#cfd8dc' },
      planta: { name: 'Planta', icon: '🌿', color: '#7be36a' },
      veneno: { name: 'Veneno', icon: '☠️', color: '#b36bff' },
    },

    // ---------------------------------------------------------
    // HECHIZOS POTENCIADOS: nombre de cada habilidad al potenciarse
    // (efecto: ver config.evolution)
    // ---------------------------------------------------------
    evolutions: {
      balaMagica: 'Bala Mágica Suprema',
      bolaFuego: 'Máxima Bola Flamígera Explosiva',
      ametralladoraFuego: 'Esfumantes Bolas Flamígeras Explosivas',
      espiralFuego: 'Espiral de Fuego Infernal',
      leoRugiens: 'Leo Rugiens: León Real',
      garraSalamandra: 'Calidus Brachium - Purgatorio',
      ignisColumna: 'Cruz de Llama Brillante',
      esferaAgua: 'Bala Santa del Dios del Mar',
      jabalinaAgua: 'Celacanto Escalador',
      corteSerpiente: 'Espiral de la Serpiente del Mar',
      olasCrecientes: 'Corriente del Río de la Fortuna',
      martilloDiosMar: 'Martillo Divino del Dios del Mar',
      cortinaAgua: 'Escudo del Dios del Mar',
      pilaresTierra: 'Furia de la Madre Tierra',
      terrenoElevado: 'Terremoto Elevado',
      muroTierra: 'Fortaleza de Tierra',
      selloTerron: 'Gran Sello Terrón',
      punoRoca: 'Puño del Titán',
      paredTierra: 'Gran Pared de Tierra',
      rafagaViento: 'Vendaval Cortante del Emperador',
      torreTornado: 'Vendaval Cortante - Tempestad',
      colmilloTornado: 'Vendaval Cortante - Torbellino',
      halconVendaval: 'Bandada de Halcones del Vendaval',
      agujasPerforantes: 'Vendaval Cortante - Viento Invernal',
      nubeLadron: 'Arca de Viento Celestial',
      rayoCadena: 'Cadena del Dios del Trueno',
      botasTrueno: 'Armadura del Dios del Trueno',
      guantesTrueno: 'Puño del Dios del Trueno',
      lanzaTrueno: 'Lanza Divina del Trueno',
      bestiaRayo: 'Jauría del Relámpago',
      juicioRayo: 'Juicio Final del Rayo',
      lanzaGiratoria: 'Lanza Giratoria Imparable',
      lanzaPerforante: 'Lanza Perforante del Castillo',
      castilloAcero: 'Le Château du Verre',
      flechaRelampago: 'Flecha Relámpago Definitiva',
      cadenasAcero: 'Restricción de Acero Absoluta',
      espadasAcero: 'Tormenta de Espadas de Acero',
      canonFloral: 'Gran Cañón Floral',
      cestaFloral: 'Flor de la Verdad',
      vestidoFloral: 'Vestido Floral Real',
      polenMagico: 'Tormenta de Polen Mágico',
      enredadera: 'Bosque de Enredaderas',
      orientacionFloral: 'Danza de Pétalos',
      nidoNubesVenenosas: 'Nido de Nubes de la Muerte',
      aufwachenDachs: 'Manada Venenosa',
      verbotenObst: 'Fruto del Edén Prohibido',
      violettSchirm: 'Gran Paraguas Violeta',
      auraToxica: 'Miasma Mortal',
      dagasVeneno: 'Lluvia de Dagas Venenosas',
      mataDemonios: 'Mata-Demonios: Tajo Negro',
      destructora: 'Destructora: Divisor Negro',
      habitante: 'Habitante: Liberación Total',
      zanka: 'Zanka Negro',
      meteorito: 'Meteorito Negro Definitivo',
      cuchillasViento: 'Tormenta de Cuchillas',
      tornado: 'Tornado del Espíritu',
      lluviaCuchillas: 'Tormenta Espiritual',
      medialuna: 'Luna Creciente Kamaitachi',
      escudoViento: 'Aliento de Sylph',
      balasAgua: 'Bala Asesina del Dragón',
      rugidoDragon: 'Rugido del Dragón Real',
      nidoDragon: 'Cuna del Dragón del Mar',
      lanzaValquiria: 'Lanza Matadioses de la Valquiria',
      marejada: 'Olas del Dragón Marino',
    },

    // ---------------------------------------------------------
    // PASIVAS (se pueden apilar hasta maxStacks)
    // requiresMana: sólo aparecen para personajes con maná
    // ---------------------------------------------------------
    passives: {
      musculos: { name: 'Entrenamiento Muscular', icon: '💪', desc: '+10% de daño.', maxStacks: 5, mods: { damagePct: 0.1 } },
      vitalidad: { name: 'Vitalidad de Toro', icon: '❤️', desc: '+20 de vida máxima (y te cura 20).', maxStacks: 5, mods: { maxHp: 20 }, onPick: { heal: 20 } },
      piesLigeros: { name: 'Pies Ligeros', icon: '👟', desc: '+5% de velocidad de movimiento.', maxStacks: 3, mods: { speedPct: 0.05 } },
      concentracion: { name: 'Concentración de Maná', icon: '🔷', desc: '+20% de maná máximo.', maxStacks: 4, mods: { maxManaPct: 0.2 }, requiresMana: true },
      flujoMana: { name: 'Flujo de Maná', icon: '💧', desc: '+20% de regeneración de maná.', maxStacks: 4, mods: { manaRegenPct: 0.2 }, requiresMana: true },
      celeridad: { name: 'Celeridad', icon: '⏱️', desc: '-7% de enfriamiento de habilidades.', maxStacks: 5, mods: { cooldownPct: 0.07 } },
      pielAcero: { name: 'Piel de Acero', icon: '🛡️', desc: '+2 de armadura.', maxStacks: 5, mods: { armor: 2 } },
      ojoHalcon: { name: 'Ojo de Halcón', icon: '🎯', desc: '+6% de probabilidad de crítico.', maxStacks: 5, mods: { critChance: 0.06 } },
      recuperacion: { name: 'Recuperación', icon: '✨', desc: 'Regenerás 0.8 de vida por segundo.', maxStacks: 4, mods: { regen: 0.8 } },
      bolsillo: { name: 'Bolsillo de Yules', icon: '💰', desc: '+30 de radio de recolección y +15% de yules.', maxStacks: 3, mods: { pickupRadius: 30, yulPct: 0.15 } },
      sentidoKi: { name: 'Sentido del Ki', icon: '👁️', desc: '+6% de evasión.', maxStacks: 4, mods: { evasion: 0.06 } },
    },

    // ---------------------------------------------------------
    // RELIQUIAS (únicas; se consiguen en élites, jefes, tienda y eventos)
    // tags: se usan para las sinergias
    // unlock: si existe, hay que desbloquearla (derrotando a ese jefe)
    // ---------------------------------------------------------
    rarities: {
      common: { name: 'Común', color: '#b8c4cc', weight: 60 },
      rare: { name: 'Rara', color: '#4fa3ff', weight: 30 },
      epic: { name: 'Épica', color: '#c070ff', weight: 12 },
      // las legendarias SÓLO salen como premio de jefe (bossOnly) y son poco probables
      legendary: { name: 'Legendaria', color: '#ffc04a', weight: 2, bossOnly: true },
    },
    relics: {
      capaToroNegro: { name: 'Capa de los Toros Negros', icon: '🐂', rarity: 'common', tags: ['toro'], desc: '+20% de daño cuando tenés menos de 50% de vida.', mods: { lowHpDamagePct: 0.2 } },
      cigarroYami: { name: 'Cigarro de Yami', icon: '🚬', rarity: 'rare', tags: ['toro'], desc: '+8% de crítico y +25% de daño crítico.', mods: { critChance: 0.08, critDamage: 0.25 } },
      hiloVanessa: { name: 'Hilo Rojo del Destino', icon: '🧵', rarity: 'epic', tags: ['toro'], desc: 'Una vez por sala, un golpe mortal te deja con 1 de vida.', mods: { lastStand: 1 } },
      espejoGauche: { name: 'Espejo de Gauche', icon: '🪞', rarity: 'rare', tags: ['toro'], desc: '25% de probabilidad de duplicar tus proyectiles.', mods: { projectileDupChance: 0.25 } },
      comidaCharmy: { name: 'Banquete de Charmy', icon: '🍙', rarity: 'common', tags: ['toro'], desc: 'Al limpiar una sala curás 12% de tu vida.', mods: { healOnClearPct: 0.12 } },
      botasLuck: { name: 'Chispas de Luck', icon: '⚡', rarity: 'common', tags: ['toro'], desc: '+10% de velocidad. Tu dash daña a los enemigos que atravesás.', mods: { speedPct: 0.1, dashDamage: 30 } },
      fuegoMagna: { name: 'Bate de Fuego de Magna', icon: '🔥', rarity: 'common', tags: ['toro'], desc: 'Tus golpes queman: 6 de daño por segundo durante 3 s.', mods: { burnOnHit: 6 } },
      portalFinral: { name: 'Portal de Finral', icon: '🚪', rarity: 'common', tags: ['toro'], desc: 'Tu dash se recarga 25% más rápido.', mods: { dashCdPct: 0.25 } },
      trebolCuatro: { name: 'Trébol de Cuatro Hojas', icon: '🍀', rarity: 'rare', tags: ['amanecer', 'mana'], desc: '+25% de maná máximo y +10% de daño.', mods: { maxManaPct: 0.25, damagePct: 0.1 } },
      emblemaAmanecer: { name: 'Emblema del Amanecer Dorado', icon: '🌅', rarity: 'common', tags: ['amanecer', 'mana'], desc: '+25% de regeneración de maná y -8% de enfriamiento.', mods: { manaRegenPct: 0.25, cooldownPct: 0.08 } },
      colganteHage: { name: 'Colgante de la Iglesia de Hage', icon: '📿', rarity: 'rare', tags: ['hage'], desc: '+12% de daño y la barra definitiva se carga 20% más rápido.', mods: { damagePct: 0.12, ultGainPct: 0.2 } },
      rosarioLily: { name: 'Rosario de la Hermana Lily', icon: '🙏', rarity: 'common', tags: ['hage'], desc: '+30 de vida máxima.', mods: { maxHp: 30 } },
      piedraMagica: { name: 'Piedra Mágica', icon: '💎', rarity: 'rare', tags: ['mana'], desc: '+25% de daño, pero tus hechizos cuestan 15% más maná.', mods: { damagePct: 0.25, manaCostPct: 0.15 }, requiresMana: true },
      coronaSilva: { name: 'Corona de la Casa Silva', icon: '👑', rarity: 'rare', tags: ['realeza', 'mana'], desc: '+20% de daño mientras tengas más de 70% de maná.', mods: { highManaDamagePct: 0.2 }, requiresMana: true },
      insigniaCaballero: { name: 'Insignia de Caballero Mágico', icon: '🎖️', rarity: 'common', tags: ['caballero'], desc: '+8% de daño y +15 de vida máxima.', mods: { damagePct: 0.08, maxHp: 15 } },
      corazonLiebe: { name: 'Corazón de Liebe', icon: '😈', rarity: 'epic', tags: ['demonio'], desc: 'La barra definitiva se carga 40% más rápido.', mods: { ultGainPct: 0.4 }, unlock: { boss: 'vetto' } },
      grimorioCincoHojas: { name: 'Grimorio de Cinco Hojas', icon: '📕', rarity: 'epic', tags: ['demonio'], desc: 'La definitiva dura 30% más y +10% de daño.', mods: { ultDurationPct: 0.3, damagePct: 0.1 }, unlock: { boss: 'vanica' } },
      capaReyMago: { name: 'Capa del Rey Mago', icon: '🧥', rarity: 'legendary', tags: ['caballero', 'realeza'], desc: '-15% de enfriamiento y +15% de daño.', mods: { cooldownPct: 0.15, damagePct: 0.15 }, unlock: { boss: 'mars' } },
      relojJulius: { name: 'Reloj de Julius', icon: '⏳', rarity: 'epic', tags: ['realeza'], desc: 'Magia de tiempo: los enemigos son 12% más lentos.', mods: { enemySlowPct: 0.12 }, unlock: { boss: 'zenon' } },
      // ---- legendarias (sólo de jefes, se desbloquean derrotando jefes) ----
      katanaYami: { name: 'Katana de Yami Sukehiro', icon: '🗡️', rarity: 'legendary', tags: ['toro'], desc: '+15% de crítico, +60% de daño crítico y +10% de daño. "¡Superá tus límites!"', mods: { critChance: 0.15, critDamage: 0.6, damagePct: 0.1 }, unlock: { boss: 'vanica' } },
      brazoMereoleona: { name: 'Calidus Brachium de Mereoleona', icon: '🦁', rarity: 'legendary', tags: ['realeza'], desc: 'Tus golpes queman 12 por segundo, +20% de daño y +30 de vida máxima.', mods: { burnOnHit: 12, damagePct: 0.2, maxHp: 30 }, unlock: { boss: 'zenon' } },
      espadaLicht: { name: 'Espada de Licht', icon: '⚔️', rarity: 'legendary', tags: ['caballero'], desc: 'La espada del líder elfo: +25% de daño y robás 1% de vida.', mods: { damagePct: 0.25, lifesteal: 0.01 }, unlock: { boss: 'dante' } },
      grimorioLumiere: { name: 'Grimorio del Primer Rey Mago', icon: '📜', rarity: 'legendary', tags: ['caballero', 'realeza'], desc: 'El grimorio de Lumiere: -15% de enfriamiento, +30% de maná máximo, +15% de daño y la definitiva se carga 20% más rápido.', mods: { cooldownPct: 0.15, maxManaPct: 0.3, damagePct: 0.15, ultGainPct: 0.2 }, unlock: { boss: 'dante' } },
    },

    // ---------------------------------------------------------
    // SINERGIAS — se activan solas cuando se cumplen los requisitos
    //  requires.character: personaje necesario (o lista de personajes)
    //  requires.items: habilidades / pasivas / reliquias necesarias
    //  requires.tags: cantidad de reliquias con esa etiqueta
    // ---------------------------------------------------------
    synergies: [
      {
        id: 'valquiriaDesbordante',
        name: 'Valquiria Desbordante',
        icon: '🌊',
        desc: 'Noelle + 2 reliquias de maná: la Armadura Valquiria dura 4 s más y da +30% de daño extra.',
        requires: { character: 'noelle', tags: { mana: 2 } },
        mods: { ultDurationFlat: 4, ultDamagePct: 0.3 },
      },
      {
        id: 'espirituToro',
        name: 'Espíritu de los Toros Negros',
        icon: '🐂',
        desc: '3 reliquias de los Toros Negros: +20% de daño y +10% de velocidad.',
        requires: { tags: { toro: 3 } },
        mods: { damagePct: 0.2, speedPct: 0.1 },
      },
      {
        id: 'hijosHage',
        name: 'Hijos de Hage',
        icon: '⛪',
        desc: 'Colgante de Hage + Rosario de Lily: +25 de vida máxima y la definitiva se carga 30% más rápido.',
        requires: { items: ['colganteHage', 'rosarioLily'] },
        mods: { maxHp: 25, ultGainPct: 0.3 },
      },
      {
        id: 'antimagiaAbsoluta',
        name: 'Anti-magia Absoluta',
        icon: '⚫',
        desc: 'Asta (o el Caballero Novato) con Espada Habitante y Zanka: Zanka atraviesa todo y la Habitante acumula el doble de cargas.',
        requires: { character: ['asta', 'mago'], items: ['habitante', 'zanka'] },
        mods: { zankaInfinitePierce: 1, habitanteDoubleCharge: 1 },
      },
      {
        id: 'tormentaEspiritual',
        name: 'Tormenta Espiritual',
        icon: '🌪️',
        desc: 'Yuno (o el Caballero Novato) con Tornado y Lluvia de Cuchillas: tornados 40% más grandes que disparan cuchillas.',
        requires: { character: ['yuno', 'mago'], items: ['tornado', 'lluviaCuchillas'] },
        mods: { tornadoSizePct: 0.4, tornadoBlades: 1 },
      },
      {
        id: 'llamaImperial',
        name: 'Llama Imperial',
        icon: '🔥',
        desc: 'Los 6 hechizos de Fuego: Tus golpes queman 12 por segundo y +25% de daño.',
        requires: { skillTags: { fuego: 6 } },
        mods: { burnOnHit: 12, damagePct: 0.25 },
      },
      {
        id: 'senorDelMar',
        name: 'Señor del Mar',
        icon: '💧',
        desc: 'Los 6 hechizos de Agua: +40% de maná máximo, +50% de regeneración de maná y +20% de daño.',
        requires: { skillTags: { agua: 6 } },
        mods: { maxManaPct: 0.4, manaRegenPct: 0.5, damagePct: 0.2 },
      },
      {
        id: 'golemDeTierra',
        name: 'Gólem de Tierra',
        icon: '🪨',
        desc: 'Los 6 hechizos de Tierra: +10 de armadura y +60 de vida máxima.',
        requires: { skillTags: { tierra: 6 } },
        mods: { armor: 10, maxHp: 60 },
      },
      {
        id: 'reyDeLosVientos',
        name: 'Rey de los Vientos',
        icon: '🌪️',
        desc: 'Los 6 hechizos de Viento: +15% de velocidad, -20% de enfriamiento y +10% de evasión.',
        requires: { skillTags: { viento: 6 } },
        mods: { speedPct: 0.15, cooldownPct: 0.2, evasion: 0.1 },
      },
      {
        id: 'relampagoDivino',
        name: 'Relámpago Divino',
        icon: '⚡',
        desc: 'Los 6 hechizos de Rayo: +20% de crítico, +50% de daño crítico y +10% de velocidad.',
        requires: { skillTags: { rayo: 6 } },
        mods: { critChance: 0.2, critDamage: 0.5, speedPct: 0.1 },
      },
      {
        id: 'cuerpoDeAcero',
        name: 'Cuerpo de Acero',
        icon: '⚙️',
        desc: 'Los 6 hechizos de Acero: +12 de armadura, +15% de daño y un golpe mortal por sala te deja con 1 de vida.',
        requires: { skillTags: { acero: 6 } },
        mods: { armor: 12, damagePct: 0.15, lastStand: 1 },
      },
      {
        id: 'arbolDelMundo',
        name: 'Árbol del Mundo',
        icon: '🌿',
        desc: 'Los 6 hechizos de Planta: Regenerás 3 de vida por segundo y curás 20% al limpiar una sala.',
        requires: { skillTags: { planta: 6 } },
        mods: { regen: 3, healOnClearPct: 0.2 },
      },
      {
        id: 'plaga',
        name: 'Plaga',
        icon: '☠️',
        desc: 'Los 6 hechizos de Veneno: Todos tus golpes envenenan (10 por segundo) y +20% de daño.',
        requires: { skillTags: { veneno: 6 } },
        mods: { poisonOnHit: 10, damagePct: 0.2 },
      },
      {
        id: 'tormentaDeFuego',
        name: 'Tormenta de Fuego',
        icon: '🔥',
        desc: '3 hechizos de Fuego + 3 de Viento: El viento aviva las llamas: tus golpes queman 6 por segundo y +15% de daño.',
        requires: { skillTags: { fuego: 3, viento: 3 } },
        mods: { burnOnHit: 6, damagePct: 0.15 },
      },
      {
        id: 'electrocucion',
        name: 'Electrocución',
        icon: '⚡',
        desc: '3 hechizos de Agua + 3 de Rayo: El agua conduce el rayo: +12% de crítico y +15% de daño.',
        requires: { skillTags: { agua: 3, rayo: 3 } },
        mods: { critChance: 0.12, damagePct: 0.15 },
      },
      {
        id: 'fortalezaInexpugnable',
        name: 'Fortaleza Inexpugnable',
        icon: '🏰',
        desc: '3 hechizos de Tierra + 3 de Acero: +6 de armadura y +40 de vida máxima.',
        requires: { skillTags: { tierra: 3, acero: 3 } },
        mods: { armor: 6, maxHp: 40 },
      },
      {
        id: 'florecimiento',
        name: 'Florecimiento',
        icon: '🌸',
        desc: '3 hechizos de Planta + 3 de Agua: Regenerás 1.5 de vida por segundo y curás 10% al limpiar una sala.',
        requires: { skillTags: { planta: 3, agua: 3 } },
        mods: { regen: 1.5, healOnClearPct: 0.1 },
      },
      {
        id: 'jardinToxico',
        name: 'Jardín Tóxico',
        icon: '🍄',
        desc: '3 hechizos de Veneno + 3 de Planta: Tus golpes envenenan (6 por segundo) y +10% de daño.',
        requires: { skillTags: { veneno: 3, planta: 3 } },
        mods: { poisonOnHit: 6, damagePct: 0.1 },
      },
      {
        id: 'forjaArdiente',
        name: 'Forja Ardiente',
        icon: '⚒️',
        desc: '3 hechizos de Fuego + 3 de Acero: +10% de crítico y +40% de daño crítico.',
        requires: { skillTags: { fuego: 3, acero: 3 } },
        mods: { critChance: 0.1, critDamage: 0.4 },
      },
      {
        id: 'tempestad',
        name: 'Tempestad',
        icon: '⛈️',
        desc: '3 hechizos de Viento + 3 de Rayo: -12% de enfriamiento y +8% de velocidad.',
        requires: { skillTags: { viento: 3, rayo: 3 } },
        mods: { cooldownPct: 0.12, speedPct: 0.08 },
      },
      {
        id: 'pantano',
        name: 'Pantano',
        icon: '🐊',
        desc: '3 hechizos de Tierra + 3 de Agua: Los enemigos son 12% más lentos y +2 de armadura.',
        requires: { skillTags: { tierra: 3, agua: 3 } },
        mods: { enemySlowPct: 0.12, armor: 2 },
      },
      {
        id: 'nieblaVenenosa',
        name: 'Niebla Venenosa',
        icon: '🌫️',
        desc: '3 hechizos de Veneno + 3 de Viento: Tus golpes envenenan (5 por segundo) y +8% de evasión.',
        requires: { skillTags: { veneno: 3, viento: 3 } },
        mods: { poisonOnHit: 5, evasion: 0.08 },
      },
      {
        id: 'magma',
        name: 'Magma',
        icon: '🌋',
        desc: '3 hechizos de Fuego + 3 de Tierra: Tus golpes queman 5 por segundo y +4 de armadura.',
        requires: { skillTags: { fuego: 3, tierra: 3 } },
        mods: { burnOnHit: 5, armor: 4 },
      },
      {
        id: 'cincoEspadas',
        name: 'Maestro de las Espadas Demoníacas',
        icon: '⚔️',
        desc: 'Asta con sus 5 espadas: +10% de daño y la barra definitiva se carga 15% más rápido.',
        requires: { character: 'asta', skillTags: { espada: 5 } },
        mods: { damagePct: 0.1, ultGainPct: 0.15 },
      },
      {
        id: 'amanecerDorado',
        name: 'Orgullo del Amanecer Dorado',
        icon: '🌅',
        desc: '2 reliquias del Amanecer Dorado: +30% de regeneración de maná y -10% de enfriamiento.',
        requires: { tags: { amanecer: 2 } },
        mods: { manaRegenPct: 0.3, cooldownPct: 0.1 },
      },
      {
        id: 'pactoDemoniaco',
        name: 'Pacto Demoníaco',
        icon: '😈',
        desc: '2 reliquias demoníacas: la definitiva dura 50% más y robás 5% de vida.',
        requires: { tags: { demonio: 2 } },
        mods: { ultDurationPct: 0.5, lifesteal: 0.05 },
      },
      {
        id: 'locosBatalla',
        name: 'Locos de la Batalla',
        icon: '⚡',
        desc: 'Bate de Magna + Chispas de Luck: tu dash quema y +10% de crítico.',
        requires: { items: ['fuegoMagna', 'botasLuck'] },
        mods: { critChance: 0.1, dashBurn: 1 },
      },
      {
        id: 'nobleza',
        name: 'Nobleza Obliga',
        icon: '👑',
        desc: '2 reliquias de la realeza: +15% de daño y +3 de armadura.',
        requires: { tags: { realeza: 2 } },
        mods: { damagePct: 0.15, armor: 3 },
      },
      {
        id: 'furiaDragon',
        name: 'Furia del Dragón Marino',
        icon: '🐉',
        desc: 'Noelle (o el Caballero Novato) con Rugido y Nido del Dragón: el Rugido es 50% más ancho y el Nido dura 2 s más.',
        requires: { character: ['noelle', 'mago'], items: ['rugidoDragon', 'nidoDragon'] },
        mods: { rugidoWidePct: 0.5, nidoExtraDuration: 2 },
      },
    ],

    // ---------------------------------------------------------
    // ENEMIGOS COMUNES Y ÉLITES
    //  behavior: chase (persigue), ranged (dispara a distancia),
    //            charger (embiste), caster (se teletransporta y dispara),
    //            pattern (élites y jefes: usan "phases")
    //  cost: cuánto "pesa" en una oleada
    //  yul: monedas que suelta [mínimo, máximo]
    // ---------------------------------------------------------
    enemies: {
      bandido: { name: 'Bandido', icon: '🗡️', color: '#8a6d4b', radius: 15, hp: 28, damage: 9, speed: 95, behavior: 'chase', cost: 1, yul: [1, 2] },
      magoBandido: {
        name: 'Mago Bandido', icon: '🔥', color: '#b5523b', radius: 14, hp: 22, damage: 8, speed: 80, behavior: 'ranged', cost: 1.5, yul: [1, 3],
        range: 300, fireRate: 2.4, projectile: { speed: 230, radius: 8, damage: 10, color: '#ff7b3a' },
      },
      corrompido: {
        name: 'Bestia Corrompida', icon: '🐗', color: '#5a3d6b', radius: 18, hp: 50, damage: 14, speed: 70, behavior: 'charger', cost: 2, yul: [2, 3],
        windup: 0.7, chargeSpeed: 480, chargeTime: 0.5, chargeCooldown: 3,
      },
      soldadoPica: { name: 'Soldado de Pica', icon: '🪖', color: '#6d6f7a', radius: 15, hp: 40, damage: 11, speed: 105, armor: 2, behavior: 'chase', cost: 1.3, yul: [1, 3] },
      espirituMaldito: {
        name: 'Espíritu Maldito', icon: '👻', color: '#c06aa8', radius: 14, hp: 30, damage: 9, speed: 85, behavior: 'ranged', cost: 1.6, yul: [1, 3],
        range: 320, fireRate: 2.8, projectile: { speed: 170, radius: 10, damage: 10, color: '#ff5fb0', homing: 1.1, life: 3 },
      },
      soldadoDiamante: { name: 'Soldado de Diamante', icon: '🛡️', color: '#4f8fa0', radius: 16, hp: 48, damage: 12, speed: 95, armor: 4, behavior: 'chase', cost: 1.4, yul: [2, 3] },
      magoCristal: {
        name: 'Mago de Cristal', icon: '💠', color: '#59d1e0', radius: 14, hp: 32, damage: 9, speed: 80, behavior: 'ranged', cost: 1.8, yul: [2, 3],
        range: 320, fireRate: 2.6, projectile: { speed: 250, radius: 7, damage: 10, color: '#a6f4ff', count: 3, spread: 22 },
      },
      guerreroTriada: { name: 'Guerrero de la Tríada', icon: '⚔️', color: '#7a2b2b', radius: 16, hp: 55, damage: 14, speed: 125, armor: 3, behavior: 'chase', cost: 1.6, yul: [2, 4] },
      magoGravedad: {
        name: 'Mago de Gravedad', icon: '🌑', color: '#4b3a73', radius: 15, hp: 38, damage: 10, speed: 80, behavior: 'ranged', cost: 1.8, yul: [2, 4],
        range: 340, fireRate: 2.8, projectile: { speed: 190, radius: 12, damage: 13, color: '#9a7bff', slowOnHit: 0.35 },
      },
      magoSolMedianoche: {
        name: 'Mago del Sol de Medianoche', icon: '☀️', color: '#d8a33a', radius: 16, hp: 45, damage: 10, speed: 70, behavior: 'caster', cost: 2.5, yul: [3, 5],
        teleportCooldown: 4.5, burst: { count: 8, speed: 210, radius: 8, damage: 11, color: '#ffd76a' },
      },
      cadaver: { name: 'Cadáver Reanimado', icon: '💀', color: '#7f8c6a', radius: 13, hp: 18, damage: 8, speed: 80, behavior: 'chase', cost: 0, yul: [0, 1] },

      // -------- comunes nuevos (comportamientos especiales) --------
      loboBosque: { name: 'Lobo del Bosque', icon: '🐺', color: '#6b6b6b', radius: 13, hp: 18, damage: 7, speed: 140, behavior: 'chase', cost: 0.7, yul: [0, 1] },
      // torreta: no se mueve, dispara en abanico
      plantaCarnivora: {
        name: 'Planta Carnívora', icon: '🪴', color: '#3f8f3a', radius: 17, hp: 45, damage: 6, speed: 0, behavior: 'turret', cost: 1.6, yul: [1, 3],
        range: 430, fireRate: 2.2, projectile: { speed: 240, radius: 9, damage: 11, color: '#9be37c', count: 3, spread: 30 },
      },
      // al morir se parte en fragmentos
      golemCristal: {
        name: 'Gólem de Cristal', icon: '🗿', color: '#6fb6c6', radius: 21, hp: 80, damage: 14, speed: 60, armor: 5, behavior: 'chase', cost: 2.2, yul: [2, 4],
        splitInto: { id: 'fragmentoCristal', count: 3 },
      },
      fragmentoCristal: { name: 'Fragmento de Cristal', icon: '🔹', color: '#a6f4ff', radius: 10, hp: 18, damage: 7, speed: 125, behavior: 'chase', cost: 0, yul: [0, 1] },
      // se acerca y explota (hay que alejarse del círculo rojo)
      esclavoMaldito: {
        name: 'Esclavo Maldito', icon: '💣', color: '#8a3030', radius: 14, hp: 30, damage: 26, speed: 115, behavior: 'exploder', cost: 1.4, yul: [1, 3],
        fuse: 0.9, blastRadius: 85, triggerRange: 70,
      },
      // se teletransporta cerca tuyo cada tanto
      diablillo: {
        name: 'Diablillo', icon: '😈', color: '#5a1f6b', radius: 14, hp: 40, damage: 12, speed: 100, behavior: 'blinker', cost: 1.6, yul: [2, 3],
        blinkCooldown: 3.5,
      },
      // -------- enemigos con mecánicas especiales --------
      // te apunta con un láser que te sigue; cuando se pone blanco, ¡salí de la línea!
      francotirador: {
        name: 'Francotirador de Acero', icon: '🎯', color: '#7a8a6a', radius: 14, hp: 30, damage: 8, speed: 85, behavior: 'sniper', cost: 1.8, yul: [2, 3], hint: '🎯 Francotirador: cuando la mira se pone blanca, ¡salí de la línea!',
        keepDistance: 430, sightLength: 1400, aimTime: 1.3, lockTime: 0.4, cooldown: 2.4,
        projectile: { speed: 640, radius: 6, damage: 20, color: '#f0f4ff', life: 2 },
      },
      // círculos mágicos donde estás y adonde vas: cambiá de dirección
      magoSellos: {
        name: 'Mago de Sellos', icon: '📜', color: '#8a4ab0', radius: 14, hp: 34, damage: 14, speed: 75, behavior: 'sigil', cost: 1.7, yul: [2, 3], hint: '📜 Mago de Sellos: los círculos explotan donde vas a estar. ¡Cambiá de dirección!',
        keepDistance: 300, castCooldown: 3.6, circleRadius: 58, leads: [0, 0.55, 1.1], firstDelay: 0.95, stagger: 0.28, damageMult: 1, sigilColor: '#c07aff',
      },
      // cura y pone escudo a sus compañeros: matalo primero
      sanador: {
        name: 'Sanador de la Iglesia', icon: '🧪', color: '#e8f0e0', radius: 14, hp: 32, damage: 6, speed: 95, behavior: 'healer', cost: 1.6, yul: [2, 4], hint: '🧪 Sanador: cura y protege a los demás. ¡Atacalo primero!',
        fleeDistance: 260, healCooldown: 3.2, healRange: 240, healPct: 0.22, shieldPct: 0.12,
      },
      // invisible (no se lo puede atacar), aparece atrás tuyo con un tajo avisado y queda aturdido
      asesino: {
        name: 'Asesino de las Sombras', icon: '🌑', color: '#3a2a4a', radius: 14, hp: 44, damage: 12, speed: 120, behavior: 'shadow', cost: 1.9, yul: [2, 4], hint: '🌑 Asesino de las Sombras: se vuelve invisible y aparece atrás tuyo. Pegale cuando queda aturdido.',
        visibleTime: 2.2, hiddenTime: 1.7, ambushDistance: 95, strikeWindup: 0.55, strikeLength: 170, strikeMult: 1.8, dazedTime: 1.3,
      },
      // se rodea de copias; sólo una es la verdadera (las copias se rompen de un golpe)
      ilusionista: {
        name: 'Ilusionista', icon: '🪞', color: '#a07ad0', radius: 14, hp: 60, damage: 9, speed: 95, behavior: 'illusionist', cost: 2, yul: [3, 5], hint: '🪞 Ilusionista: sólo uno es el verdadero. Las copias se rompen de un golpe.',
        cloneId: 'ilusion', maxClones: 2, splitCooldown: 6, ringDistance: 240, fireRate: 2.2,
        projectile: { speed: 260, radius: 8, damage: 12, color: '#d8b8ff' },
      },
      ilusion: {
        name: 'Ilusión', icon: '🪞', color: '#a07ad0', radius: 14, hp: 1, damage: 3, speed: 95, behavior: 'illusionist', cost: 0, yul: [0, 0], isClone: true,
        fireRate: 2.6, projectile: { speed: 260, radius: 8, damage: 4, color: '#d8b8ff' },
      },
      // une a un compañero con una cadena de luz: mientras el guardián viva, ese compañero es inmune
      guardian: {
        name: 'Guardián del Vínculo', icon: '🔗', color: '#d8b040', radius: 19, hp: 75, damage: 12, speed: 80, armor: 4, behavior: 'guardian', cost: 2, yul: [3, 5], hint: '🔗 Guardián del Vínculo: su protegido es inmune. ¡Primero el guardián!',
      },
      paladin: { name: 'Paladín de Lucius', icon: '🛡️', color: '#e8dca0', radius: 17, hp: 70, damage: 16, speed: 120, armor: 6, behavior: 'chase', cost: 2, yul: [3, 5] },

      // -------- ÉLITES: miembros de los Ojos del Sol de Medianoche --------
      rhya: {
        name: 'Rhya', title: 'Ojo del Sol de Medianoche — Magia de Copia', icon: '🎭', color: '#7a6bd6', radius: 24, hp: 480, damage: 14, speed: 105, armor: 3,
        behavior: 'pattern', elite: true, yul: [16, 22],
        phases: [
          {
            hpBelow: 1, move: 'strafe', attackDelay: [1.4, 2.2],
            attacks: [
              // copia la Jabalina de Agua
              { type: 'fan', weight: 3, count: 3, spread: 24, speed: 380, damage: 13, radius: 8, color: '#4fb6ff', windup: 0.35, repeat: 2, repeatDelay: 0.25 },
              // copia el Aliento de Salamandra
              { type: 'radial', weight: 2, count: 12, speed: 220, damage: 12, radius: 9, color: '#ff7b3a', windup: 0.4 },
              // copia el Manto Oscuro - Corte de Avidya
              { type: 'line', weight: 2, count: 1, length: 560, width: 46, windup: 0.75, damage: 26, color: '#4b2a6b' },
              { type: 'teleport', weight: 1, minDist: 200, maxDist: 300 },
            ],
          },
        ],
      },
      ladros: {
        name: 'Ladros', title: 'Mago del Reino del Diamante — Magia de Joyas', icon: '💍', color: '#d65ab0', radius: 25, hp: 560, damage: 15, speed: 80, armor: 6,
        behavior: 'pattern', elite: true, yul: [18, 24],
        phases: [
          {
            hpBelow: 1, move: 'keepDistance', keepDistance: 280, attackDelay: [1.6, 2.4],
            attacks: [
              // Million Laser: abanico de rayos de joya
              { type: 'line', weight: 3, count: 5, angleSpread: 110, length: 620, width: 26, windup: 0.85, damage: 22, color: '#ff7ad0' },
              { type: 'spikes', weight: 2, count: 4, radius: 55, spread: 140, delay: 0.9, stagger: 0.12, damage: 20, color: '#ff7ad0' },
              { type: 'shield', weight: 1, amount: 180 },
            ],
          },
        ],
      },
      valtos: {
        name: 'Valtos', title: 'Ojo del Sol de Medianoche — Magia Espacial', icon: '🌀', color: '#5d6bd6', radius: 24, hp: 380, damage: 14, speed: 100, armor: 2,
        behavior: 'pattern', elite: true, yul: [14, 20],
        phases: [
          {
            hpBelow: 1, move: 'strafe', attackDelay: [1.6, 2.4],
            attacks: [
              { type: 'teleport', weight: 2, minDist: 180, maxDist: 280 },
              { type: 'fan', weight: 3, count: 5, spread: 50, speed: 280, damage: 12, radius: 8, color: '#9aa6ff', windup: 0.35 },
              { type: 'portalVolley', weight: 1, count: 4, radius: 220, windup: 0.8, speed: 300, damage: 12, color: '#9aa6ff' },
            ],
          },
        ],
      },
      rades: {
        name: 'Rades', title: 'Ojo del Sol de Medianoche — Magia de Cadáveres', icon: '🧟', color: '#6c7a52', radius: 24, hp: 450, damage: 12, speed: 85, armor: 2,
        behavior: 'pattern', elite: true, yul: [14, 20],
        phases: [
          {
            hpBelow: 1, move: 'keepDistance', keepDistance: 260, attackDelay: [1.8, 2.6],
            attacks: [
              { type: 'summon', weight: 3, enemy: 'cadaver', count: 3, max: 8 },
              { type: 'aimed', weight: 2, count: 3, burstDelay: 0.18, speed: 300, damage: 12, radius: 8, color: '#b6d17a', windup: 0.3 },
            ],
          },
        ],
      },
      fana: {
        name: 'Fana', title: 'Ojo del Sol de Medianoche — Espíritu de Fuego', icon: '🦎', color: '#e0582c', radius: 24, hp: 520, damage: 15, speed: 90, armor: 3,
        behavior: 'pattern', elite: true, yul: [16, 22],
        phases: [
          {
            hpBelow: 1, move: 'keepDistance', keepDistance: 240, attackDelay: [1.6, 2.4],
            attacks: [
              { type: 'radial', weight: 2, count: 14, speed: 210, damage: 13, radius: 9, color: '#ff8a3a', repeat: 2, repeatDelay: 0.45, rotate: 12, windup: 0.4 },
              { type: 'line', weight: 2, count: 1, length: 520, width: 54, windup: 0.8, damage: 26, color: '#ff6a2a' },
              { type: 'spikes', weight: 1, count: 4, radius: 60, spread: 140, delay: 0.9, stagger: 0.15, damage: 20, color: '#ff8a3a' },
            ],
          },
        ],
      },
    },

    // ---------------------------------------------------------
    // JEFES — cada uno tiene fases (cambian al bajar su vida)
    //  hpBelow: la fase empieza cuando la vida baja de ese %
    //  attacks: lista de ataques con su "weight" (probabilidad)
    // ---------------------------------------------------------
    bosses: {
      // JEFE SECRETO
      lucius: {
        name: 'Lucius Zogratis', title: 'El verdadero Rey Mago — Magia de Alma y de Tiempo', icon: '👼', color: '#f5e6b0', radius: 38, hp: 75000, damage: 49, speed: 105, armor: 8, yul: [120, 150],
        behavior: 'pattern', boss: true, secret: true,
        quote: 'Voy a crear un mundo perfecto, sin sufrimiento.',
        phases: [
          {
            hpBelow: 1, name: 'Magia de Alma', move: 'keepDistance', keepDistance: 280, attackDelay: [0.9, 1.4],
            attacks: [
              { type: 'aimed', weight: 2, count: 5, burstDelay: 0.12, speed: 440, damage: 34, radius: 10, color: '#fff1b0', windup: 0.35 },
              { type: 'summon', weight: 1, enemy: 'paladin', count: 2, max: 4 },
              { type: 'portalVolley', weight: 2, count: 6, radius: 240, windup: 0.75, speed: 340, damage: 34, color: '#ffe58a' },
            ],
          },
          {
            hpBelow: 0.65, name: 'Magia del Tiempo', move: 'strafe', attackDelay: [0.9, 1.4],
            banner: '¡El tiempo se detiene!',
            attacks: [
              { type: 'timeStop', weight: 2, duration: 1.6, slow: 0.75, then: { count: 24, speed: 260, damage: 34, radius: 10, color: '#d8c7ff' } },
              { type: 'spiral', weight: 2, arms: 4, duration: 3, rate: 0.11, rotSpeed: 2.3, speed: 240, damage: 30, radius: 10, color: '#fff1b0' },
              { type: 'rain', weight: 2, count: 14, radius: 60, duration: 1.8, delay: 0.9, damage: 56, color: '#ffe58a' },
            ],
          },
          {
            hpBelow: 0.3, name: 'Paladín Supremo', move: 'chase', speedMult: 0.85, attackDelay: [0.75, 1.15],
            banner: '¡LUCIUS, PALADÍN SUPREMO!',
            transform: { name: 'Lucius (Paladín Supremo)', icon: '😇', color: '#fffbe0', radius: 44 },
            attacks: [
              { type: 'spiral', weight: 2, arms: 6, duration: 3, rate: 0.12, rotSpeed: -2, speed: 240, damage: 33, radius: 10, color: '#ffe58a' },
              { type: 'timeStop', weight: 1, duration: 1.4, slow: 0.75, then: { count: 30, speed: 270, damage: 34, radius: 10, color: '#d8c7ff' } },
              { type: 'gravityWell', weight: 1, count: 3, radius: 90, spread: 220, duration: 4, slow: 0.5, dps: 34, pull: 90, delay: 0.6, color: '#ffe58a' },
              { type: 'nova', weight: 1, damage: 49, speed: 360, maxRadius: 420, windup: 0.5, color: '#fff1b0' },
              { type: 'summon', weight: 1, enemy: 'paladin', count: 3, max: 5 },
            ],
          },
        ],
      },
      vetto: {
        name: 'Vetto', title: 'Ojo del Sol de Medianoche — Magia Bestia', icon: '🦁', color: '#7a5230', radius: 36, hp: 3000, damage: 16, speed: 115, armor: 2, yul: [40, 50],
        behavior: 'pattern', boss: true,
        quote: '¡La desesperación es la verdadera fuerza!',
        phases: [
          {
            hpBelow: 1, name: 'Garras de la Bestia', move: 'chase', attackDelay: [1.3, 2.0],
            attacks: [
              { type: 'charge', weight: 3, windup: 0.7, speed: 640, duration: 0.55, damage: 22 },
              { type: 'radial', weight: 2, count: 12, speed: 200, damage: 12, radius: 10, color: '#ffb347', windup: 0.4 },
              { type: 'nova', weight: 1, damage: 16, speed: 300, maxRadius: 260, windup: 0.5, color: '#ffb347' },
            ],
          },
          {
            hpBelow: 0.5, name: 'Cuarta Bestia: Desesperación', move: 'chase', speedMult: 1.25, attackDelay: [0.9, 1.5],
            banner: '¡Cuarta Bestia: Desesperación!',
            attacks: [
              { type: 'charge', weight: 3, windup: 0.5, speed: 740, duration: 0.5, damage: 26, chain: 3, endNova: { damage: 16, speed: 320, maxRadius: 200 } },
              { type: 'radial', weight: 2, count: 18, speed: 220, damage: 13, radius: 10, color: '#ffb347', repeat: 2, repeatDelay: 0.4, rotate: 10, windup: 0.3 },
            ],
          },
        ],
      },
      vanica: {
        name: 'Vanica Zogratis', title: 'Tríada Oscura — Magia de Sangre + Megicula', icon: '🩸', color: '#8b0a1a', radius: 32, hp: 5800, damage: 15, speed: 105, armor: 3, yul: [45, 55],
        behavior: 'pattern', boss: true,
        quote: '¡Ahh, por fin alguien divertido!',
        phases: [
          {
            hpBelow: 1, name: 'Magia de Sangre', move: 'keepDistance', keepDistance: 280, attackDelay: [1.2, 1.9],
            attacks: [
              { type: 'fan', weight: 3, count: 5, spread: 60, speed: 260, damage: 14, radius: 10, color: '#ff2b4a', windup: 0.35, repeat: 2, repeatDelay: 0.3 },
              { type: 'aimed', weight: 2, count: 3, burstDelay: 0.15, speed: 420, damage: 16, radius: 9, color: '#ff4060', windup: 0.4 },
            ],
          },
          {
            hpBelow: 0.6, name: 'Maldición de Megicula', move: 'strafe', attackDelay: [1.0, 1.6],
            banner: '¡Maldición de Megicula!',
            attacks: [
              { type: 'spikes', weight: 3, count: 5, radius: 65, spread: 160, delay: 1.0, stagger: 0.12, damage: 24, color: '#d01a6a' },
              { type: 'fan', weight: 2, count: 7, spread: 80, speed: 280, damage: 14, radius: 10, color: '#ff2b4a', repeat: 2, repeatDelay: 0.3, windup: 0.3 },
            ],
          },
          {
            hpBelow: 0.25, name: 'Megicula Despierta', move: 'still', attackDelay: [0.8, 1.3],
            banner: '¡Megicula toma el control!',
            attacks: [
              { type: 'spiral', weight: 3, arms: 4, duration: 3, rate: 0.12, rotSpeed: 2.2, speed: 220, damage: 12, radius: 9, color: '#c0103a' },
              { type: 'spikes', weight: 2, count: 6, radius: 65, spread: 200, delay: 0.9, stagger: 0.1, damage: 24, color: '#d01a6a' },
            ],
          },
        ],
      },
      mars: {
        name: 'Mars', title: 'Mago del Reino del Diamante — Magia Mineral', icon: '💎', color: '#3fc7d6', radius: 34, hp: 9800, damage: 18, speed: 95, armor: 6, yul: [50, 60],
        behavior: 'pattern', boss: true,
        quote: 'Mi magia es la más resistente de todas.',
        phases: [
          {
            hpBelow: 1, name: 'Magia Mineral', move: 'keepDistance', keepDistance: 250, attackDelay: [1.2, 1.9],
            attacks: [
              { type: 'spikes', weight: 3, count: 4, radius: 60, spread: 120, delay: 0.9, stagger: 0.12, damage: 24, color: '#7ff3ff' },
              { type: 'fan', weight: 2, count: 7, spread: 70, speed: 300, damage: 15, radius: 8, color: '#bdf8ff', windup: 0.35 },
              { type: 'line', weight: 2, count: 3, angleSpread: 40, length: 560, width: 40, windup: 0.8, damage: 28, color: '#7ff3ff' },
            ],
          },
          {
            hpBelow: 0.5, name: 'Armadura de Cristal', move: 'chase', attackDelay: [1.0, 1.6],
            banner: '¡Armadura de Cristal!', onEnter: { type: 'shield', amount: 700 },
            attacks: [
              { type: 'shield', weight: 1, amount: 400 },
              { type: 'rain', weight: 2, count: 10, radius: 55, duration: 1.6, delay: 0.9, damage: 24, color: '#7ff3ff' },
              { type: 'radial', weight: 2, count: 16, speed: 240, damage: 14, radius: 8, color: '#bdf8ff', repeat: 3, repeatDelay: 0.35, rotate: 11, windup: 0.3 },
            ],
          },
        ],
      },
      zenon: {
        name: 'Zenon Zogratis', title: 'Tríada Oscura — Magia de Hueso + Zagred', icon: '🦴', color: '#d9d2c3', radius: 34, hp: 14500, damage: 20, speed: 105, armor: 5, yul: [55, 65],
        behavior: 'pattern', boss: true,
        quote: 'Tu existencia es un error que voy a corregir.',
        phases: [
          {
            hpBelow: 1, name: 'Magia de Hueso', move: 'strafe', attackDelay: [1.1, 1.8],
            attacks: [
              { type: 'fan', weight: 3, count: 9, spread: 90, speed: 300, damage: 16, radius: 9, color: '#f2ead8', windup: 0.35 },
              { type: 'line', weight: 2, count: 2, angleSpread: 30, length: 600, width: 44, windup: 0.75, damage: 30, color: '#f2ead8' },
              { type: 'nova', weight: 1, damage: 18, speed: 300, maxRadius: 300, windup: 0.5, color: '#f2ead8' },
            ],
          },
          {
            hpBelow: 0.5, name: 'Magia Espacial de Zagred', move: 'strafe', attackDelay: [0.9, 1.4],
            banner: '¡Magia Espacial de Zagred!',
            attacks: [
              { type: 'teleport', weight: 1, minDist: 220, maxDist: 320 },
              { type: 'portalVolley', weight: 3, count: 6, radius: 240, windup: 0.8, speed: 320, damage: 16, color: '#b28cff' },
              { type: 'spiral', weight: 2, arms: 3, duration: 2.6, rate: 0.12, rotSpeed: -2.4, speed: 240, damage: 14, radius: 9, color: '#f2ead8' },
            ],
          },
        ],
      },
      dante: {
        name: 'Dante Zogratis', title: 'Tríada Oscura — Magia Corporal + Lucifero', icon: '🖤', color: '#5b3a8c', radius: 36, hp: 20000, damage: 22, speed: 100, armor: 6, yul: [70, 80],
        behavior: 'pattern', boss: true, regenWhenIdle: 0.008,
        quote: 'La humanidad es pura maldad. Te lo voy a demostrar.',
        phases: [
          {
            hpBelow: 1, name: 'Magia Corporal', move: 'keepDistance', keepDistance: 260, attackDelay: [1.1, 1.7],
            attacks: [
              { type: 'line', weight: 3, count: 2, angleSpread: 25, length: 640, width: 48, windup: 0.7, damage: 32, color: '#c08cff' },
              { type: 'aimed', weight: 2, count: 4, burstDelay: 0.15, speed: 380, damage: 16, radius: 10, color: '#a070ff', windup: 0.35 },
              { type: 'summon', weight: 1, enemy: 'cadaver', count: 4, max: 8 },
            ],
          },
          {
            hpBelow: 0.6, name: 'Gravedad de Lucifero', move: 'still', attackDelay: [1.0, 1.5],
            banner: '¡Gravedad de Lucifero!',
            attacks: [
              { type: 'pull', weight: 2, strength: 210, duration: 2.0, then: { type: 'nova', damage: 20, speed: 320, maxRadius: 260 } },
              { type: 'gravityWell', weight: 2, count: 3, radius: 85, spread: 200, duration: 4.5, slow: 0.5, dps: 14, pull: 80, delay: 0.6, color: '#6a3aff' },
              { type: 'radial', weight: 2, count: 20, speed: 230, damage: 15, radius: 11, color: '#3a1a6a', repeat: 2, repeatDelay: 0.4, rotate: 9, windup: 0.35 },
            ],
          },
          {
            hpBelow: 0.3, name: 'Descenso de Lucifero', move: 'chase', speedMult: 0.8, attackDelay: [0.8, 1.2],
            banner: '¡LUCIFERO DESCIENDE!',
            transform: { name: 'Lucifero', icon: '👿', color: '#1a0b2e', radius: 46 },
            attacks: [
              { type: 'spiral', weight: 2, arms: 5, duration: 3, rate: 0.13, rotSpeed: 1.9, speed: 230, damage: 15, radius: 10, color: '#7a3aff' },
              { type: 'gravityWell', weight: 2, count: 4, radius: 90, spread: 240, duration: 4, slow: 0.5, dps: 16, pull: 90, delay: 0.6, color: '#6a3aff' },
              { type: 'rain', weight: 2, count: 14, radius: 60, duration: 1.8, delay: 0.9, damage: 28, color: '#9a5aff' },
              { type: 'nova', weight: 1, damage: 22, speed: 340, maxRadius: 400, windup: 0.5, color: '#9a5aff' },
            ],
          },
        ],
      },
    },

    // ---------------------------------------------------------
    // REINOS (los "mundos" de una run, en orden)
    //  enemies: enemigos y su probabilidad relativa
    //  hpMult / dmgMult: dificultad del reino
    // ---------------------------------------------------------
    realms: [
      {
        id: 'trebol', name: 'Reino del Trébol', subtitle: 'Bosques cercanos a la base de los Toros Negros',
        palette: { bg: '#16241a', floor: '#2b4a2a', floor2: '#30522f', wall: '#0f1a12', accent: '#9be37c', deco: '#3f6b38' },
        deco: ['🌲', '🌿', '🪨', '🍄'],
        enemies: { bandido: 4, magoBandido: 2, corrompido: 1, loboBosque: 2, magoSellos: 1 },
        lateEnemies: { magoSolMedianoche: 1 },
        elites: ['valtos'], boss: 'vetto', hpMult: 1.15, dmgMult: 1.25,
      },
      {
        id: 'corazon', name: 'Reino del Corazón', subtitle: 'Bosques encantados de los espíritus',
        palette: { bg: '#2a1424', floor: '#4a2742', floor2: '#53304b', wall: '#1c0c18', accent: '#ff8ac8', deco: '#7a3f6a' },
        deco: ['🌸', '🌷', '🪨', '🌳'],
        enemies: { soldadoPica: 3, espirituMaldito: 2, corrompido: 1, plantaCarnivora: 1, sanador: 1, ilusionista: 1 },
        lateEnemies: { magoSolMedianoche: 1 },
        elites: ['rades', 'rhya'], boss: 'vanica', hpMult: 2.2, dmgMult: 1.8,
      },
      {
        id: 'diamante', name: 'Reino del Diamante', subtitle: 'Minas de cristal',
        palette: { bg: '#0f2229', floor: '#1d3d47', floor2: '#22464f', wall: '#08161b', accent: '#7ff3ff', deco: '#2e6a78' },
        deco: ['💎', '🪨', '🔷', '⛏️'],
        enemies: { soldadoDiamante: 3, magoCristal: 2, corrompido: 1, golemCristal: 1, francotirador: 2, guardian: 1, magoSolMedianoche: 1 },
        lateEnemies: { magoSolMedianoche: 1 },
        elites: ['fana', 'ladros'], boss: 'mars', hpMult: 3.9, dmgMult: 2.6,
      },
      {
        id: 'espada', name: 'Reino de Espada', subtitle: 'Fronteras tomadas por la Tríada Oscura',
        palette: { bg: '#221616', floor: '#3a2626', floor2: '#422b2b', wall: '#140c0c', accent: '#ff6a5a', deco: '#5a3434' },
        deco: ['🪦', '🪨', '🔥', '⚔️'],
        enemies: { guerreroTriada: 3, magoGravedad: 2, corrompido: 1, esclavoMaldito: 2, asesino: 2, sanador: 1, magoSellos: 1, francotirador: 1 },
        lateEnemies: { magoSolMedianoche: 1 },
        elites: ['valtos', 'rades', 'ladros'], boss: 'zenon', hpMult: 6.0, dmgMult: 3.3,
      },
      {
        id: 'pica', name: 'Reino de Pica', subtitle: 'Castillo de la Tríada — Puerta del Inframundo',
        palette: { bg: '#120b1e', floor: '#241838', floor2: '#2a1c41', wall: '#08040f', accent: '#b07aff', deco: '#3c2860' },
        deco: ['🕯️', '🪦', '🦇', '⛓️'],
        enemies: { guerreroTriada: 2, magoGravedad: 2, corrompido: 1, magoSolMedianoche: 1, diablillo: 2, esclavoMaldito: 1, asesino: 1, ilusionista: 1, guardian: 1, francotirador: 1 },
        lateEnemies: { magoSolMedianoche: 1 },
        elites: ['fana', 'rades', 'valtos', 'rhya', 'ladros'], boss: 'dante', hpMult: 8.2, dmgMult: 3.9,
      },
      // REINO SECRETO: sólo aparece después de ganar el juego varias veces (config.secretUnlockWins)
      {
        id: 'capital', name: 'Capital del Reino del Trébol', subtitle: 'El trono del Rey Mago... ocupado por Lucius Zogratis',
        palette: { bg: '#2a2414', floor: '#4a4128', floor2: '#544a2e', wall: '#16120a', accent: '#ffe58a', deco: '#6b5f3a' },
        deco: ['👑', '🏛️', '✨', '⛪'],
        enemies: { paladin: 3, diablillo: 1, magoSolMedianoche: 1, guardian: 1, sanador: 1, francotirador: 1, asesino: 1 },
        elites: ['rhya', 'ladros'], boss: 'lucius', hpMult: 12, dmgMult: 5.2,
        secret: true, floors: 4,
      },
    ],

    // ---------------------------------------------------------
    // TIPOS DE SALA y generación del mapa
    // ---------------------------------------------------------
    rooms: {
      combat: { name: 'Combate', icon: '⚔️', color: '#d9534f', weight: 62, desc: 'Oleadas de enemigos. Ganás experiencia.' },
      elite: { name: 'Élite', icon: '💀', color: '#b04ad9', weight: 9, minFloor: 2, maxPerRealm: 2, desc: 'Un Ojo del Sol de Medianoche. Recompensa: una reliquia.' },
      shop: { name: 'Tienda', icon: '🛒', color: '#e0b84a', weight: 11, minFloor: 1, maxPerRealm: 1, desc: 'Gastá tus yules.' },
      event: { name: 'Evento', icon: '❓', color: '#4aa3d9', weight: 10, minFloor: 1, maxPerRealm: 2, desc: 'Algo inesperado...' },
      rest: { name: 'Descanso', icon: '🔥', color: '#5cc26a', weight: 6, minFloor: 2, maxPerRealm: 1, desc: 'Curate o entrená.' },
      boss: { name: 'Jefe', icon: '👹', color: '#ff2b2b', desc: '¡El jefe del reino!' },
    },
    mapgen: {
      choicesMin: 2,
      choicesMax: 3,
      preBossChoices: ['rest', 'shop'], // la sala antes del jefe
    },

    // ---------------------------------------------------------
    // DIFICULTAD
    // ---------------------------------------------------------
    difficulty: {
      hpPerFloor: 0.1, // +8% de vida enemiga por sala dentro del reino
      dmgPerFloor: 0.04,
      waveBudgetBase: 8,
      waveBudgetPerFloor: 1.3,
      waveBudgetPerRealm: 2.5,
      wavesBase: 3,
      extraWaveEveryFloors: 3,
      eliteEscortBudget: 4,
      lateEnemiesFromFloor: 3,
      bossHpPerRealmAscension: 0, // reservado
    },

    // ---------------------------------------------------------
    // RECOMPENSAS, TIENDA Y DESCANSO
    // ---------------------------------------------------------
    rewards: {
      weights: { skillNew: 3, skillUp: 4, passive: 3, relic: 0.6, elementalNew: 0.35 },
      // cada hechizo que ya tenés de un elemento hace más probable que aparezcan otros de ese elemento
      elementAffinity: 1.6,
      eliteRelicChoices: 3,
      bossRelicMinRarity: 'rare',
      bossHealPct: 0.4,
    },

    // ---------------------------------------------------------
    // COFRES: a veces un enemigo suelta un cofre. Al tocarlo, sale una de estas cosas:
    //  upgrade = sube de nivel una habilidad o pasiva que YA tenés
    //  yul = yules (más en reinos avanzados) · heal = vida
    // ---------------------------------------------------------
    chests: {
      chance: 0.004, // probabilidad por enemigo común (casi nunca)
      eliteChance: 0.5, // probabilidad al derrotar un élite
      // los jefes siempre sueltan un cofre
      weights: { upgrade: 40, yul: 35, heal: 25 },
      // probabilidad de potenciar un hechizo (si tenés alguno al nivel máximo y menos de 2 potenciados)
      evolveChance: 0.12,
      yul: [20, 45],
      yulPerRealm: 0.3, // +30% de yules por reino
      healPct: 0.25,
    },
    shop: {
      relicCount: 3,
      passiveCount: 2,
      prices: { common: 55, rare: 85, epic: 120, legendary: 170, passive: 45, heal: 35, skillUp: 65 },
      healPct: 0.3,
      realmPriceGrowth: 0.12, // +12% de precio por reino
    },
    rest: { healPct: 0.35 },

    // ---------------------------------------------------------
    // EVENTOS
    //  efectos posibles: heal (% vida), maxHp, yul, relic ('random' o id),
    //  skillUp ('random'), passive ('random'), passiveId, damagePct (% de vida actual),
    //  chance + success + fail, yulPctGain, yulPctLoss
    //  cost: { yul: N } -> requiere y descuenta yules
    // ---------------------------------------------------------
    events: [
      {
        id: 'charmy', title: '¡Charmy tiene hambre!', icon: '🍙',
        text: 'Charmy aparece de la nada con una montaña de comida. "¿Compartimos? ...Bueno, un poquito."',
        options: [
          { label: 'Comer juntos', hint: 'Curás 35% de tu vida.', effects: [{ heal: 0.35 }] },
          { label: 'Invitarle más comida', hint: '-25 yules: +20 de vida máxima y curás 20%.', cost: { yul: 25 }, effects: [{ maxHp: 20 }, { heal: 0.2 }] },
          { label: 'Seguir de largo', hint: 'No pasa nada.', effects: [] },
        ],
      },
      {
        id: 'iglesia', title: 'La Iglesia de Hage', icon: '⛪',
        text: 'La Hermana Lily reza por los caballeros que pasan por el pueblo.',
        options: [
          { label: 'Rezar con ella', hint: 'Curás 20% de tu vida.', effects: [{ heal: 0.2 }] },
          { label: 'Donar a la iglesia', hint: '-40 yules: obtenés el Rosario de la Hermana Lily.', cost: { yul: 40 }, effects: [{ relic: 'rosarioLily' }] },
        ],
      },
      {
        id: 'mercader', title: 'Mercader Sospechoso', icon: '🎭',
        text: '"Tengo una reliquia rarísima... sólo 50 yules. Confiá en mí."',
        options: [
          { label: 'Comprar', hint: '-50 yules: reliquia aleatoria.', cost: { yul: 50 }, effects: [{ relic: 'random' }] },
          { label: 'Rechazar', hint: 'No pasa nada.', effects: [] },
        ],
      },
      {
        id: 'mazmorra', title: 'Mazmorra Antigua', icon: '🏚️',
        text: 'Una mazmorra recién aparecida. Se siente un maná muy denso adentro.',
        options: [
          { label: 'Explorarla', hint: '50%: reliquia. 50%: perdés 20% de tu vida.', effects: [{ chance: 0.5, success: [{ relic: 'random' }], fail: [{ damagePct: 0.2 }] }] },
          { label: 'Saquear la entrada', hint: '+30 yules.', effects: [{ yul: 30 }] },
        ],
      },
      {
        id: 'yami', title: 'Entrenamiento con Yami', icon: '🗡️',
        text: '"¡Superá tus límites ahora mismo, o te parto al medio!"',
        options: [
          { label: 'Entrenar', hint: 'Perdés 20% de tu vida actual: mejora aleatoria de habilidad.', effects: [{ damagePct: 0.2 }, { skillUp: 'random' }] },
          { label: 'Excusarse', hint: 'No pasa nada.', effects: [] },
        ],
      },
      {
        id: 'fuenteMana', title: 'Fuente de Maná', icon: '⛲',
        text: 'Un manantial de maná puro brota entre las rocas.',
        options: [
          { label: 'Beber', hint: 'Curás 15% y ganás una pasiva aleatoria.', effects: [{ heal: 0.15 }, { passive: 'random' }] },
          { label: 'Llenar frascos para vender', hint: '+40 yules.', effects: [{ yul: 40 }] },
        ],
      },
      {
        id: 'finral', title: 'Apuesta con Finral', icon: '🎲',
        text: '"¿Doble o nada? Vamos, la suerte está de mi lado... creo."',
        options: [
          { label: 'Apostar', hint: '50%: +50% de tus yules. 50%: perdés la mitad.', effects: [{ chance: 0.5, success: [{ yulPctGain: 0.5 }], fail: [{ yulPctLoss: 0.5 }] }] },
          { label: 'Mejor no', hint: 'No pasa nada.', effects: [] },
        ],
      },
      {
        id: 'grimorio', title: 'Grimorio Abandonado', icon: '📕',
        text: 'Un grimorio oscuro late en el suelo. Promete poder... a un precio.',
        options: [
          { label: 'Tomarlo', hint: '-15 de vida máxima: reliquia aleatoria rara o mejor.', effects: [{ maxHp: -15 }, { relic: 'random', minRarity: 'rare' }] },
          { label: 'Dejarlo', hint: 'No pasa nada.', effects: [] },
        ],
      },
      {
        id: 'nero', title: 'Un pájaro extraño', icon: '🐦',
        text: 'Un pájaro negro te mira fijo y picotea tu grimorio como si quisiera decirte algo.',
        options: [
          { label: 'Dejarlo hacer', hint: 'Mejora aleatoria de habilidad.', effects: [{ skillUp: 'random' }] },
          { label: 'Ahuyentarlo', hint: '+15 yules (se le cayeron).', effects: [{ yul: 15 }] },
        ],
      },
      {
        id: 'ki', title: 'Maestra del Ki', icon: '🧘',
        text: 'Una guerrera del Reino del Corazón te enseña a sentir el Ki de los enemigos.',
        options: [
          { label: 'Aprender', hint: 'Ganás Sentido del Ki.', effects: [{ passiveId: 'sentidoKi' }] },
          { label: 'Meditar', hint: 'Curás 25% de tu vida.', effects: [{ heal: 0.25 }] },
        ],
      },
    ],

    // ---------------------------------------------------------
    // PROGRESIÓN META (se guarda entre runs)
    // ---------------------------------------------------------
    meta: {
      upgrades: {
        vida: { name: 'Entrenamiento físico', icon: '❤️', desc: '+10 de vida máxima por nivel.', costs: [3, 5, 7, 10, 13, 17, 22, 28], mods: { maxHp: 10 } },
        fuerza: { name: 'Práctica de combate', icon: '💪', desc: '+5% de daño por nivel.', costs: [4, 6, 9, 12, 16, 21, 27, 34], mods: { damagePct: 0.05 } },
        armadura: { name: 'Disciplina de caballero', icon: '🛡️', desc: '+1 de armadura por nivel.', costs: [4, 7, 11, 16, 22], mods: { armor: 1 } },
        yules: { name: 'Ahorros del escuadrón', icon: '💰', desc: 'Empezás cada run con +25 yules por nivel.', costs: [2, 4, 7, 11], mods: { startYul: 25 } },
        rerolls: { name: 'Hojas de grimorio extra', icon: '📖', desc: '+1 re-tirada de recompensas por run.', costs: [5, 10, 16], mods: { rerolls: 1 } },
        meditacion: { name: 'Meditación', icon: '🧘', desc: 'Regenerás 0.2 de vida por segundo por nivel.', costs: [4, 8, 13], mods: { regen: 0.2 } },
        velocidad: { name: 'Entrenamiento de piernas', icon: '👟', desc: '+3% de velocidad de movimiento por nivel.', costs: [4, 8, 13], mods: { speedPct: 0.03 } },
        maldicion: { name: 'Pacto de Maldición', icon: '💀', desc: 'Por nivel: +12% de daño, pero 15% más enemigos y +15% de vida enemiga. También +15% de estrellas.', costs: [2, 4, 6], mods: { damagePct: 0.12, waveSizePct: 0.15, enemyHpPct: 0.15, starPct: 0.15 } },
        revivir: { name: 'Segunda oportunidad', icon: '✝️', desc: 'Una vez por run, al morir revivís con 40% de vida.', costs: [25], mods: { revives: 1 } },
      },
      stars: { perRoomsCleared: 3, perElite: 1, perBoss: 3, onWin: 5, ascensionBonus: 0.2 },
      reviveHpPct: 0.4,
    },

    // ---------------------------------------------------------
    // LOGROS: al cumplirlos ganás estrellas extra (una sola vez)
    // ---------------------------------------------------------
    achievements: [
      { id: 'primerPaso', icon: '🦁', name: 'Primer paso', desc: 'Derrotá a Vetto.', stars: 3 },
      { id: 'caballeroMagico', icon: '🎖️', name: 'Caballero Mágico', desc: 'Ganá una partida.', stars: 10 },
      { id: 'sinMagia', icon: '⚔️', name: 'Sin magia, sin problema', desc: 'Ganá con Asta.', stars: 8 },
      { id: 'rivales', icon: '🌪️', name: 'Rival eterno', desc: 'Ganá con Yuno.', stars: 8 },
      { id: 'princesa', icon: '🌊', name: 'La princesa de la Casa Silva', desc: 'Ganá con Noelle.', stars: 8 },
      { id: 'novatoProdigio', icon: '🧙', name: 'Novato prodigio', desc: 'Ganá con el Caballero Novato.', stars: 8 },
      { id: 'reyMago', icon: '👑', name: '¡Voy a ser el Rey Mago!', desc: 'Ganá con los 4 personajes.', stars: 25 },
      { id: 'elementalista', icon: '🌈', name: 'Elementalista', desc: 'Activá una sinergia de elemento completo (6 hechizos del mismo elemento).', stars: 8 },
      { id: 'coleccionista', icon: '📖', name: 'Coleccionista de sinergias', desc: 'Descubrí 15 sinergias en el Grimorio.', stars: 15 },
      { id: 'cazador', icon: '💀', name: 'Cazador', desc: 'Derrotá 500 enemigos en una sola partida.', stars: 5 },
      { id: 'masacre', icon: '☠️', name: 'Leyenda del campo de batalla', desc: 'Derrotá 5000 enemigos en total.', stars: 10 },
      { id: 'potenciado', icon: '✦', name: 'Poder desbordante', desc: 'Tené 2 hechizos potenciados en la misma partida.', stars: 8 },
      { id: 'legendario', icon: '🌟', name: 'Tesoro legendario', desc: 'Conseguí una reliquia legendaria.', stars: 6 },
      { id: 'intocable', icon: '👻', name: 'Intocable', desc: 'Derrotá a un jefe sin recibir daño en su sala.', stars: 10 },
      { id: 'millonario', icon: '💰', name: 'Millonario', desc: 'Juntá 500 yules a la vez.', stars: 5 },
      { id: 'sinEsquivar', icon: '🧱', name: 'Ni un paso atrás', desc: 'Ganá una partida sin usar el dash.', stars: 20 },
      { id: 'rango5', icon: '🏅', name: 'Caballero de Rango 5', desc: 'Ganá una partida en Rango 5 o más.', stars: 20 },
      { id: 'masAlla', icon: '👼', name: 'Más allá del Rey Mago', desc: 'Derrotá al jefe secreto.', stars: 30 },
    ],

    // ---------------------------------------------------------
    // ASCENSIÓN ("Rango"): se desbloquea al ganar. Cada rango suma
    // su modificador y TODOS los anteriores.
    // ---------------------------------------------------------
    ascension: [
      { name: 'Rango 1', desc: 'Los enemigos tienen +20% de vida.', mods: { enemyHpPct: 0.2 } },
      { name: 'Rango 2', desc: 'Los enemigos hacen +15% de daño.', mods: { enemyDmgPct: 0.15 } },
      { name: 'Rango 3', desc: 'Aparecen más salas de élite.', mods: { eliteWeight: 10 } },
      { name: 'Rango 4', desc: 'Las tiendas son 25% más caras.', mods: { shopPricePct: 0.25 } },
      { name: 'Rango 5', desc: 'Los descansos curan la mitad.', mods: { restHealPct: -0.5 } },
      { name: 'Rango 6', desc: 'Los jefes tienen +25% de vida.', mods: { bossHpPct: 0.25 } },
      { name: 'Rango 7', desc: 'Los enemigos son 10% más rápidos.', mods: { enemySpeedPct: 0.1 } },
      { name: 'Rango 8', desc: 'Empezás con 15% menos de vida máxima.', mods: { playerHpPct: -0.15 } },
      { name: 'Rango 9', desc: 'Las oleadas tienen 25% más enemigos.', mods: { waveSizePct: 0.25 } },
      { name: 'Rango 10', desc: 'Los jefes atacan 20% más seguido.', mods: { bossAttackSpeedPct: 0.2 } },
    ],
  };

  // ---- Completa datos derivados (no hace falta tocar esto) ----
  const D = BC.DATA;
  for (const id in D.skills) {
    const sk = D.skills[id];
    if (!sk.element) continue;
    const el = D.elements[sk.element];
    sk.character = null;
    sk.shared = true;
    sk.tags = ['elemental', sk.element];
    if (!sk.color) sk.color = el.color;
  }
  const elementalIds = Object.keys(D.skills).filter((id) => D.skills[id].element);
  for (const id in D.characters) {
    const ch = D.characters[id];
    if (ch.learnsElements) for (const sid of elementalIds) if (ch.skillPool.indexOf(sid) === -1) ch.skillPool.push(sid);
  }
})(typeof window !== 'undefined' ? window : globalThis);
