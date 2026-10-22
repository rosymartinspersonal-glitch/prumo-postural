/* Prumo Postural — exercícios, dicas e ajuda. Texto original; orientações gerais, a prescrição é do profissional. */
'use strict';

const EXERCISES = [
  { id: 'retracao', name: 'Retração cervical', area: 'Cabeça e pescoço', dose: '10 repetições, segurando 5 s', steps: ['Sentado, coluna apoiada e olhar no horizonte.', 'Leve o queixo para trás, como se fizesse um “queixo duplo”, sem inclinar a cabeça.', 'Segure, relaxe e repita.'] },
  { id: 'flexoresProfundos', name: 'Ativação dos flexores profundos do pescoço', area: 'Cabeça e pescoço', dose: '10 × 10 s', steps: ['Deitado de barriga para cima, joelhos dobrados, toalha dobrada sob a cabeça.', 'Faça um aceno discreto de “sim”, aproximando o queixo da garganta.', 'Mantenha sem levantar a cabeça e sem tensionar a frente do pescoço.'] },
  { id: 'peitoral', name: 'Alongamento do peitoral no batente da porta', area: 'Ombros', dose: '3 × 30 s', steps: ['Antebraços apoiados no batente, cotovelos na altura dos ombros.', 'Dê um passo à frente até sentir alongar o peito.', 'Mantenha o abdome firme, sem arquear a lombar.'] },
  { id: 'remada', name: 'Remada com elástico', area: 'Ombros', dose: '3 × 12', steps: ['Elástico preso à frente, na altura do peito.', 'Puxe os cotovelos para trás aproximando as escápulas.', 'Volte devagar, sem elevar os ombros.'] },
  { id: 'yt', name: 'Elevação em Y e T deitado de bruços', area: 'Ombros', dose: '2 × 10 de cada', steps: ['Deitado de bruços, testa apoiada numa toalha.', 'Eleve os braços em forma de Y, polegares para cima, e desça.', 'Repita com os braços abertos em T.'] },
  { id: 'extensaoToracica', name: 'Extensão torácica sobre toalha enrolada', area: 'Coluna', dose: '10 repetições', steps: ['Deitado com uma toalha enrolada transversal na altura das escápulas.', 'Mãos atrás da cabeça, estenda a coluna sobre a toalha.', 'Volte devagar. Mude a toalha alguns centímetros e repita.'] },
  { id: 'gatoCamelo', name: 'Mobilidade gato-camelo', area: 'Coluna', dose: '2 × 10', steps: ['Em quatro apoios, mãos sob os ombros e joelhos sob o quadril.', 'Arredonde as costas olhando para o umbigo.', 'Depois afunde a coluna olhando para a frente, sem dor.'] },
  { id: 'inclinacaoLateral', name: 'Alongamento lateral do tronco', area: 'Coluna', dose: '3 × 30 s de cada lado', steps: ['Em pé, pés afastados, um braço estendido acima da cabeça.', 'Incline o tronco para o lado oposto sem girar.', 'Respire devagar e mantenha.'] },
  { id: 'ponte', name: 'Ponte de glúteos', area: 'Pelve e quadril', dose: '3 × 12', steps: ['Deitado de barriga para cima, joelhos dobrados e pés apoiados.', 'Contraia os glúteos e eleve o quadril até alinhar ombros, quadril e joelhos.', 'Desça vértebra por vértebra.'] },
  { id: 'flexoresQuadril', name: 'Alongamento do iliopsoas em semiajoelhado', area: 'Pelve e quadril', dose: '3 × 30 s de cada lado', steps: ['Um joelho no chão e o outro pé à frente.', 'Encaixe a pelve (retroversão) e leve o quadril à frente.', 'Sinta alongar a frente do quadril do joelho apoiado.'] },
  { id: 'basculamento', name: 'Basculamento pélvico', area: 'Pelve e quadril', dose: '2 × 15', steps: ['Deitado de barriga para cima, joelhos dobrados.', 'Pressione a lombar contra o chão girando a pelve para trás.', 'Relaxe e alterne com a lordose suave.'] },
  { id: 'isquios', name: 'Alongamento dos isquiotibiais', area: 'Membros inferiores', dose: '3 × 30 s de cada lado', steps: ['Deitado, uma perna estendida no chão.', 'Eleve a outra perna estendida com uma faixa no pé.', 'Pare ao sentir alongar atrás da coxa, sem dobrar o joelho.'] },
  { id: 'conchas', name: 'Abdução em concha com elástico', area: 'Membros inferiores', dose: '3 × 15 de cada lado', steps: ['Deitado de lado, quadril e joelhos dobrados, elástico acima dos joelhos.', 'Mantenha os pés juntos e abra o joelho de cima.', 'Não deixe a pelve rolar para trás.'] },
  { id: 'agachamentoParede', name: 'Agachamento na parede com controle do joelho', area: 'Membros inferiores', dose: '3 × 10', steps: ['Costas na parede, pés à frente na largura do quadril.', 'Desça até ~60° de flexão do joelho mantendo os joelhos alinhados com o 2º dedo.', 'Suba empurrando o chão.'] },
  { id: 'equilibrioJoelho', name: 'Apoio unipodal com joelho destravado', area: 'Membros inferiores', dose: '3 × 30 s de cada lado', steps: ['Em pé sobre uma perna, joelho levemente flexionado, sem travar para trás.', 'Mantenha a pelve nivelada.', 'Progrida fechando os olhos.'] },
  { id: 'panturrilha', name: 'Alongamento da panturrilha na parede', area: 'Membros inferiores', dose: '3 × 30 s de cada lado', steps: ['Mãos na parede, uma perna atrás com o calcanhar no chão.', 'Joelho de trás estendido, leve o quadril à frente.', 'Repita com o joelho de trás dobrado.'] },
  { id: 'peCurto', name: 'Exercício do pé curto', area: 'Pés', dose: '3 × 10, segurando 5 s', steps: ['Sentado, pé apoiado no chão.', 'Aproxime a base do dedão do calcanhar, elevando o arco, sem dobrar os dedos.', 'Progrida para em pé e depois em apoio unipodal.'] },
];
// achado (chave da medida, sem lado) → exercícios sugeridos
const FINDING_EX = {
  cva: ['retracao', 'flexoresProfundos', 'peitoral', 'extensaoToracica'], fhpIndex: ['retracao', 'flexoresProfundos'], cabeca_cm: ['retracao', 'flexoresProfundos'],
  inclCraniana: ['retracao'], anguloOmbro: ['peitoral', 'remada', 'yt'],
  cabeca: ['inclinacaoLateral', 'retracao'], desvioCabeca: ['inclinacaoLateral'],
  ombros: ['remada', 'yt', 'inclinacaoLateral'], ombros_cm: ['remada', 'inclinacaoLateral'], escapulas: ['remada', 'yt'], simOmbros: ['remada'],
  pelve: ['inclinacaoLateral', 'conchas', 'ponte'], pelve_cm: ['inclinacaoLateral', 'conchas'], troncoLat: ['inclinacaoLateral', 'gatoCamelo'], eixo: ['conchas', 'equilibrioJoelho'],
  potsi: ['inclinacaoLateral', 'gatoCamelo', 'remada'], atsi: ['inclinacaoLateral', 'remada'], inclTronco: ['inclinacaoLateral'],
  pelveSag: ['flexoresQuadril', 'ponte', 'basculamento', 'isquios'], troncoSag: ['extensaoToracica', 'gatoCamelo', 'ponte'], corpo: ['ponte', 'equilibrioJoelho'],
  joelhoSag: ['equilibrioJoelho', 'panturrilha', 'isquios'], q: ['conchas', 'agachamentoParede', 'peCurto'], femtib: ['conchas', 'agachamentoParede'], intermaleolar: ['conchas', 'agachamentoParede', 'peCurto'], intercondilar: ['conchas', 'isquios'],
  calc: ['peCurto', 'panturrilha'], rot: ['conchas'],
  troncoCoxa: ['isquios', 'gatoCamelo', 'panturrilha'], dedoChao: ['isquios', 'gatoCamelo', 'panturrilha'],
};
function exercisesFor(found) {
  const ids = [], why = {};
  for (const { m } of found) {
    const k = m.key.replace(/[DE]$/, '');
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
