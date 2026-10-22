# TEAMRM - Posture & Correction

Avaliação postural por fotogrametria, direto no navegador do celular, tablet ou computador.
Fotografe o paciente, marque os pontos anatômicos (com IA, com marcadores verdes ou à mão) e receba
ângulos, índices e desvios com interpretação, exercícios sugeridos e relatório em PDF com a
identidade da sua clínica.

**App:** https://rosymartinspersonal-glitch.github.io/prumo-postural/

**Os dados nunca saem do aparelho.** Pacientes, fotos e avaliações ficam no armazenamento local do
navegador (IndexedDB). Não há servidor nem conta.

## Tipos de avaliação

| Avaliação | O que mede |
| --- | --- |
| Postural completa | 4 vistas em pé (cabeça, ombros, escápulas, pelve, joelhos, retropé, rotação dos pés, tórax, CVA, alinhamento) + flexão anterior de tronco (teste de Adams e flexibilidade); classificação postural de Kendall |
| Avaliação rápida | Vista anterior + lateral direita |
| **Flexão anterior de tronco** | Teste de Adams: rotação do tronco (ATR) torácica, toracolombar e lombar, com alerta de encaminhamento a partir de 7°. Flexibilidade: ângulo tronco–coxa, distância dedo–chão em cm, joelhos e curvatura dorsal |
| Cabeça e pescoço | CVA, inclinação e rotação craniana, ângulo do ombro, índice de anteriorização; frontal com inclinação, desvio e simetria dos ombros |
| Simetria de tronco | ATSI e POTSI com componentes (C7/incisura, axilas, cintura, ombros) e simetria do quadril |
| Joelhos: valgo e varo | Eixo femorotibial D/E, distâncias intercondilar e intermaleolar |
| Proporção áurea | Razões corporais vs. φ = 1,618, cânone de cabeças, régua áurea na foto |
| Simetria facial | Detecção por malha facial; inclinações, desvio do mento e do nariz, índice de assimetria, terços da face |
| Amplitude de movimento | Goniômetro em foto: 17 movimentos com referência AAOS, ângulos livres e protocolos próprios |
| Análise dinâmica em vídeo | 7 ângulos quadro a quadro (IA ou marcadores verdes), gráficos temporais, quadros-chave, vídeo anotado e PDF |

## Recursos

- **Marcação**: IA (MediaPipe Pose e Face, código aberto), posição-modelo para ajuste, manual ponto a ponto, marcadores verdes, lupa e zoom, régua de calibração para medidas em cm.
- **Foto**: câmera ou galeria, rotação e recorte, remoção de fundo, máscara no rosto.
- **Resultados**: situação de cada medida (normal, atenção, alterado), interpretação em texto e principais achados. Inclui exercícios sugeridos e imagens anotadas em JPEG.
- **Relatório PDF**: logo, banner com cor e frase, dados do profissional e do paciente, IMC, fotos anotadas, interpretação, exercícios, conclusão e assinatura.
- **Evolução**: comparação antes × depois e gráfico de cada medida ao longo do tempo.
- **Conteúdo**: biblioteca de exercícios, dica do dia, ajuda com protocolo de fotografia.
- **Interface**: 4 temas de cor, modo claro e escuro, instalável e funciona offline.
- **Backup**: exportar e restaurar tudo em JSON.

## Como usar

1. Cadastre o paciente.
2. Toque em **Nova avaliação** e escolha o tipo.
3. Fotografe cada vista seguindo a orientação da tela (câmera parada, sem zoom).
4. Toque em **Detectar com IA** e confira cada ponto com o zoom.
5. Veja os **Resultados**, escreva a conclusão e exporte o PDF.

## Estrutura do código

```
index.html        página, estilos e ordem dos scripts
js/core.js        utilidades, armazenamento local, geometria
js/views.js       vistas, pontos anatômicos, medidas, tipos de avaliação, interpretação
js/detect.js      IA (pose, rosto, segmentação) e marcadores verdes
js/draw.js        linhas e ângulos sobre a foto, dados de exemplo
js/content.js     exercícios, dicas e ajuda
js/screens.js     telas
js/video.js       análise dinâmica em vídeo
js/pdf.js         relatório PDF
js/main.js        inicialização
sw.js             modo offline
tests/            testes das fórmulas (node tests/medidas.test.js)
replica/          engenharia reversa e benchmark contra o APECS
```

Para rodar localmente: `python3 -m http.server 8000` e abra `http://localhost:8000`.

## Benchmark

`replica/parity.md`: 100% das 51 funções do APECS contadas (antes: 52,6%), mais 6 funções que o
APECS não tem. Fica de fora a interface em outros idiomas.

## Aviso

Ferramenta de apoio à avaliação. Medidas de fotogrametria 2D dependem da qualidade da foto e da
marcação, e o método ainda não foi validado contra radiografia. Os resultados devem ser
interpretados por profissional habilitado e não constituem diagnóstico.

## Origem

Funcionalidades inspiradas na análise pública do APECS (Saneftec). Código, textos, nome e
identidade visual são originais.
