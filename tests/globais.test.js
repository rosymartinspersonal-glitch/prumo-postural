// Nomes globais repetidos entre arquivos (const/let/class) quebram o app no navegador — node tests/globais.test.js
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const order = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const seen = new Map(), bad = [];
for (const f of order) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  for (const m of src.matchAll(/^(?:(const|let|class|var)\s+([A-Za-z_$][\w$]*)|(?:async\s+)?function\s+([A-Za-z_$][\w$]*))/gm)) {
    const name = m[2] || m[3], lex = !!m[2] && m[1] !== 'var';
    const prev = seen.get(name);
    if (prev && (lex || prev.lex)) bad.push(`${name}: ${prev.f} e ${f}`);
    if (!prev) seen.set(name, { f, lex });
  }
}
if (bad.length) { console.error('Conflitos de nomes globais:\n' + bad.join('\n')); process.exit(1); }
console.log(`globais: ${order.length} arquivos sem conflito de nomes`);
