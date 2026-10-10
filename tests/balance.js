/*
 * Reporte de balance: el bot juega muchas partidas y muestra hasta dónde llega.
 *   node tests/balance.js            (8 partidas por personaje)
 *   node tests/balance.js 20         (20 partidas por personaje)
 *   node tests/balance.js 5 god      (modo dios: mide duración de salas y jefes)
 * El bot juega peor que una persona: sirve para comparar, no como verdad absoluta.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const FILES = require('./files.js');
const rootDir = path.join(__dirname, '..');
for (const f of FILES) vm.runInThisContext(fs.readFileSync(path.join(rootDir, f), 'utf8'), { filename: f });
const BC = globalThis.BC;
const D = BC.DATA;

const N = Number(process.argv[2]) || 8;
const god = process.argv.includes('god');
const asc = Number((process.argv.find((a) => a.startsWith('asc=')) || 'asc=0').slice(4));
// meta = todas las mejoras compradas; meta=0.5 = la mitad de los niveles
const metaArg = process.argv.find((a) => a === 'meta' || a.startsWith('meta='));
const metaFrac = !metaArg ? 0 : metaArg === 'meta' ? 1 : Number(metaArg.slice(5));
const botSkill = Number((process.argv.find((a) => a.startsWith('skill=')) || 'skill=1').slice(6));

for (const ch of Object.keys(D.characters)) {
  const reached = [];
  let wins = 0;
  const roomTimes = {};
  const bossTimes = {};
  const deaths = {};
  for (let i = 0; i < N; i++) {
    const save = BC.Save.defaultSave();
    if (metaFrac) for (const id in D.meta.upgrades) if (id !== 'maldicion') save.upgrades[id] = Math.floor(D.meta.upgrades[id].costs.length * metaFrac);
    const r = BC.Bot.simulate({ characterId: ch, seed: 'BAL' + i, god, ascension: asc, save, botSkill, maxTime: 7200 });
    if (r.error) {
      console.log('ERROR', ch, r.error);
      continue;
    }
    const s = r.summary;
    if (s.won) wins++;
    reached.push(s.realmReached + 1 + '-' + s.floorReached);
    if (!s.won) {
      const node = BC.Run.nodeById(r.game.run, r.game.run.nodeId);
      const key = D.realms[node.realm].id + ':' + node.type;
      deaths[key] = (deaths[key] || 0) + 1;
    }
    for (const rl of r.roomLog) {
      const node = BC.Run.nodeById(r.game.run, rl.node);
      if (node.type === 'boss') (bossTimes[D.realms[node.realm].boss] = bossTimes[D.realms[node.realm].boss] || []).push(rl.time);
      else if (node.type === 'combat' || node.type === 'elite') (roomTimes[node.realm] = roomTimes[node.realm] || []).push(rl.time);
    }
  }
  const avg = (a) => (a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) + 's' : '-');
  console.log('\n=== ' + ch.toUpperCase() + ' === victorias ' + wins + '/' + N + (god ? ' (modo dios)' : '') + (asc ? ' asc ' + asc : '') + ' habilidad del bot ' + botSkill + (metaFrac ? ' meta ' + metaFrac : ''));
  console.log('  llegó a (reino-sala): ' + reached.join(' '));
  console.log('  murió en: ' + JSON.stringify(deaths));
  console.log('  duración media sala de pelea por reino: ' + [0, 1, 2, 3, 4].map((r) => avg(roomTimes[r])).join(' | '));
  console.log('  duración media de jefes: ' + Object.keys(bossTimes).map((b) => b + ' ' + avg(bossTimes[b])).join(' | '));
}
