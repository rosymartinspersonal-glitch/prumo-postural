/* TEAMRM - Posture & Correction — política de privacidade e termos de uso.
   Modelo de base redigido para o funcionamento real do app; revise com um advogado antes de publicar a cobrança. */
'use strict';

function legalDocs() {
  const L = TEAMRM_CONFIG.legal, sup = TEAMRM_CONFIG.support;
  const contato = [sup.email && `e-mail ${sup.email}`, sup.whatsapp && `WhatsApp ${sup.whatsapp}`].filter(Boolean).join(' ou ') || 'os canais indicados em Ajustes → Suporte';
  const resp = `${L.controller}${L.document ? ', ' + L.document : ''}${L.city ? ', ' + L.city : ''}`;
  return {
    privacy: { title: 'Política de privacidade', updated: '22/10/2026', sections: [
      ['Quem é o responsável', `O TEAMRM - Posture & Correction é oferecido por ${resp} (“nós”). Dúvidas sobre dados pessoais: ${contato}.`],
      ['Dados dos pacientes ficam no seu aparelho', 'Cadastros, fotos, vídeos, pontos anatômicos, medidas, relatórios e registros de treino são guardados apenas no armazenamento do navegador deste aparelho. Eles não são enviados para nossos servidores. A detecção automática por inteligência artificial roda no próprio aparelho: as imagens não saem dele. Quem cadastra os pacientes (o profissional) é o controlador desses dados perante a LGPD e deve ter base legal para tratá-los, como a tutela da saúde e o consentimento do paciente.'],
      ['Contratos enviados por link de assinatura', 'Quando você usa “Enviar link de assinatura pelo WhatsApp”, uma cópia daquela versão do contrato (texto, calendário e diretrizes) fica guardada no servidor do app, ligada à sua conta, para o aluno ler e assinar. Quando o aluno assina, guardamos também o nome e o CPF informados, a imagem da assinatura, a data e a hora, o IP e o navegador usados, como prova da assinatura. Só você (logada) e quem tem o link conseguem ver esse contrato. Os demais contratos continuam apenas no seu aparelho.'],
      ['Dados da sua conta', 'Se você criar uma conta para assinar um plano, guardamos seu e-mail e o status da assinatura (plano, situação e data de renovação). Usamos esses dados só para liberar as funções do seu plano, enviar e-mails da conta (confirmação, acesso, redefinição de senha) e cumprir obrigações legais e fiscais.'],
      ['Pagamentos', 'Os pagamentos são processados pelo Stripe. Não recebemos nem guardamos o número do seu cartão. O Stripe trata seus dados de pagamento conforme a política de privacidade dele.'],
      ['Empresas que nos ajudam (operadores)', 'Supabase (contas e banco de assinaturas), Stripe (pagamentos), GitHub Pages (hospedagem do app), Google Fonts, jsDelivr e cdnjs (fontes e bibliotecas) e Google Cloud Storage (download dos modelos de IA). Ao abrir o app, esses serviços podem receber dados técnicos como endereço IP e tipo de navegador, como em qualquer site.'],
      ['Cookies e armazenamento', 'Não usamos cookies de publicidade nem ferramentas de rastreamento. O armazenamento local guarda seus dados clínicos, suas preferências (tema, unidades) e, se você entrar, a sessão da conta.'],
      ['Seus direitos (LGPD, art. 18)', 'Você pode pedir confirmação e acesso aos dados da conta, correção, anonimização, portabilidade, eliminação e informações sobre compartilhamento, e pode revogar consentimentos. A exclusão da conta pode ser feita em Planos → Excluir minha conta, ou pelo contato acima. Os dados dos pacientes podem ser exportados (backup) ou apagados a qualquer momento no próprio app.'],
      ['Por quanto tempo guardamos', 'Os dados da conta ficam guardados enquanto ela existir. Registros de pagamento são mantidos pelo prazo exigido pela legislação fiscal. Os dados guardados no seu aparelho ficam lá até você apagá-los.'],
      ['Segurança', 'Usamos conexão criptografada (HTTPS) e regras de acesso no banco: cada usuário só consegue ler a própria assinatura. Proteja o aparelho com senha, porque os dados clínicos ficam nele, e faça backups em local seguro.'],
      ['Menores de idade', 'A conta e a assinatura são para profissionais maiores de 18 anos. Avaliações de crianças e adolescentes devem ter o consentimento do responsável legal.'],
      ['Mudanças nesta política', 'Avisaremos no app quando houver mudanças relevantes. A data da última atualização fica no topo desta página.'],
    ] },
    terms: { title: 'Termos de uso', updated: '22/10/2026', sections: [
      ['O que é o app', `O TEAMRM - Posture & Correction é uma ferramenta de apoio à avaliação postural, de amplitude de movimento e de exercícios, oferecida por ${resp}.`],
      ['Não é diagnóstico', 'As medidas vêm de fotogrametria 2D e de detecção automática por imagem, e dependem da qualidade das fotos, dos vídeos e da marcação dos pontos. Os resultados devem ser interpretados por profissional de saúde habilitado e não substituem exame clínico, de imagem ou diagnóstico médico. Os exercícios são orientações gerais: o profissional decide se, como e em que dose prescrevê-los.'],
      ['Responsabilidade do profissional', 'Você é responsável pelos dados de pacientes que cadastrar, pelo consentimento deles para fotos e vídeos, pelo sigilo profissional e por fazer backups. Como os dados ficam no seu aparelho, não conseguimos recuperá-los se o aparelho for perdido, formatado ou se o navegador apagar os dados.'],
      ['Conta', 'Para assinar um plano é preciso criar uma conta com e-mail válido. Mantenha sua senha em segredo. Podemos suspender contas usadas para fraude ou para violar a lei.'],
      ['Planos e cobrança', 'Os planos pagos (Pro e Pro Plus) são assinaturas com renovação automática no período escolhido (1, 6 ou 12 meses), cobradas pelo Stripe no cartão informado. O preço aparece antes da confirmação. Quando houver período de teste grátis, a primeira cobrança acontece no fim do teste, a menos que você cancele antes.'],
      ['Cancelamento e arrependimento', 'Você pode cancelar a qualquer momento, em um clique, em Planos → Gerenciar ou cancelar assinatura. O acesso continua até o fim do período já pago. Pelo direito de arrependimento (Código de Defesa do Consumidor, art. 49), você pode desistir em até 7 dias após a contratação e receber de volta o valor pago, pelo contato de suporte.'],
      ['Mudanças de preço e de funções', 'Podemos mudar preços e funções dos planos. Mudanças de preço valem a partir da renovação seguinte e serão avisadas com antecedência.'],
      ['Propriedade intelectual', 'O app, sua marca, textos, ilustrações e código pertencem aos seus titulares. Você mantém a propriedade dos dados e das imagens que cadastrar.'],
      ['Limitação de responsabilidade', 'O app é oferecido como está. Não respondemos por decisões clínicas tomadas só com base nos resultados, nem por perda de dados guardados no aparelho, salvo nos casos em que a lei não permite essa limitação.'],
      ['Lei e foro', 'Estes termos seguem as leis brasileiras. Fica eleito o foro do domicílio do consumidor.'],
    ] },
  };
}
SCREENS.legal = async ({ doc = 'privacy' }) => {
  const D = legalDocs()[doc];
  // cobrança em espera: omite as seções sobre pagamento
  const PAY = ['Pagamentos', 'Planos e cobrança', 'Cancelamento e arrependimento', 'Mudanças de preço e de funções'];
  if (!TEAMRM_CONFIG.showPlans) D.sections = D.sections.filter(([h]) => !PAY.includes(h));
  app.innerHTML = `${back('Ajustes')}<article class="panel legal"><span class="eyebrow">Atualizado em ${D.updated}</span><h1>${esc(D.title)}</h1>
    ${D.sections.map(([h, t]) => `<h2>${esc(h)}</h2><p>${esc(t)}</p>`).join('')}</article>`;
  bindBack('settings');
};
