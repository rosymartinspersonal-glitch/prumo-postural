# Benchmark Prumo Postural × APECS

Data: 22/10/2026 · Fonte das funções do APECS: site oficial, App Store e Google Play (veja `recon.md`).

## Resultado

| | Antes | Depois |
| --- | --- | --- |
| Paridade de funções | 52,6% | **100%** (51 funções contadas) |
| Funções essenciais | 16 de 20 | **20 de 20** |
| Funções a mais que o APECS | 4 | 6 |

Fora da conta, de propósito:
- **Interface multilíngue**: não implementada. O app é só em português.
- **Assinaturas pagas**: não se aplica a um app de uso próprio da clínica.
- **35+ artigos de validação**: pertencem ao APECS, não são uma função de software.

**Paridade de funções não é paridade de validação.** O APECS foi comparado com radiografias em estudos publicados; o Prumo ainda não. Para usar as medidas em pesquisa ou laudos, valide o método na sua clínica (por exemplo, repetibilidade entre avaliadores).

## Cobertura por área

| Área | Funções do APECS | Como o Prumo faz |
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

| Fluxo | APECS | Prumo | Decisão |
| --- | --- | --- | --- |
| Salvar resultado | PDF apagado se não for salvo (reclamação na Play Store) | Toda avaliação fica no histórico do paciente | manter |
| Mover ponto manual | Toque longo antes de arrastar (reclamação na App Store) | Arrasta direto, com lupa | manter |
| Reavaliação | Sem comparação | Antes × depois e gráfico de evolução | manter |
| Vídeo | Guardado no app | Só os resultados são guardados (o vídeo pesaria demais no navegador) | manter; reabrir o vídeo para ver quadro a quadro |
| Instalação | Lojas de apps | Link do navegador, instalável na tela inicial | manter |

## Testes feitos

- `node tests/medidas.test.js`: 13 grupos de testes das fórmulas (todas as vistas, espelhamento das laterais, limiares do Adams, POTSI/ATSI, φ, face, goniômetro, classificação, exercícios).
- No navegador, no site publicado: as 11 telas abertas nos 10 tipos de avaliação sem erro; os 10 PDFs gerados; modelos de IA de pose, rosto e vídeo carregados; marcadores verdes achados na posição exata.
- Análise de vídeo com um agachamento sintético com marcadores verdes. O teste achou dois problemas:
  - **Troca de marcadores quando o vídeo pula quadros** (comum em vídeos WebM gravados no navegador): corrigida com previsão de velocidade, raio de busca menor e IA a cada quadro. Com quadros regulares, o joelho mediu 110,7° (valor real: 110,7°).
  - **Erro do modelo de IA na segunda análise seguida**: corrigido com um relógio contínuo entre análises; verificado com duas análises seguidas.
- **Ainda não testado com pessoas reais**: precisão da IA em fotos e vídeos de pacientes. Confira os pontos nas primeiras avaliações.
