# Benchmark TEAMRM - Posture & Correction × APECS

Data: 23/10/2026 (anterior: 22/10/2026) · Fonte das funções do APECS: site oficial, App Store e Google Play (veja `recon.md`).
Cálculo: `parity.py replica/features.csv` (essenciais valem 3, importantes 2, opcionais 1).

## Resultado

| | 22/10 | 23/10 |
| --- | --- | --- |
| Paridade de funções | 99,3% (64 contadas) | **100%** (63 contadas) |
| Funções essenciais | 20 de 20 | **20 de 20** |
| Funções a mais que o APECS | 8 | **16** |

A diferença de 22/10 para 23/10: "Assinaturas e planos pagos" saiu da conta. A cobrança está em espera por decisão (uso particular na clínica); o código do Supabase e do Stripe continua pronto no repositório.

Fora da conta, de propósito:
- **Interface multilíngue**: não implementada. O app é só em português.
- **Assinaturas pagas**: cobrança em espera (ver acima).
- **35+ artigos de validação**: pertencem ao APECS, não são uma função de software.

**Paridade de funções não é paridade de validação.** O APECS foi comparado com radiografias em estudos publicados; o TEAMRM ainda não. Para usar as medidas em pesquisa ou laudos, valide o método na sua clínica (por exemplo, repetibilidade entre avaliadores).

## Funções a mais que o APECS (16)

| Função | Desde |
| --- | --- |
| Cadastro de pacientes com histórico, antes × depois, backup, modo offline | 22/10 |
| Classificação postural de Kendall e exercícios sugeridos pelos achados | 22/10 |
| Análise de vídeo por movimento com repetições, tema claro e escuro | 22/10 |
| Avaliação de bioimpedância e senha do app | 22–23/10 |
| **Testes de encurtamento** (18 vistas: flexão anterior, sentar e alcançar, Ely, elevação da perna estendida, Trendelenburg, unipodal com flexão do quadril, braços à frente) | 23/10 |
| **Flexão anterior em 4 vistas** (anterior, posterior/Adams, laterais D e E); o APECS tem uma lateral | 23/10 |
| **Personagens animados** em cada posição e em cada movimento de ADM (top e short pretos, sem foto de pessoa) | 23/10 |
| **Alunos online**: planos, revisões de treino, pagamentos, lembretes com WhatsApp, planilha CSV | 23/10 |

## Cobertura por área

| Área | Funções do APECS | Como o TEAMRM faz |
| --- | --- | --- |
| Postural | 4 vistas, alinhamento, ombros, pelve, joelhos, pés, tórax, avaliação rápida | 4 vistas com 24 medidas; pés e tórax opcionais; modo rápido com 2 vistas |
| **Flexão anterior de tronco** | Teste de Adams e flexibilidade | ATR torácica, toracolombar e lombar com alerta de encaminhamento ≥ 7°; ângulo tronco–coxa, dedo–chão em cm, controle dos joelhos e curvatura dorsal |
| Cabeça e pescoço | CVA, índice de anteriorização, flexão lateral e rotação | Perfil (CVA, inclinação, rotação craniana, ângulo do ombro, índice) + frontal; flexão, extensão, inclinação e rotação no goniômetro |
| Tronco | ATSI, POTSI, simetria de ombros, cintura e quadril | Os dois índices com seus 6 componentes, simetria do quadril e inclinação lateral |
| Proporção | Proporção áurea com sobreposição | 3 razões vs. φ, cânone de cabeças, régua áurea desenhada na foto |
| Face | Simetria facial | Detecção por malha facial; inclinações, desvio do mento e do nariz, índice de assimetria, terços da face |
| Joelhos | Valgo/varo | Eixo femorotibial D/E, distâncias intercondilar e intermaleolar |
| ADM | Goniômetro, protocolos e ângulos livres | 17 movimentos com referência AAOS, 3 tipos de ângulo livre, protocolos próprios, comentário por movimento |
| Vídeo | Análise lateral, gráficos, vídeo + PDF, marcadores verdes | 7 ângulos, gráfico por ângulo ligado ao quadro, tabela min/máx/amplitude, quadros-chave, vídeo anotado e PDF |
| Marcação | IA, semimanual, manual, marcadores verdes, fundo, régua, máscara | Todos; lupa e zoom ao arrastar |
| Relatório | PDF explicado e personalizado, JPEG, IMC | Todos; interpretação por medida e exercícios opcionais no PDF |
| Conteúdo e interface | Dicas, exercícios, 4 temas, FAQ | Todos |

## Diferenças de comportamento

| Fluxo | APECS | TEAMRM | Decisão |
| --- | --- | --- | --- |
| Salvar resultado | PDF apagado se não for salvo (reclamação na Play Store) | Toda avaliação fica no histórico do paciente | manter |
| Mover ponto manual | Toque longo antes de arrastar (reclamação na App Store) | Arrasta direto, com lupa | manter |
| Reavaliação | Sem comparação | Antes × depois e gráfico de evolução | manter |
| Vídeo | Guardado no app | Só os resultados são guardados (o vídeo pesaria demais no navegador) | manter; reabrir o vídeo para ver quadro a quadro |
| Instalação | Lojas de apps | Link do navegador, instalável na tela inicial | manter |

## Testes feitos (23/10)

- `node tests/medidas.test.js`: fórmulas de todas as vistas, espelhamento das laterais, limiares do Adams, POTSI/ATSI, φ, face, goniômetro, classificação e exercícios.
- `node tests/encurt.test.js`: as 18 vistas dos encurtamentos têm personagem, pontos-modelo, medidas numéricas com explicação e detecção automática; Trendelenburg positivo detectado quando a pelve cai do lado sem apoio.
- `node tests/alunos.test.js`: datas no fuso de Brasília, lembretes, mensagens, renovação, planilha (ida e volta e a do controle antigo).
- `node tests/foto.test.js`: editor de fotos.
- `node tests/globais.test.js`: nenhum nome global repetido entre os 22 arquivos (um conflito desses derrubou os encurtamentos na versão 3.10.0; corrigido na 3.10.2).
- No navegador, no site publicado: Alunos online (todas as abas, cadastro com listas novas), avaliação de encurtamento com as 18 vistas e postura completa com as 8 vistas, no tamanho de celular.
- **Ainda não testado com pessoas reais**: precisão da IA nas fotos dos testes de encurtamento e as faixas de normal escolhidas (ex.: elevação da perna ≥ 80°, joelho de bruços ≥ 120°). Confira os pontos nas primeiras avaliações.

## Próximos passos sugeridos

1. Validar as faixas dos testes de encurtamento com a sua prática (ou trocar pelos valores que você usa).
2. Tirar as primeiras fotos reais dos testes e conferir se a IA marca bem os pontos deitado e sentado.
3. Relatório PDF próprio para os testes de encurtamento, lado direito × esquerdo lado a lado.
4. Comparar D × E automaticamente (assimetria de flexibilidade em %).
5. Interface em outro idioma, só se for atender pacientes que não falam português.
