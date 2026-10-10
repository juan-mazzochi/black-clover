/*
 * Ejecuta los tests con Node:
 *   node tests/run-tests.js            (todos)
 *   node tests/run-tests.js --fast     (sin las simulaciones largas)
 *   node tests/run-tests.js sinergia   (sólo los que contienen "sinergia")
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILES = require('./files.js');
const rootDir = path.join(__dirname, '..');
for (const f of FILES) vm.runInThisContext(fs.readFileSync(path.join(rootDir, f), 'utf8'), { filename: f });
vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'test-cases.js'), 'utf8'), { filename: 'tests/test-cases.js' });

const args = process.argv.slice(2);
const skipSlow = args.includes('--fast');
const filter = args.find((a) => !a.startsWith('--'));

let ok = 0;
let fail = 0;
globalThis.BCTests.run({
  skipSlow,
  filter,
  onResult(r) {
    if (r.ok) {
      ok++;
      console.log('  OK   ' + r.name + (r.ms > 500 ? ' (' + (r.ms / 1000).toFixed(1) + ' s)' : ''));
    } else {
      fail++;
      console.log('  FALLA ' + r.name + '\n        ' + r.error.split('\n').slice(0, 4).join('\n        '));
    }
  },
});
console.log('\n' + ok + ' pasaron, ' + fail + ' fallaron');
process.exit(fail ? 1 : 0);
