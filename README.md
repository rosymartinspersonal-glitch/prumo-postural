# Prumo Postural

Avaliação postural por fotogrametria, direto no navegador do celular, tablet ou computador.
Fotografe as quatro vistas do paciente, marque os pontos anatômicos (com ajuda de IA ou à mão)
e receba ângulos, desvios sinalizados e um relatório em PDF com a identidade da sua clínica.

**Os dados nunca saem do aparelho.** Pacientes, fotos e avaliações ficam no armazenamento local
do navegador (IndexedDB). Não há servidor nem conta.

## O que o app faz

| Área | Recursos |
| --- | --- |
| Pacientes | cadastro com idade, altura, peso, IMC e queixa principal; histórico de avaliações |
| Captura | câmera ou galeria, 4 vistas (anterior, posterior, lateral D e E), ajuste de rotação |
| Marcação | detecção automática (MediaPipe Pose), posição‑modelo, arrastar com lupa, zoom, régua de calibração, ocultar rosto |
| Medidas | ver tabela abaixo, com faixa de referência e situação (normal / atenção / alterado) |
| Relatório | PDF com logo, dados do profissional e registro, fotos anotadas, achados e conclusão |
| Evolução | comparação antes × depois entre avaliações, com indicação de melhora ou piora |
| Backup | exportar e restaurar tudo em um arquivo JSON |
| Offline | instalável como app (PWA); depois da primeira abertura funciona sem internet |

### Medidas por vista

- **Anterior**: inclinação da cabeça, nivelamento dos ombros, nivelamento pélvico (EIAS),
  ângulo Q aproximado D/E (valgo/varo), alinhamento corporal frontal. Com régua: diferenças em cm.
- **Posterior**: ombros, escápulas, pelve (EIPS), desvio do tronco C7–sacro, retropé D/E.
- **Laterais**: ângulo craniovertebral, inclinação pélvica (EIAS–EIPS), alinhamento do tronco,
  ângulo do joelho (flexo/recurvato), alinhamento corporal acrômio–maléolo.

As faixas de referência são valores usuais da literatura de fotogrametria clínica e servem de
triagem. Ajuste a interpretação ao seu protocolo.

## Como usar

1. Abra o app e cadastre o paciente.
2. Em **Nova avaliação**, fotografe cada vista com o paciente em pé, câmera parada na altura do
   umbigo, a cerca de 3 m, corpo inteiro no quadro.
3. Toque em **Detectar com IA** e confira cada ponto com o zoom. Pontos ósseos (EIAS, EIPS, C7)
   quase sempre precisam de ajuste: o modelo estima centros articulares.
4. Veja os **Resultados**, escreva a conclusão e exporte o PDF.

Para medidas em centímetros, deixe uma régua ou fio de prumo marcado no mesmo plano do paciente
e ative **Calibrar com régua** na marcação.

## Hospedagem (GitHub Pages)

O app é estático: `index.html`, `app.js`, `sw.js`, `manifest.webmanifest` e ícones.
Em *Settings → Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
O endereço fica `https://<usuário>.github.io/prumo-postural/`.

Para rodar localmente: `python3 -m http.server 8000` e abra `http://localhost:8000`.

## Testes

```
node tests/medidas.test.js
```

Confere as fórmulas de ângulo com casos conhecidos (assimetrias, espelhamento das laterais,
valgo/varo, calibração).

## Privacidade e LGPD

Fotos e dados de saúde ficam somente no navegador onde foram criados. O repositório contém
apenas o código. Faça backups regulares em **Configurações** e guarde‑os em local seguro.

## Aviso

Ferramenta de apoio à avaliação. Medidas de fotogrametria 2D dependem da qualidade da foto e da
marcação. Os resultados devem ser interpretados por profissional habilitado e não constituem
diagnóstico.

## Origem

Funcionalidades inspiradas na análise pública do APECS (Saneftec). Código, textos, nome e
identidade visual são originais. O mapa de engenharia reversa está em `replica/`.
