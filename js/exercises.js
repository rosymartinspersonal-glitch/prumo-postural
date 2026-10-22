/* TEAMRM - Posture & Correction — biblioteca de exercícios corretivos.
   Texto e ilustrações originais. Doses são pontos de partida; a prescrição é do profissional. */
'use strict';

const EX_CATS = {
  alongamento: 'Alongamento',
  fortalecimento: 'Fortalecimento',
  mobilidade: 'Mobilidade',
  ativacao: 'Ativação corretiva',
};

/* d = { sets, reps, hold (s), sides } */
const X = (id, name, cat, area, pose, d, steps) => ({ id, name, cat, area, pose, d, steps });
const EXERCISES = [
  // ---------- alongamentos ----------
  X('panturrilha', 'Alongamento da panturrilha na parede', 'alongamento', 'Tornozelo e pé', 'paredeFrente', { sets: 1, reps: 3, hold: 30, sides: true }, ['Mãos na parede, uma perna à frente e a outra atrás com o calcanhar no chão.', 'Mantenha o joelho de trás estendido e leve o quadril em direção à parede.', 'Repita com o joelho de trás levemente dobrado para alongar o sóleo.']),
  X('isquios', 'Alongamento dos isquiotibiais com faixa', 'alongamento', 'Quadril e coxa', 'supinoPernaAlta', { sets: 1, reps: 3, hold: 30, sides: true }, ['Deitado de barriga para cima, uma perna estendida no chão.', 'Passe uma faixa no pé da outra perna e eleve-a estendida.', 'Pare ao sentir alongar atrás da coxa, sem dobrar o joelho nem tirar o quadril do chão.']),
  X('flexoresQuadril', 'Alongamento do iliopsoas em semiajoelhado', 'alongamento', 'Quadril e coxa', 'semiajoelhado', { sets: 1, reps: 3, hold: 30, sides: true }, ['Um joelho no chão e o outro pé à frente, com os dois joelhos a 90°.', 'Encaixe a pelve (bumbum para baixo) e contraia o glúteo do lado apoiado.', 'Leve o quadril à frente até sentir alongar a frente do quadril.']),
  X('peitoral', 'Alongamento do peitoral no batente da porta', 'alongamento', 'Ombro e tórax', 'emPeBracoAberto', { sets: 1, reps: 3, hold: 30, sides: false }, ['Antebraços apoiados no batente, cotovelos na altura dos ombros.', 'Dê um passo à frente até sentir alongar o peito.', 'Mantenha o abdome firme, sem arquear a lombar.']),
  X('quadriceps', 'Alongamento do quadríceps em pé', 'alongamento', 'Quadril e coxa', 'emPeQuadriceps', { sets: 1, reps: 3, hold: 30, sides: true }, ['Em pé, apoie uma mão na parede.', 'Segure o tornozelo e leve o calcanhar em direção ao glúteo.', 'Mantenha os joelhos alinhados e a pelve encaixada.']),
  X('piriforme', 'Alongamento do piriforme (figura 4)', 'alongamento', 'Quadril e coxa', 'supinoJoelhos', { sets: 1, reps: 3, hold: 30, sides: true }, ['Deitado, joelhos dobrados.', 'Cruze o tornozelo sobre o joelho oposto.', 'Puxe a coxa de baixo em direção ao peito até sentir alongar o glúteo.']),
  X('trapezioSuperior', 'Alongamento do trapézio superior', 'alongamento', 'Cabeça e pescoço', 'sentadoCadeira', { sets: 1, reps: 3, hold: 30, sides: true }, ['Sentado, segure a borda da cadeira com uma mão.', 'Incline a orelha oposta em direção ao ombro.', 'Com a outra mão, faça uma leve pressão sobre a cabeça.']),
  X('escalenos', 'Alongamento dos escalenos', 'alongamento', 'Cabeça e pescoço', 'sentadoCadeira', { sets: 1, reps: 3, hold: 20, sides: true }, ['Sentado, mão sobre a clavícula do lado a alongar.', 'Incline a cabeça para o lado oposto e eleve levemente o queixo.', 'Respire devagar, sem dor.']),
  X('inclinacaoLateral', 'Alongamento lateral do tronco', 'alongamento', 'Coluna', 'emPeInclinado', { sets: 1, reps: 3, hold: 30, sides: true }, ['Em pé, pés afastados, um braço estendido acima da cabeça.', 'Incline o tronco para o lado oposto sem girar.', 'Respire devagar e mantenha.']),
  X('adutores', 'Alongamento dos adutores (borboleta)', 'alongamento', 'Quadril e coxa', 'sentadoChao', { sets: 1, reps: 3, hold: 30, sides: false }, ['Sentado no chão, junte as plantas dos pés.', 'Segure os pés e deixe os joelhos caírem para os lados.', 'Mantenha a coluna alongada.']),
  X('rotativoSentado', 'Alongamento rotativo, sentado', 'alongamento', 'Coluna', 'sentadoChao', { sets: 1, reps: 4, hold: 30, sides: true }, ['Sentado, uma perna estendida e a outra cruzada por cima com o pé apoiado.', 'Gire o tronco para o lado do joelho dobrado, apoiando o cotovelo nele.', 'Cresça a coluna a cada expiração.']),
  X('posturaCrianca', 'Postura da criança com alcance lateral', 'alongamento', 'Coluna', 'crianca', { sets: 1, reps: 3, hold: 30, sides: true }, ['Ajoelhado, sente sobre os calcanhares e leve os braços à frente no chão.', 'Leve as mãos para um lado para alongar o grande dorsal do lado oposto.', 'Respire expandindo as costelas.']),
  X('cadeiaPosterior', 'Alongamento da cadeia posterior em pé', 'alongamento', 'Coluna', 'emPeFlexao', { sets: 1, reps: 3, hold: 30, sides: false }, ['Em pé, joelhos levemente destravados.', 'Desça o tronco deixando a cabeça e os braços pendentes.', 'Suba devagar, vértebra por vértebra.']),
  X('tfl', 'Alongamento do tensor da fáscia lata', 'alongamento', 'Quadril e coxa', 'emPeInclinado', { sets: 1, reps: 3, hold: 30, sides: true }, ['Em pé, cruze a perna a alongar por trás da outra.', 'Incline o quadril para o lado da perna de trás.', 'Sinta alongar a lateral do quadril e da coxa.']),
  X('sleeper', 'Alongamento dos rotadores do ombro (sleeper)', 'alongamento', 'Ombro e tórax', 'deLado', { sets: 1, reps: 3, hold: 30, sides: true }, ['Deitado de lado sobre o ombro a alongar, braço a 90° à frente e cotovelo dobrado.', 'Com a outra mão, leve suavemente o antebraço em direção ao chão.', 'Pare antes de qualquer dor na frente do ombro.']),
  X('suboccipitais', 'Alongamento dos suboccipitais', 'alongamento', 'Cabeça e pescoço', 'sentadoCadeira', { sets: 1, reps: 3, hold: 20, sides: false }, ['Sentado, faça uma leve retração do queixo.', 'Entrelace as mãos atrás da cabeça e leve o queixo em direção ao peito.', 'Sinta alongar a base do crânio.']),

  // ---------- fortalecimento ----------
  X('ponte', 'Ponte de glúteos', 'fortalecimento', 'Pelve e glúteos', 'ponte', { sets: 3, reps: 12, hold: 0, sides: false }, ['Deitado de barriga para cima, joelhos dobrados e pés apoiados.', 'Contraia os glúteos e eleve o quadril até alinhar ombros, quadril e joelhos.', 'Desça vértebra por vértebra.']),
  X('ponteUnipodal', 'Ponte unipodal', 'fortalecimento', 'Pelve e glúteos', 'ponte', { sets: 3, reps: 8, hold: 0, sides: true }, ['Na posição de ponte, estenda uma perna.', 'Eleve o quadril sem deixar a pelve cair para o lado da perna livre.', 'Desça devagar.']),
  X('conchas', 'Conchas com elástico', 'fortalecimento', 'Pelve e glúteos', 'deLadoJoelhos', { sets: 3, reps: 15, hold: 0, sides: true }, ['Deitado de lado, quadril e joelhos dobrados, elástico acima dos joelhos.', 'Mantenha os pés juntos e abra o joelho de cima.', 'Não deixe a pelve rolar para trás.']),
  X('abducaoQuadril', 'Abdução do quadril deitado de lado', 'fortalecimento', 'Pelve e glúteos', 'deLadoPernaAlta', { sets: 3, reps: 12, hold: 2, sides: true }, ['Deitado de lado, perna de baixo dobrada, perna de cima estendida.', 'Eleve a perna de cima levemente para trás, com o pé reto.', 'Desça devagar, sem girar o quadril.']),
  X('agachamentoParede', 'Agachamento na parede', 'fortalecimento', 'Joelho', 'paredeSentado', { sets: 3, reps: 10, hold: 10, sides: false }, ['Costas na parede, pés à frente na largura do quadril.', 'Desça até cerca de 60° de flexão dos joelhos, alinhados com o 2º dedo.', 'Segure e suba empurrando o chão.']),
  X('agachamento', 'Agachamento livre', 'fortalecimento', 'Joelho', 'agachado', { sets: 3, reps: 12, hold: 0, sides: false }, ['Pés na largura dos ombros, braços à frente.', 'Leve o quadril para trás e para baixo, joelhos na direção dos pés.', 'Suba contraindo glúteos e mantendo o tronco firme.']),
  X('avanco', 'Avanço (afundo)', 'fortalecimento', 'Joelho', 'avanco', { sets: 3, reps: 10, hold: 0, sides: true }, ['Dê um passo à frente.', 'Desça o joelho de trás em direção ao chão, tronco ereto.', 'Empurre com o pé da frente para voltar.']),
  X('remada', 'Remada com elástico', 'fortalecimento', 'Ombro e tórax', 'emPeRemada', { sets: 3, reps: 12, hold: 0, sides: false }, ['Elástico preso à frente, na altura do peito.', 'Puxe os cotovelos para trás aproximando as escápulas.', 'Volte devagar, sem elevar os ombros.']),
  X('yt', 'Elevação em Y e T deitado de bruços', 'fortalecimento', 'Ombro e tórax', 'pronoBracos', { sets: 2, reps: 10, hold: 2, sides: false }, ['Deitado de bruços, testa apoiada numa toalha.', 'Eleve os braços em forma de Y, polegares para cima, e desça.', 'Repita com os braços abertos em T.']),
  X('pranchaFrontal', 'Prancha frontal', 'fortalecimento', 'Abdome e tronco', 'prancha', { sets: 3, reps: 1, hold: 30, sides: false }, ['Apoie antebraços e pontas dos pés.', 'Alinhe cabeça, tronco e pernas, abdome firme.', 'Respire sem prender o ar.']),
  X('pranchaLateral', 'Prancha lateral', 'fortalecimento', 'Abdome e tronco', 'pranchaLateral', { sets: 3, reps: 1, hold: 20, sides: true }, ['De lado, apoie o antebraço e a lateral dos pés (ou dos joelhos).', 'Eleve o quadril alinhando o corpo.', 'Não deixe o quadril cair.']),
  X('perdigueiro', 'Perdigueiro (bird dog)', 'fortalecimento', 'Abdome e tronco', 'quatroApoiosBirdDog', { sets: 3, reps: 8, hold: 3, sides: true }, ['Em quatro apoios, coluna neutra.', 'Estenda um braço e a perna oposta sem girar a pelve.', 'Volte devagar e alterne.']),
  X('deadBug', 'Dead bug', 'fortalecimento', 'Abdome e tronco', 'deadBug', { sets: 3, reps: 8, hold: 0, sides: true }, ['Deitado, braços para o teto e joelhos a 90°.', 'Estenda um braço e a perna oposta mantendo a lombar no chão.', 'Volte e alterne.']),
  X('abdominalInferior', 'Fortalecimento abdominal inferior', 'fortalecimento', 'Abdome e tronco', 'deadBug', { sets: 1, reps: 8, hold: 5, sides: false }, ['Deitado, joelhos a 90° no ar e lombar apoiada.', 'Desça os pés lentamente até quase tocar o chão sem a lombar sair do chão.', 'Segure e volte.']),
  X('panturrilhaElevacao', 'Elevação dos calcanhares', 'fortalecimento', 'Tornozelo e pé', 'emPePontaPe', { sets: 3, reps: 15, hold: 0, sides: false }, ['Em pé, mãos apoiadas numa parede.', 'Suba na ponta dos pés mantendo o peso sobre o dedão.', 'Desça devagar.']),
  X('extensaoLombar', 'Extensão das costas deitado de bruços', 'fortalecimento', 'Coluna', 'pronoExtensao', { sets: 2, reps: 10, hold: 3, sides: false }, ['Deitado de bruços, braços ao lado do corpo.', 'Eleve levemente o peito olhando para o chão.', 'Segure e desça devagar.']),

  // ---------- mobilidade ----------
  X('gatoCamelo', 'Mobilidade gato-camelo', 'mobilidade', 'Coluna', 'quatroApoios', { sets: 2, reps: 10, hold: 0, sides: false }, ['Em quatro apoios, mãos sob os ombros e joelhos sob o quadril.', 'Arredonde as costas olhando para o umbigo.', 'Depois afunde a coluna olhando para a frente, sem dor.']),
  X('extensaoToracica', 'Extensão torácica sobre toalha enrolada', 'mobilidade', 'Coluna', 'supinoJoelhos', { sets: 1, reps: 10, hold: 3, sides: false }, ['Deitado com uma toalha enrolada transversal na altura das escápulas.', 'Mãos atrás da cabeça, estenda a coluna sobre a toalha.', 'Volte devagar. Mude a toalha alguns centímetros e repita.']),
  X('agulha', 'Rotação torácica em quatro apoios (agulha)', 'mobilidade', 'Coluna', 'quatroApoios', { sets: 2, reps: 8, hold: 2, sides: true }, ['Em quatro apoios, passe um braço por baixo do outro girando o tronco.', 'Depois abra o mesmo braço para o teto, seguindo a mão com o olhar.', 'Mantenha o quadril parado.']),
  X('livroAberto', 'Livro aberto', 'mobilidade', 'Coluna', 'deLadoJoelhos', { sets: 2, reps: 8, hold: 3, sides: true }, ['Deitado de lado, joelhos dobrados à frente e braços estendidos juntos.', 'Abra o braço de cima para o outro lado girando o tronco.', 'Mantenha os joelhos juntos no chão.']),
  X('tornozeloParede', 'Mobilidade do tornozelo, joelho à parede', 'mobilidade', 'Tornozelo e pé', 'semiajoelhado', { sets: 2, reps: 10, hold: 0, sides: true }, ['Semiajoelhado de frente para a parede, pé da frente a um palmo dela.', 'Leve o joelho em direção à parede sem tirar o calcanhar do chão.', 'Afaste o pé conforme ganhar amplitude.']),
  X('quadril9090', 'Rotação de quadril 90/90', 'mobilidade', 'Quadril e coxa', 'sentadoChao', { sets: 2, reps: 8, hold: 0, sides: false }, ['Sentado, joelhos dobrados a 90° para um lado.', 'Gire os dois joelhos para o outro lado, mantendo o tronco ereto.', 'Use as mãos de apoio no início.']),
  X('circulosOmbro', 'Círculos de ombro', 'mobilidade', 'Ombro e tórax', 'emPe', { sets: 2, reps: 10, hold: 0, sides: false }, ['Em pé, braços relaxados.', 'Faça círculos amplos com os ombros para trás.', 'Mantenha o pescoço relaxado.']),
  X('anjoParede', 'Anjo na parede', 'mobilidade', 'Ombro e tórax', 'paredeAnjo', { sets: 2, reps: 10, hold: 0, sides: false }, ['Costas, cabeça e braços apoiados na parede, cotovelos a 90°.', 'Deslize os braços para cima sem desencostar.', 'Desça trazendo os cotovelos para baixo.']),
  X('rotacaoCervical', 'Mobilidade cervical em rotação', 'mobilidade', 'Cabeça e pescoço', 'sentadoCadeira', { sets: 2, reps: 8, hold: 0, sides: true }, ['Sentado, coluna alongada.', 'Gire a cabeça para um lado até o limite confortável.', 'Volte ao centro e alterne.']),
  X('basculamento', 'Basculamento pélvico', 'mobilidade', 'Pelve e glúteos', 'supinoJoelhos', { sets: 2, reps: 15, hold: 0, sides: false }, ['Deitado de barriga para cima, joelhos dobrados.', 'Pressione a lombar contra o chão girando a pelve para trás.', 'Relaxe e alterne com uma lordose suave.']),
  X('rotacaoLombar', 'Rotação lombar deitado', 'mobilidade', 'Coluna', 'supinoJoelhos', { sets: 2, reps: 10, hold: 0, sides: false }, ['Deitado, joelhos dobrados e juntos, braços abertos.', 'Leve os joelhos para um lado e depois para o outro.', 'Mantenha os ombros no chão.']),
  X('circulosQuadril', 'Círculos de quadril em quatro apoios', 'mobilidade', 'Quadril e coxa', 'quatroApoios', { sets: 2, reps: 8, hold: 0, sides: true }, ['Em quatro apoios, eleve um joelho dobrado.', 'Desenhe círculos amplos com o joelho.', 'Não deixe a coluna girar.']),
  X('agachamentoProfundo', 'Agachamento profundo com apoio', 'mobilidade', 'Quadril e coxa', 'agachado', { sets: 1, reps: 3, hold: 30, sides: false }, ['Segure num apoio firme à frente.', 'Desça até o agachamento profundo com os calcanhares no chão.', 'Mantenha e respire.']),
  X('enrolarColuna', 'Enrolar e desenrolar a coluna', 'mobilidade', 'Coluna', 'emPeFlexao', { sets: 1, reps: 6, hold: 0, sides: false }, ['Em pé, leve o queixo ao peito.', 'Desça enrolando a coluna, vértebra por vértebra.', 'Suba desenrolando na mesma ordem.']),
  X('balancoPerna', 'Balanço de perna', 'mobilidade', 'Quadril e coxa', 'emPe', { sets: 2, reps: 12, hold: 0, sides: true }, ['Em pé, segure numa parede.', 'Balance uma perna para a frente e para trás de forma controlada.', 'Aumente a amplitude aos poucos.']),
  X('punho', 'Mobilidade de punho em quatro apoios', 'mobilidade', 'Ombro e tórax', 'quatroApoios', { sets: 2, reps: 10, hold: 0, sides: false }, ['Em quatro apoios, mãos com os dedos para a frente.', 'Leve o peso para a frente e para trás sobre as mãos.', 'Repita com os dedos virados para os joelhos.']),

  // ---------- ativação corretiva ----------
  X('retracao', 'Retração cervical', 'ativacao', 'Cabeça e pescoço', 'sentadoCadeira', { sets: 1, reps: 10, hold: 5, sides: false }, ['Sentado, coluna apoiada e olhar no horizonte.', 'Leve o queixo para trás, como se fizesse um “queixo duplo”, sem inclinar a cabeça.', 'Segure, relaxe e repita.']),
  X('flexoresProfundos', 'Ativação dos flexores profundos do pescoço', 'ativacao', 'Cabeça e pescoço', 'supinoJoelhos', { sets: 1, reps: 10, hold: 10, sides: false }, ['Deitado de barriga para cima, joelhos dobrados, toalha dobrada sob a cabeça.', 'Faça um aceno discreto de “sim”, aproximando o queixo da garganta.', 'Mantenha sem levantar a cabeça e sem tensionar a frente do pescoço.']),
  X('retracaoParede', 'Retração cervical na parede', 'ativacao', 'Cabeça e pescoço', 'paredeAnjo', { sets: 1, reps: 10, hold: 5, sides: false }, ['De costas para a parede, calcanhares a um palmo dela.', 'Leve a nuca em direção à parede com o queixo recolhido.', 'Não eleve o queixo.']),
  X('setScapular', 'Encaixe escapular', 'ativacao', 'Ombro e tórax', 'sentadoCadeira', { sets: 1, reps: 10, hold: 5, sides: false }, ['Sentado, braços relaxados.', 'Leve as escápulas levemente para trás e para baixo.', 'Mantenha o pescoço longo e relaxado.']),
  X('serratil', 'Protração escapular em quatro apoios', 'ativacao', 'Ombro e tórax', 'quatroApoios', { sets: 2, reps: 12, hold: 2, sides: false }, ['Em quatro apoios, cotovelos estendidos.', 'Empurre o chão afastando as escápulas uma da outra.', 'Volte sem deixar o peito afundar.']),
  X('trapezioInferior', 'Ativação do trapézio inferior em W', 'ativacao', 'Ombro e tórax', 'pronoBracos', { sets: 2, reps: 10, hold: 3, sides: false }, ['Deitado de bruços, cotovelos dobrados em W.', 'Eleve os braços levando as escápulas para baixo e para trás.', 'Segure e desça devagar.']),
  X('rotExtOmbro', 'Rotação externa do ombro com elástico', 'ativacao', 'Ombro e tórax', 'emPeRemada', { sets: 2, reps: 12, hold: 0, sides: true }, ['Cotovelo junto ao corpo, dobrado a 90°.', 'Gire o antebraço para fora contra o elástico.', 'Volte devagar.']),
  X('gluteoMedioParede', 'Glúteo médio na parede', 'ativacao', 'Pelve e glúteos', 'emPeLateralParede', { sets: 2, reps: 5, hold: 10, sides: true }, ['De lado para a parede, joelho mais próximo dobrado e encostado nela.', 'Empurre a parede com o joelho, ficando sobre a outra perna.', 'Mantenha a pelve nivelada.']),
  X('peCurto', 'Exercício do pé curto', 'ativacao', 'Tornozelo e pé', 'sentadoCadeira', { sets: 3, reps: 10, hold: 5, sides: true }, ['Sentado, pé apoiado no chão.', 'Aproxime a base do dedão do calcanhar, elevando o arco, sem dobrar os dedos.', 'Progrida para em pé e depois em apoio unipodal.']),
  X('transverso', 'Ativação do transverso do abdome', 'ativacao', 'Abdome e tronco', 'supinoJoelhos', { sets: 1, reps: 10, hold: 10, sides: false }, ['Deitado, joelhos dobrados.', 'Ao expirar, leve suavemente o umbigo em direção à coluna.', 'Mantenha respirando, sem mexer a pelve.']),
  X('respiracao9090', 'Respiração diafragmática 90/90', 'ativacao', 'Abdome e tronco', 'pes90', { sets: 1, reps: 5, hold: 10, sides: false }, ['Deitado com os pés apoiados na parede, quadril e joelhos a 90°.', 'Inspire pelo nariz expandindo as costelas para os lados.', 'Expire longamente pela boca, sentindo o abdome firmar.']),
  X('coice', 'Ativação do glúteo máximo em quatro apoios', 'ativacao', 'Pelve e glúteos', 'quatroApoiosCoice', { sets: 2, reps: 12, hold: 2, sides: true }, ['Em quatro apoios, joelho dobrado a 90°.', 'Eleve a coxa até a altura do tronco empurrando o pé para o teto.', 'Não arqueie a lombar.']),
  X('extensaoTerminal', 'Extensão terminal do joelho com elástico', 'ativacao', 'Joelho', 'emPe', { sets: 2, reps: 15, hold: 2, sides: true }, ['Elástico atrás do joelho, preso à frente.', 'Parta do joelho levemente dobrado e estenda contra o elástico.', 'Controle a volta.']),
  X('equilibrioJoelho', 'Apoio unipodal com joelho destravado', 'ativacao', 'Joelho', 'emPeUnipodal', { sets: 1, reps: 3, hold: 30, sides: true }, ['Em pé sobre uma perna, joelho levemente flexionado, sem travar para trás.', 'Mantenha a pelve nivelada.', 'Progrida fechando os olhos.']),
  X('elevacaoBracoQuatro', 'Elevação alternada do braço em quatro apoios', 'ativacao', 'Abdome e tronco', 'quatroApoios', { sets: 2, reps: 8, hold: 2, sides: true }, ['Em quatro apoios, coluna neutra.', 'Eleve um braço à frente sem girar o tronco.', 'Alterne os lados.']),
  X('adutoresBola', 'Ativação dos adutores com bola', 'ativacao', 'Quadril e coxa', 'supinoJoelhos', { sets: 2, reps: 10, hold: 5, sides: false }, ['Deitado, joelhos dobrados, bola ou almofada entre os joelhos.', 'Aperte a bola por 5 segundos.', 'Relaxe e repita.']),
];
const exDose = e => {
  const d = e.d, side = d.sides ? ' (de cada lado)' : '';
  if (d.hold && d.reps > 1) return `${d.sets > 1 ? d.sets + ' séries × ' : ''}${d.reps} reps × ${d.hold} s${side}`;
  if (d.hold) return `${d.sets > 1 ? d.sets + ' × ' : ''}${d.hold >= 60 ? d.hold / 60 + ' min' : d.hold + ' s'}${side}`;
  return `${d.sets} séries × ${d.reps} reps${side}`;
};
EXERCISES.forEach(e => e.dose = exDose(e));

