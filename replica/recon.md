# Mapa de recon — APECS (Saneftec)

Recorte: **análise postural completa**, web app (PWA), uso na própria clínica.
Fontes apenas públicas (site, App Store, Google Play). Nada de código, assets ou textos do original é reutilizado.

## 1. Fontes

| fonte | URL | o que deu |
| --- | --- | --- |
| Site oficial | https://saneftec.com/en/apecs/ | módulos, planos, público, plataformas |
| App Store | https://apps.apple.com/app/id1488264106 | lista completa de testes, modos de marcação, histórico de versões, preços |
| Google Play | https://play.google.com/store/apps/details?id=corpusnovus.silverblood.apecs | descrição profissional, avaliações (3,4★), reclamações |
| Página de pesquisa | https://saneftec.com/en/apecs/research/ | validação científica (não clonável) |

## 2. Loop principal

**Capturar → marcar pontos → medir → interpretar → exportar relatório.**
Tudo fica no aparelho (sem nuvem) — é um argumento de venda do original.

## 3. Inventário de telas

| ID | tela | como chega | propósito | componentes | estados |
| --- | --- | --- | --- | --- | --- |
| S01 | Início / menu | abrir app | escolher tipo de avaliação | cards de módulo, barra de navegação | free / pro (bloqueados) |
| S02 | Pacientes | menu | lista e cadastro | lista, busca, formulário | vazio, cheio |
| S03 | Ficha do paciente | S02 | dados + histórico de avaliações | cabeçalho, linha do tempo | sem avaliações |
| S04 | Escolha da vista | nova avaliação | frente / costas / lateral D / lateral E | grade de 4 slots, guia de posicionamento | slot vazio / com foto |
| S05 | Captura / importação | S04 | câmera ou galeria | câmera, grade de alinhamento, recorte com rotação | permissão negada, foto escura |
| S06 | Marcação de pontos | S05 | colocar landmarks | canvas, zoom/lupa, lista de pontos, modo auto/semi/manual | detectando, falhou, ajustado |
| S07 | Calibração (régua) | S06 | px → cm | 2 pontos + distância conhecida | sem calibração |
| S08 | Resultados | após marcação | ângulos, desvios, sinalização vs. normas | tabela, overlays de linhas, cores de alerta | dentro/fora da norma |
| S09 | Editar relatório | S08 | notas, logo, dados clínicos, IMC | formulário | — |
| S10 | Relatório PDF | S09 | exportar/compartilhar | pré-visualização, exportar | gerando |
| S11 | Amplitude de movimento (ADM) | menu | goniômetro em foto: 3 pontos → ângulo | canvas, protocolo customizado | — |
| S12 | Cabeça-pescoço | menu (Pro) | ângulo craniovertebral, inclinação | canvas | — |
| S13 | Simetria de tronco | menu (Pro) | ATSI / POTSI | canvas | — |
| S14 | Proporção áurea | menu (Pro) | razões corporais vs. 1,618 | overlays | — |
| S15 | Vídeo dinâmico | menu (Pro Plus) | rastreio quadro a quadro, gráficos temporais | player, gráfico | processando |
| S16 | Configurações | menu | clínica, logo, unidades, tema, idioma | formulário | — |
| S17 | Planos / upgrade | bloqueios | assinatura | tabela comparativa | — |
| S18 | Exercícios e dicas | menu | conteúdo educativo | lista | — |

## 4. Fluxos

```
F01 Avaliação postural completa (núcleo)
    S02 → S03 → S04 → S05 (x4 vistas) → S06 (x4) → S08 → S09 → S10
    bordas: só algumas vistas fotografadas; detecção automática falha; foto inclinada;
            paciente sem calibração (só ângulos, sem cm)
    cliques no caminho feliz (original, estimado): ~25

F02 Medir ADM com goniômetro
    S11 → foto → 3 pontos → ângulo salvo no protocolo

F03 Reavaliação e comparação
    S03 → avaliação antiga vs. nova (o original NÃO tem — gap)

F04 Exportar/backup
    S10 → PDF; dados ficam só no aparelho (o original apaga PDFs não salvos — reclamação real)
```

## 5. Componentes

Botão (primário/secundário/perigo), card de módulo, slot de foto (vazio/cheio), canvas de marcação
(ponto ativo/inativo/arrastando, lupa), linha de referência (vertical de prumo, horizontal),
rótulo de ângulo, tabela de resultados com selo de status (normal/atenção/alterado),
formulário de paciente, toast, modal de confirmação, barra de navegação inferior.

## 6. Modelo de dados inferido

```
Clinica      nome, profissional, registro (CREF), logo, unidades   — evidência: "add logos" no PDF — alta
Paciente     id, nome, nascimento, sexo, altura_cm, peso_kg, queixa, notas — evidência: IMC no Edit-PDF — alta
Avaliacao    id, paciente_id, data, vistas{frente,costas,lat_d,lat_e}, conclusao, notas — alta
Vista        tipo, foto(blob), landmarks{nome:{x,y}}, escala_px_cm?, mascara_rosto — alta
Medida       vista, chave, valor, unidade, faixa_normal, status — derivada — alta
ProtocoloADM nome, lista de ângulos (3 pontos cada) — evidência: "create your list of surveys" — média
```

## 7. Medidas por vista (núcleo clonável)

- **Frente**: alinhamento da cabeça (inclinação), nivelamento de ombros (acrômios), nivelamento das EIAS,
  ângulo Q / valgo-varo de joelho D e E, alinhamento corporal vs. linha média.
- **Costas**: nivelamento de ombros, ângulos inferiores das escápulas, pelve (EIPS), alinhamento do
  calcanhar (valgo/varo) D e E, desvio da coluna (C7 → sacro).
- **Laterais**: ângulo craniovertebral (anteriorização da cabeça), alinhamento tragus–acrômio–trocânter–
  maléolo vs. prumo, inclinação pélvica (EIAS–EIPS), ângulo do joelho (hiperextensão/flexo).

## 8. O que não dá para clonar

| item | motivo |
| --- | --- |
| 35+ citações científicas / validação | pertence ao original; seu app precisa de validação própria se for usado em pesquisa |
| Marca, nome, ícones, textos do relatório | propriedade da Saneftec |
| Algoritmo proprietário de detecção | usamos MediaPipe Pose (código aberto) no lugar |
| Diagnóstico | nem o original diagnostica; o seu também deve trazer aviso |

## 9. Tamanho

18 telas, 4 fluxos, 6 entidades. Partes difíceis: detecção automática de pontos (IA no navegador),
relatório PDF bem formatado, vídeo dinâmico. **Tamanho: M** para o recorte completo sem vídeo;
vídeo dinâmico fica para a fase 2.

## 10. Gaps do original que viram vantagem sua

- Comparação antes/depois (reavaliação) — não existe no original.
- PDFs não salvos são apagados (reclamação na Play Store) — no seu, toda avaliação fica salva no histórico.
- Pontos manuais difíceis de mover (reclamação na App Store) — arrastar direto + lupa.
- Cor de linhas ruim em certos fundos (sugestão de usuário) — cor configurável.
- Interface em português do Brasil desde a origem.
