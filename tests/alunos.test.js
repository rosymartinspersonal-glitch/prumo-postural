// Testes do controle de alunos (datas, lembretes, mensagens, renovação, planilha) — node tests/alunos.test.js
const assert = require('assert'), vm = require('vm'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'alunos.js'), 'utf8').split('/* ================= telas')[0];
const ctx = { console, Intl, Date, Math, Number, String, encodeURIComponent }; vm.createContext(ctx);
vm.runInContext(src + ';this.AL=AL;', ctx);
const { AL } = ctx;
const T = '2026-10-23';

// datas
assert.equal(AL.addMonths('2026-01-31', 1), '2026-02-28');
assert.equal(AL.addMonths('2026-10-23', 3), '2027-01-23');
assert.equal(AL.addDays('2026-12-31', 1), '2027-01-01');
assert.equal(AL.days('2026-10-30', T), 7);
assert.equal(AL.br('2026-10-23'), '23/10/2026');
assert.equal(AL.toISO('5/3/26'), '2026-03-05');
assert.equal(AL.today(new Date('2026-10-24T02:30:00Z')), '2026-10-23', 'fuso de Brasília');

// dinheiro
assert.equal(AL.parseMoney('1.062,50'), '1062.50');
assert.equal(AL.parseMoney('R$ 350'), '350.00');
assert.equal(AL.parseMoney('abc'), null);
assert.equal(AL.moneyInput('1062.5'), '1.062,50');

// validação
assert.equal(AL.validate({ ...AL.blank(), name: 'Ana', service: 'X', plan: 'Mensal', start: '2026-10-10', end: '2026-10-01' }), 'A data de término deve ser igual ou posterior ao início.');
assert.equal(AL.validate({ ...AL.blank(), name: 'Ana', service: 'X', plan: 'Mensal' }), '');

// lembretes
const ana = { ...AL.blank(), id: 'a', name: 'Ana Souza', service: 'Planilha de Treino RM', plan: 'Mensal', start: '2026-10-01', end: '2026-10-25', revision1: '2026-10-20', revision2: '2026-10-28', revision3: '2026-11-20', phone: '(35) 99999-0000' };
const bia = { ...AL.blank(), id: 'b', name: 'Bia', service: 'Protocolo Alimentar – Dieta', plan: 'Trimestral', end: '2026-10-23', revision1: '2026-10-22', revision1Status: 'Finalizado' };
const caio = { ...AL.blank(), id: 'c', name: 'Caio', service: 'Consultoria Online', plan: 'Mensal', end: '2026-10-24', studentStatus: 'Inativo' };
let r = AL.reminders([ana, bia, caio], T, 7);
assert.deepEqual(r.map(x => x.id), ['a:rev:1', 'b:end', 'a:end', 'a:rev:2'], 'ordem e filtros');
assert.equal(r[0].days, -3);
assert.equal(AL.remTitle(r[0]), 'Troca de treino');
assert.equal(AL.remTitle({ kind: 'revision', record: bia }), 'Revisão do acompanhamento');
assert.equal(AL.reminders([ana, bia], T, 7, true).length, 5, 'inclui finalizadas');
assert(AL.message(r[0]).includes('segue pendente'));
assert(AL.message(r[1]).includes('vence hoje (23/10/2026)'));
assert(AL.message(r[0]).startsWith('Olá, Ana!'));
assert.equal(AL.message({ ...r[1], record: { ...bia, expiryMessage: 'Oi!', expiryMessageEnd: '2026-10-23' } }), 'Oi!');
assert.equal(AL.waLink('(35) 99999-0000', 'oi'), 'https://wa.me/5535999990000?text=oi');

// estatísticas
const s = AL.stats([ana, bia, caio], T);
assert.equal(s.total, 3); assert.equal(s.active, 2); assert.equal(s.expiring, 2); assert.equal(s.revLate, 1);

// sugestões e renovação
assert.deepEqual(Array.from(AL.suggestRevisions({ start: '2026-10-01', end: '2026-12-31', deadline: '30 dias' })), ['2026-10-31', '2026-11-30', '2026-12-30']);
assert.deepEqual(Array.from(AL.suggestRevisions({ start: '2026-10-01', end: '2026-10-31', deadline: '45 dias' })), []);
const nx = AL.renew(ana, 1, T);
assert.equal(nx.start, '2026-10-26'); assert.equal(nx.end, '2026-11-25');
assert.equal(nx.history.length, 1); assert.equal(nx.history[0].revisions.length, 3);
assert.equal(nx.revision1, '2026-11-25'); assert.equal(nx.revision1Status, '');

// planilha: ida e volta
const csv = AL.toCSV([{ ...ana, amount: '190.00', notes: '=perigo; "aspas"', revision1Status: 'Finalizado', paid: true }, bia]);
assert(csv.startsWith('﻿"NOME DO CLIENTE"'));
const back = AL.fromCSV(csv);
assert.equal(back.length, 2);
assert.equal(back[0].name, 'Ana Souza'); assert.equal(back[0].end, '2026-10-25'); assert.equal(back[0].amount, '190.00');
assert.equal(back[0].notes, '=perigo; "aspas"'); assert.equal(back[0].revision1Status, 'Finalizado'); assert.equal(back[0].paid, true);
// planilha do controle antigo (sem coluna PAGAMENTO EM DIA, datas AAAA-MM-DD)
const oldCsv = '﻿"NOME DO CLIENTE";"QUAL SERVIÇO";"TIPO DE PLANO";"DATA DE TÉRMINO DO PACOTE";"VALOR DO CLIENTE (R$)";"REVISÃO 1 CONCLUÍDA";"STATUS DO ALUNO"\r\n"João";"Consultoria Online";"Mensal";"2026-11-01";"230,00";"Sim";"Ativo"';
const o = AL.fromCSV(oldCsv)[0];
assert.equal(o.end, '2026-11-01'); assert.equal(o.amount, '230.00'); assert.equal(o.revision1Status, 'Finalizado'); assert.equal(o.situation, 'Ativo');

console.log('alunos: todos os testes passaram');