/* ---------- pictogramas (figura de perfil, olhando para a direita, caixa 100×100) ---------- */
const POSES = {
  emPe: { h: [50, 13], s: [50, 25], e: [51, 41], w: [53, 56], p: [50, 56], k: [50, 74], f: [52, 91] },
  emPeUnipodal: { h: [50, 13], s: [50, 25], e: [58, 38], w: [66, 46], p: [50, 56], k: [50, 74], f: [52, 91], k2: [60, 66], f2: [52, 76] },
  emPePontaPe: { h: [50, 10], s: [50, 22], e: [60, 32], w: [72, 34], p: [50, 53], k: [50, 71], f: [53, 89], wall: 76 },
  emPeBracoAberto: { h: [52, 13], s: [50, 25], e: [62, 25], w: [62, 12], p: [48, 56], k: [48, 74], f: [48, 91], wall: 66 },
  emPeQuadriceps: { h: [50, 13], s: [50, 25], e: [44, 42], w: [40, 58], p: [50, 56], k: [50, 74], f: [52, 91], k2: [50, 74], f2: [38, 58], wall: 64 },
  emPeInclinado: { h: [40, 15], s: [44, 27], e: [38, 14], w: [32, 4], p: [50, 56], k: [50, 74], f: [50, 91], e2: [48, 42], w2: [52, 54] },
  emPeFlexao: { h: [76, 70], s: [70, 58], e: [72, 72], w: [72, 86], p: [48, 52], k: [50, 72], f: [50, 91] },
  emPeRemada: { h: [48, 13], s: [48, 25], e: [36, 38], w: [46, 34], p: [48, 56], k: [48, 74], f: [48, 91], band: [[46, 34], [92, 34]] },
  emPeLateralParede: { h: [50, 13], s: [50, 25], e: [52, 41], w: [54, 56], p: [50, 56], k: [50, 74], f: [50, 91], k2: [62, 66], f2: [54, 80], wall: 66 },
  agachado: { h: [52, 30], s: [50, 42], e: [62, 46], w: [74, 46], p: [34, 64], k: [56, 68], f: [50, 91] },
  avanco: { h: [50, 16], s: [50, 28], e: [50, 44], w: [52, 58], p: [50, 58], k: [68, 70], f: [68, 91], k2: [40, 86], f2: [24, 90] },
  paredeSentado: { h: [34, 30], s: [34, 42], e: [40, 56], w: [44, 64], p: [34, 64], k: [56, 64], f: [56, 91], wall: 28 },
  paredeFrente: { h: [62, 18], s: [60, 30], e: [70, 32], w: [80, 30], p: [54, 56], k: [60, 72], f: [64, 91], k2: [46, 74], f2: [34, 91], wall: 82 },
  paredeAnjo: { h: [36, 13], s: [36, 25], e: [36, 16], w: [36, 4], p: [38, 56], k: [40, 74], f: [44, 91], wall: 31 },
  semiajoelhado: { h: [48, 20], s: [48, 32], e: [50, 46], w: [52, 58], p: [48, 60], k: [66, 62], f: [66, 90], k2: [40, 90], f2: [22, 90] },
  supinoPernaAlta: { h: [12, 84], s: [22, 86], e: [34, 82], w: [50, 68], p: [52, 86], k: [62, 64], f: [70, 40], k2: [70, 86], f2: [88, 86], band: [[50, 68], [70, 40]] },
  supinoJoelhos: { h: [12, 84], s: [22, 86], e: [34, 87], w: [44, 87], p: [52, 86], k: [66, 68], f: [78, 88] },
  deadBug: { h: [12, 84], s: [22, 86], e: [22, 70], w: [22, 56], p: [52, 86], k: [56, 66], f: [72, 66], k2: [68, 82], f2: [86, 82] },
  pes90: { h: [12, 84], s: [22, 86], e: [34, 87], w: [44, 87], p: [52, 86], k: [54, 66], f: [72, 66], wall: 76 },
  ponte: { h: [12, 85], s: [22, 84], e: [32, 88], w: [42, 88], p: [50, 70], k: [66, 62], f: [76, 88] },
  pronoBracos: { h: [86, 80], s: [76, 84], e: [86, 74], w: [96, 66], p: [50, 86], k: [32, 87], f: [14, 87] },
  pronoExtensao: { h: [86, 72], s: [76, 78], e: [68, 82], w: [60, 84], p: [50, 86], k: [32, 87], f: [14, 87] },
  deLado: { h: [12, 80], s: [22, 84], e: [32, 76], w: [32, 66], p: [52, 84], k: [68, 84], f: [86, 84] },
  deLadoJoelhos: { h: [12, 80], s: [22, 84], e: [32, 86], w: [42, 86], p: [50, 84], k: [62, 70], f: [74, 84], k2: [64, 64], f2: [74, 82] },
  deLadoPernaAlta: { h: [12, 80], s: [22, 84], e: [30, 76], w: [34, 68], p: [50, 84], k: [66, 76], f: [84, 70], k2: [62, 86], f2: [72, 86] },
  quatroApoios: { h: [80, 44], s: [70, 50], e: [70, 66], w: [70, 86], p: [38, 50], k: [38, 86], f: [18, 86] },
  quatroApoiosBirdDog: { h: [80, 44], s: [70, 50], e: [82, 44], w: [94, 40], p: [38, 50], k: [24, 52], f: [8, 54], k2: [38, 86], f2: [18, 86], e2: [70, 66], w2: [70, 86] },
  quatroApoiosCoice: { h: [80, 44], s: [70, 50], e: [70, 66], w: [70, 86], p: [38, 50], k: [22, 50], f: [22, 30], k2: [38, 86], f2: [18, 86] },
  crianca: { h: [72, 84], s: [62, 78], e: [76, 82], w: [92, 86], p: [36, 72], k: [50, 88], f: [26, 88] },
  prancha: { h: [86, 58], s: [76, 62], e: [76, 78], w: [88, 80], p: [48, 68], k: [30, 74], f: [12, 80] },
  pranchaLateral: { h: [86, 52], s: [76, 58], e: [76, 76], w: [86, 78], p: [48, 66], k: [30, 72], f: [12, 80] },
  sentadoCadeira: { h: [42, 20], s: [42, 32], e: [48, 48], w: [58, 54], p: [42, 60], k: [62, 60], f: [62, 90], chair: true },
  sentadoChao: { h: [30, 44], s: [30, 56], e: [42, 70], w: [52, 76], p: [30, 82], k: [52, 70], f: [70, 86] },
};
function exPicto(pose, size = 64) {
  const P = POSES[pose] || POSES.emPe, pt = q => q.join(',');
  const limb = (pts, back) => `<polyline points="${pts.map(pt).join(' ')}" fill="none" stroke="${back ? 'var(--muted)' : 'var(--ink)'}" stroke-opacity="${back ? .55 : .85}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  let g = `<line x1="2" y1="92" x2="98" y2="92" stroke="var(--line)" stroke-width="2"/>`;
  if (P.wall) g += `<line x1="${P.wall}" y1="2" x2="${P.wall}" y2="92" stroke="var(--line)" stroke-width="4"/>`;
  if (P.chair) g += `<path d="M30 62 H62 M34 62 V90 M58 62 V90 M30 62 V30" fill="none" stroke="var(--line)" stroke-width="3"/>`;
  if (P.k2) g += limb([P.p, P.k2, P.f2], true);
  if (P.e2) g += limb([P.s, P.e2, P.w2], true);
  g += limb([P.s, P.p]) + limb([P.p, P.k, P.f]) + limb([P.s, P.e, P.w]) + limb([P.s, P.h]);
  g += `<circle cx="${P.h[0]}" cy="${P.h[1]}" r="7" fill="var(--accent)"/>`;
  if (P.band) g += `<line x1="${P.band[0][0]}" y1="${P.band[0][1]}" x2="${P.band[1][0]}" y2="${P.band[1][1]}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${g}</svg>`;
}

