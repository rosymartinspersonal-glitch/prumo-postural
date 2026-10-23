// Contratos Personal: calendário, feriados e valores — confere com os calendários 2027 feitos à mão — node tests/contratos.test.js
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = { console, Math, Number, String, JSON, Date, TextEncoder, require, Buffer }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'contratos-core.js'), 'utf8') + ';this.PC=PC;', ctx);
const { PC } = ctx;

// Páscoa e feriados móveis
assert.equal(PC.easter(2027).toISOString().slice(0, 10), '2027-03-28');
const H = PC.holidays(2027);
assert(H.some(h => h.date === '2027-03-26' && h.discount), 'Sexta-feira Santa');
assert(H.some(h => h.date === '2027-05-27' && !h.discount), 'Corpus Christi facultativo');
assert(H.some(h => h.date === '2027-10-19' && h.discount), 'Aniversário de Pouso Alegre');

const mk = days => { const S = PC.blankSchedule(2027); S.rules[0].days = days.map(([dow, dur, price]) => ({ dow, time: '', dur, price })); S.offs = PC.holidays(2027); return S; };
const d = (dows, dur = 50, price = 85) => dows.map(x => [x, dur, price]);
// [aluno, dias, aulas no ano, total, mensal fixo]  — valores dos PDFs
const CASES = [
  ['Aline (seg–qui)', d([1, 2, 3, 4]), 202, 17170, 1430.83],
  ['Letícia (seg–qua)', d([1, 2, 3]), 150, 12750, 1062.5],
  ['Inês 5 dias', d([1, 2, 3, 4, 5]), 252, 21420, 1785],
  ['Inês (seg, qua, qui, sex)', d([1, 3, 4, 5]), 204, 17340, 1445],
  ['Sueli (seg, ter 50 min; qui 80 min)', [[1, 50, 85], [2, 50, 85], [4, 80, 127.5]], 151, 15045, 1253.75],
  ['Sueli 2 dias (seg, qui 80 min)', d([1, 4], 80, 127.5), 103, 13132.5, 1094.38],
  ['Valter (ter, qui 80 min)', d([2, 4], 80, 127.5), 100, 12750, 1062.5],
];
for (const [name, days, lessons, total, fixed] of CASES) {
  const Y = PC.yearSummary(mk(days));
  assert.equal(Y.lessons, lessons, `${name}: aulas ${Y.lessons} ≠ ${lessons}`);
  assert.equal(Y.total, total, `${name}: total ${Y.total} ≠ ${total}`);
  assert.equal(Y.fixed, fixed, `${name}: mensal ${Y.fixed} ≠ ${fixed}`);
}
// Aline, mês a mês (tabela da página 4)
const al = PC.yearSummary(mk(d([1, 2, 3, 4]))).months;
assert.deepEqual(al.map(m => m.effective), [16, 16, 19, 16, 17, 18, 17, 18, 17, 14, 16, 18]);
assert.deepEqual(al.map(m => m.discounted), [0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 2, 0]);

// ajuste manual do mês e do valor fixo
const S = mk(d([1, 2, 3, 4])); S.monthly[10] = { value: 1300, manual: true };
let Y = PC.yearSummary(S); assert.equal(Y.months[9].value, 1300); assert(Y.months[9].manual); assert.equal(Y.total, 17170 - 1190 + 1300);
S.fixedOverride = 1400; Y = PC.yearSummary(S); assert.equal(Y.fixed, 1400); assert(Y.fixedManual);

// editar só esta aula × esta e as próximas
const S2 = mk(d([2, 4], 80, 127.5));
PC.editLesson(S2, '2027-03-02', { price: 100 }, 'one');
let mar = PC.monthSummary(S2, 2027, 3); assert.equal(mar.lessons.find(x => x.date === '2027-03-02').price, 100); assert.equal(mar.lessons.find(x => x.date === '2027-03-09').price, 127.5);
PC.editLesson(S2, '2027-06-01', { price: 140 }, 'next');
assert.equal(PC.monthSummary(S2, 2027, 5).lessons.find(x => x.date === '2027-05-25').price, 127.5, 'antes da data não muda');
assert.equal(PC.monthSummary(S2, 2027, 6).lessons.find(x => x.date === '2027-06-08').price, 140, 'terças seguintes mudam');
assert.equal(PC.monthSummary(S2, 2027, 6).lessons.find(x => x.date === '2027-06-03').price, 127.5, 'quintas não mudam');

// reposição: aula extra conta no valor; falta não desconta
const S3 = mk(d([1])); S3.offs.push({ date: '2027-01-06', name: 'Reposição', kind: 'reposicao', discount: false });
S3.lessons['2027-01-11'] = { status: 'falta' };
const jan = PC.monthSummary(S3, 2027, 1); assert.equal(jan.extra, 1); assert.equal(jan.effective, 5); assert.equal(jan.calc, 5 * 85);

// texto formatado e versão congelada
assert.equal(PC.sanitize('<p onclick="x">Oi <script>a</script><b>já</b></p>'), '<p>Oi a<b>já</b></p>');
assert.deepEqual(Array.from(PC.htmlToLines('<p>Linha <b>um</b></p><ul><li>item</li></ul>')), ['Linha um', '• item']);
const c = PC.blankContract('x', 2027); const h1 = PC.canonical(c); c.sections[0].items[0].value = 'Ana'; assert.notEqual(PC.canonical(c), h1);
assert.equal(PC.statusOf({ status: 'assinado', schedule: { end: '2027-12-31' } }, '2028-01-02'), 'vencido');
(async () => { const h = await PC.sha256('abc'); assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'); console.log('contratos: calendário confere com os 12 PDFs de 2027'); })();
// planos de personal: os dias sugeridos dão o valor mensal da tabela em 2027
{
  const c2 = { console, Math, Number, String, JSON, Date, Intl, encodeURIComponent }; vm.createContext(c2);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'alunos.js'), 'utf8').split('/* ================= telas')[0] + ';this.AL=AL;', c2);
  for (const p of c2.AL.PERSONAL_PLANS) {
    const S = PC.blankSchedule(2027); S.rules[0].days = p.days.map(([dow, dur, price]) => ({ dow, time: '', dur, price })); S.offs = PC.holidays(2027);
    assert.equal(PC.yearSummary(S).fixed, Number(p.monthly), `${p.name}: ${PC.yearSummary(S).fixed} ≠ ${p.monthly}`);
    assert.equal(p.days.length, p.perWeek, p.name + ' aulas por semana');
  }
  console.log('contratos: 6 planos de personal conferidos');
}
