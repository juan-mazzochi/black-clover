/*
 * Arma una versión del juego en UN SOLO archivo (dist/BlackClover.html),
 * con todos los js y el css adentro. Sirve para mandarlo por WhatsApp/mail
 * o subirlo a cualquier página: se abre con el navegador y listo.
 *
 * Uso:  node tools/build-single.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// el css va adentro
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, file) => {
  const css = fs.readFileSync(path.join(root, file), 'utf8');
  return '<style>\n' + css + '\n</style>';
});

// cada script va adentro, en el mismo orden
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, file) => {
  const js = fs.readFileSync(path.join(root, file), 'utf8').replace(/<\/script/gi, '<\/script');
  return '<script>/* ' + file + ' */\n' + js + '\n</script>';
});

if (/src="js\//.test(html) || /href="css\//.test(html)) throw new Error('Quedó algún archivo sin incluir');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'BlackClover.html');
fs.writeFileSync(out, html);
console.log('Listo: ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