/* ---------- animações ---------- */
Object.assign(POSES, {
  paredeAnjoBaixo: { h: [36, 13], s: [36, 25], e: [36, 38], w: [36, 30], p: [38, 56], k: [40, 74], f: [44, 91], wall: 31 },
  pronoBaixo: { h: [86, 82], s: [76, 85], e: [66, 87], w: [56, 87], p: [50, 86], k: [32, 87], f: [14, 87] },
});
// posição inicial → final de cada exercício (as que não têm par ficam estáticas)
const EX_ANIM = {
  ponte: 'supinoJoelhos', ponteUnipodal: 'supinoJoelhos', agachamento: 'emPe', agachamentoProfundo: 'emPe', agachamentoParede: 'paredeAnjoBaixo',
  avanco: 'emPe', cadeiaPosterior: 'emPe', enrolarColuna: 'emPe', inclinacaoLateral: 'emPe', tfl: 'emPe', perdigueiro: 'quatroApoios',
  coice: 'quatroApoios', deadBug: 'supinoJoelhos', abdominalInferior: 'pes90', panturrilhaElevacao: 'emPe', anjoParede: 'paredeAnjoBaixo',
  retracaoParede: 'paredeAnjoBaixo', yt: 'pronoBaixo', trapezioInferior: 'pronoBaixo', extensaoLombar: 'pronoBaixo', abducaoQuadril: 'deLado',
  conchas: 'deLado', livroAberto: 'deLado', posturaCrianca: 'quatroApoios', equilibrioJoelho: 'emPe', quadriceps: 'emPe', isquios: 'supinoJoelhos',
  gatoCamelo: 'crianca', serratil: 'crianca', elevacaoBracoQuatro: 'quatroApoiosBirdDog', remada: 'emPe', rotExtOmbro: 'emPe',
};
function exAnim(ex, size = 160) {
  const B = POSES[ex.pose] || POSES.emPe, A = POSES[EX_ANIM[ex.id]];
  if (!A) return exPicto(ex.pose, size);
  const pick = (P, k, alt) => P[k] || P[alt];
  const vals = (pts) => `${pts(A)};${pts(B)};${pts(B)};${pts(A)};${pts(A)}`;
  const kt = '0;0.35;0.5;0.85;1';
  const lim = (fn, back) => `<polyline points="${fn(A)}" fill="none" stroke="${back ? 'var(--muted)' : 'var(--ink)'}" stroke-opacity="${back ? .55 : .85}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="points" dur="3.2s" repeatCount="indefinite" keyTimes="${kt}" values="${vals(fn)}"/></polyline>`;
  const j = (...ks) => P => ks.map(([k, alt]) => pick(P, k, alt).join(',')).join(' ');
  let g = `<line x1="2" y1="92" x2="98" y2="92" stroke="var(--line)" stroke-width="2"/>`;
  const wall = B.wall || A.wall; if (wall) g += `<line x1="${wall}" y1="2" x2="${wall}" y2="92" stroke="var(--line)" stroke-width="4"/>`;
  if (B.k2 || A.k2) g += lim(j(['p'], ['k2', 'k'], ['f2', 'f']), true);
  if (B.e2 || A.e2) g += lim(j(['s'], ['e2', 'e'], ['w2', 'w']), true);
  g += lim(j(['s'], ['p'])) + lim(j(['p'], ['k'], ['f'])) + lim(j(['s'], ['e'], ['w'])) + lim(j(['s'], ['h']));
  g += `<circle r="7" fill="var(--accent)" cx="${A.h[0]}" cy="${A.h[1]}"><animate attributeName="cx" dur="3.2s" repeatCount="indefinite" keyTimes="${kt}" values="${A.h[0]};${B.h[0]};${B.h[0]};${A.h[0]};${A.h[0]}"/><animate attributeName="cy" dur="3.2s" repeatCount="indefinite" keyTimes="${kt}" values="${A.h[1]};${B.h[1]};${B.h[1]};${A.h[1]};${A.h[1]}"/></circle>`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Animação: ${esc(ex.name)}">${g}</svg>`;
}

