/* TEAMRM - Posture & Correction — exercícios, dicas e ajuda. Texto original; orientações gerais, a prescrição é do profissional. */
'use strict';

// achado (chave da medida, sem lado) → exercícios sugeridos
const FINDING_EX = {
  cva: ['retracao', 'flexoresProfundos', 'retracaoParede', 'peitoral', 'extensaoToracica', 'suboccipitais'], fhpIndex: ['retracao', 'flexoresProfundos'], cabeca_cm: ['retracao', 'flexoresProfundos'],
  inclCraniana: ['retracao'], anguloOmbro: ['peitoral', 'remada', 'trapezioInferior', 'serratil', 'anjoParede'],
  cabeca: ['inclinacaoLateral', 'retracao'], desvioCabeca: ['inclinacaoLateral'],
  ombros: ['remada', 'yt', 'inclinacaoLateral'], ombros_cm: ['remada', 'inclinacaoLateral'], escapulas: ['remada', 'yt', 'setScapular', 'serratil'], simOmbros: ['remada'],
  pelve: ['inclinacaoLateral', 'conchas', 'ponte'], pelve_cm: ['inclinacaoLateral', 'conchas'], troncoLat: ['inclinacaoLateral', 'gatoCamelo'], eixo: ['conchas', 'equilibrioJoelho'],
  potsi: ['inclinacaoLateral', 'gatoCamelo', 'remada'], atsi: ['inclinacaoLateral', 'remada'], inclTronco: ['inclinacaoLateral'],
  pelveSag: ['flexoresQuadril', 'ponte', 'basculamento', 'transverso', 'isquios'], corpo: ['ponte', 'equilibrioJoelho'],
  joelhoSag: ['equilibrioJoelho', 'panturrilha', 'isquios'], q: ['conchas', 'gluteoMedioParede', 'agachamentoParede', 'peCurto'], femtib: ['conchas', 'agachamentoParede'], intermaleolar: ['conchas', 'agachamentoParede', 'peCurto'], intercondilar: ['conchas', 'isquios'],
  calc: ['peCurto', 'panturrilha', 'panturrilhaElevacao'], rot: ['conchas'],
  troncoCoxa: ['isquios', 'cadeiaPosterior', 'enrolarColuna', 'panturrilha'], dedoChao: ['isquios', 'cadeiaPosterior', 'enrolarColuna', 'panturrilha'],
  atr: ['gatoCamelo', 'livroAberto', 'respiracao9090'], troncoSag: ['extensaoToracica', 'gatoCamelo', 'ponte', 'agulha'],
};
function exercisesFor(found) {
  const ids = [], why = {};
  for (const { m } of found) {
    const k = m.key.startsWith('atr') ? 'atr' : m.key.replace(/[DE]$/, '');
    for (const id of FINDING_EX[k] || FINDING_EX[m.key] || []) { if (!ids.includes(id)) ids.push(id); (why[id] ||= new Set()).add(m.label.replace(/ — .*/, '')); }
  }
  return ids.map(id => ({ ...EXERCISES.find(e => e.id === id), why: [...why[id]] }));
}
const REFERRALS = m => (m.key.startsWith('atr') && m.score >= 7) ? 'Rotação do tronco ≥ 7° no teste de Adams: encaminhar para avaliação médica com radiografia panorâmica da coluna.' : null;

const TIPS = [
  'Monitor na altura dos olhos e a um braço de distância reduz a anteriorização da cabeça.',
  'A cada 30 minutos sentado, levante-se por 1 a 2 minutos.',
  'Mochila sempre nas duas alças, ajustada para ficar acima da cintura.',
  'Ao usar o celular, traga-o para a altura dos olhos em vez de baixar a cabeça.',
  'Pés apoiados no chão e quadril no fundo da cadeira ajudam a manter a lordose lombar.',
  'Dormir de lado com um travesseiro entre os joelhos alinha a pelve.',
  'Ao levantar peso do chão, dobre os joelhos e mantenha a carga perto do corpo.',
  'Alterne o lado em que carrega a bolsa ou a criança no colo.',
  'Respire pelo diafragma: a expansão do abdome reduz a tensão no trapézio.',
  'Calçados com bom apoio do calcanhar ajudam a controlar o valgo do retropé.',
  'Fortalecer glúteos protege joelhos e coluna lombar.',
  'Postura boa é a próxima postura: variar de posição importa mais que uma posição “perfeita”.',
  'Fotografe o paciente sempre no mesmo lugar e na mesma distância para comparar a evolução.',
  'Marque EIAS, EIPS e C7 por palpação antes da foto: a precisão das medidas depende disso.',
  'Adesivos verdes de 1 a 2 cm sobre os pontos anatômicos tornam a marcação automática mais precisa.',
  'No teste de Adams, a criança deve manter os joelhos estendidos e as palmas unidas.',
  'Reavalie a cada 8 a 12 semanas para registrar a evolução do tratamento.',
  'Hidratação e sono regular também influenciam a dor musculoesquelética.',
  'Exercícios de mobilidade pela manhã reduzem a rigidez de quem passa o dia sentado.',
  'Explique ao paciente o que cada linha da foto significa: entender aumenta a adesão.',
];
const tipOfDay = () => TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];

const HELP = [
  ['Como preparar o local', 'Use uma parede lisa e clara, boa iluminação frontal e um fio de prumo ou régua de 1 m no mesmo plano do paciente. Marque no chão a posição dos pés e a da câmera para repetir nas reavaliações.'],
  ['Como posicionar a câmera', 'Celular na vertical, parado (tripé ou apoio), na altura do umbigo para fotos de corpo inteiro, a cerca de 3 m. Não use zoom digital nem lente grande-angular.'],
  ['Como marcar os pontos', 'Toque em “Detectar com IA” para pré-posicionar. Depois arraste cada ponto até o local anatômico; a lupa aparece no canto enquanto você arrasta. Para posicionar um ponto específico, toque nele na lista e depois na foto. Use + e − para zoom.'],
  ['Marcadores verdes', 'Cole adesivos verdes nos pontos anatômicos antes da foto. Na marcação, toque em “Usar marcadores verdes”: cada ponto é ligado ao adesivo mais próximo. No vídeo, os adesivos são seguidos quadro a quadro.'],
  ['Medidas em centímetros', 'Ative “Calibrar com régua”, arraste os dois pontos amarelos até as pontas de um objeto de tamanho conhecido e informe o comprimento.'],
  ['Teste de Adams', 'Paciente descalço, pés juntos, joelhos estendidos, flete o tronco até ~90° com braços pendentes e palmas unidas. Fotografe por trás, câmera na altura das costas. Marque o ponto mais alto de cada lado na região com maior gibosidade. ATR ≥ 7° indica encaminhamento.'],
  ['Análise em vídeo', 'Grave de lado, câmera parada e perpendicular ao movimento, corpo inteiro no quadro. Vídeos curtos (5 a 15 s) processam mais rápido. O vídeo não é guardado; ficam os gráficos, a tabela e os quadros-chave.'],
  ['Onde ficam os dados', 'Somente neste aparelho e neste navegador. Exporte um backup em Configurações com frequência. Ao trocar de aparelho, restaure o backup no novo.'],
  ['Instalar como aplicativo', 'Android (Chrome): menu ⋮ → Adicionar à tela inicial. iPhone (Safari): Compartilhar → Adicionar à Tela de Início.'],
];