/* Demonstração de cada movimento de ADM: o segmento gira em torno da articulação até a amplitude normal */
const ROM_DEMO = {
  ombroFlex: { seg: 'braco', ang: -180 }, ombroExt: { seg: 'braco', ang: 60 }, ombroAbd: { seg: 'braco', ang: 180, frontal: true },
  cotoveloFlex: { seg: 'antebraco', ang: -150 }, quadrilFlex: { seg: 'perna', ang: -120 }, quadrilExt: { seg: 'perna', ang: 30 },
  quadrilAbd: { seg: 'perna', ang: 45, frontal: true }, joelhoFlex: { seg: 'canela', ang: 135 }, tornDorsi: { seg: 'pe', ang: -20 }, tornPlantar: { seg: 'pe', ang: 50 },
  cervFlex: { seg: 'cabeca', ang: 45 }, cervExt: { seg: 'cabeca', ang: -45 }, cervIncl: { seg: 'cabeca', ang: 45, frontal: true }, cervRot: { top: true, ang: 80 },
  troncoFlex: { seg: 'tronco', ang: 80 }, troncoExt: { seg: 'tronco', ang: -25 }, troncoIncl: { seg: 'tronco', ang: 35, frontal: true },
};
function romDemoSVG(id, size = 180) {
  const D = ROM_DEMO[id]; if (!D) return '';
  const L = (pts, c = 'var(--ink)', o = .85) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const head = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="var(--accent)"/>`;
  const rot = (cx, cy) => `<animateTransform attributeName="transform" type="rotate" dur="3.6s" repeatCount="indefinite" keyTimes="0;0.4;0.6;1" values="0 ${cx} ${cy};${D.ang} ${cx} ${cy};${D.ang} ${cx} ${cy};0 ${cx} ${cy}"/>`;
  const arc = (cx, cy, r, a0) => {
    const a1 = a0 + D.ang, rad = a => a * Math.PI / 180, P = a => [cx + r * Math.sin(rad(-a)), cy + r * Math.cos(rad(-a))];
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    return `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${Math.abs(D.ang) > 180 ? 1 : 0} ${D.ang > 0 ? 1 : 0} ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  };
  let g = `<line x1="2" y1="94" x2="98" y2="94" stroke="var(--line)" stroke-width="2"/>`;
  if (D.top) {   // vista superior: ombros e cabeça girando
    g += `<line x1="22" y1="56" x2="78" y2="56" stroke="var(--ink)" stroke-opacity=".85" stroke-width="7" stroke-linecap="round"/>`;
    g += `<g>${rot(50, 50)}<circle cx="50" cy="50" r="13" fill="var(--sunken)" stroke="var(--ink)" stroke-width="3"/><path d="M45 38 L50 30 L55 38 Z" fill="var(--accent)"/></g>`;
    g += `<path d="M50 24 A26 26 0 0 1 ${(50 + 26 * Math.sin(D.ang * Math.PI / 180)).toFixed(1)} ${(50 - 26 * Math.cos(D.ang * Math.PI / 180)).toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
  } else if (D.frontal) {
    const S = [[40, 26], [60, 26]], Hp = [[44, 56], [56, 56]];
    const armR = [S[0], [36, 42], [34, 57]], armL = [S[1], [64, 42], [66, 57]], legR = [Hp[0], [43, 75], [42, 92]], legL = [Hp[1], [57, 75], [58, 92]];
    const trunk = L([S[0], S[1], Hp[1], Hp[0], S[0]]);
    if (D.seg === 'braco') g += trunk + L(legR) + L(legL) + L(armL) + head(50, 13) + `<g>${rot(40, 26)}${L(armR)}</g>` + arc(40, 26, 20, 0);
    if (D.seg === 'perna') g += trunk + L(armR) + L(armL) + L(legL) + head(50, 13) + `<g>${rot(44, 56)}${L(legR)}</g>` + arc(44, 56, 22, 0);
    if (D.seg === 'cabeca') g += trunk + L(armR) + L(armL) + L(legR) + L(legL) + `<g>${rot(50, 24)}${L([[50, 26], [50, 18]])}${head(50, 13)}</g>`;
    if (D.seg === 'tronco') g += L(legR) + L(legL) + `<g>${rot(50, 56)}${trunk}${L(armR)}${L(armL)}${head(50, 13)}</g>` + arc(50, 56, 30, 180);
  } else {
    const s = [50, 25], e = [50, 41], w = [50, 56], p = [50, 56], k = [50, 74], a = [50, 91], t = [60, 91], n = [50, 20];
    const arm = L([s, e, w]), legs = L([p, k, a, t]), trunk = L([s, p]), hd = L([n, s]) + head(50, 13);
    if (D.seg === 'braco') g += trunk + legs + hd + `<g>${rot(...s)}${arm}</g>` + arc(...s, 22, 0);
    if (D.seg === 'antebraco') g += trunk + legs + hd + L([s, e]) + `<g>${rot(...e)}${L([e, w])}</g>` + arc(...e, 12, 0);
    if (D.seg === 'perna') g += trunk + arm + hd + `<g>${rot(...p)}${legs}</g>` + arc(...p, 24, 0);
    if (D.seg === 'canela') g += trunk + arm + hd + L([p, k]) + `<g>${rot(...k)}${L([k, a, t])}</g>` + arc(...k, 14, 0);
    if (D.seg === 'pe') g += trunk + arm + hd + L([p, k, a]) + `<g>${rot(...a)}${L([a, t])}</g>`;
    if (D.seg === 'cabeca') g += trunk + arm + legs + `<g>${rot(...s)}${hd}</g>` + arc(...s, 16, 180);
    if (D.seg === 'tronco') g += legs + `<g>${rot(...p)}${trunk}${arm}${hd}</g>` + arc(...p, 30, 180);
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Demonstração do movimento">${g}</svg>`;
}
