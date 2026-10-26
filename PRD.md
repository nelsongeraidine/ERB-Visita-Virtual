# PRD.md — Simulador 3D de Estação Rádio-Base (ERB)
**Data de Atualização: 26-10-2026_Versão 0.6.1**

## 1. Visão do produto
Desenvolver uma aplicação web 3D que simule uma estação rádio-base de telefonia celular construída, permitindo uma visita virtual em primeira pessoa e modos complementares para inspeção técnica e apresentação guiada. A imagem em `references/` é a referência visual principal.

## 2. Objetivos
- Reproduzir a disposição relativa dos elementos visíveis na referência.
- Oferecer uma experiência visual convincente para apresentações técnicas e executivas.
- Permitir explorar a estação com controles simples, sem atravessar estruturas.
- Explicar os componentes por meio de painéis contextuais.
- Preparar o projeto para versionamento no GitHub e implantação posterior no Vercel.

## 3. Público-alvo
Gestores, equipes de engenharia e operações, clientes e participantes de apresentações sobre infraestrutura de telecomunicações.

## 4. Escopo funcional previsto

### 4.1 Cenário e componentes
- Terreno, brita, caminhos de circulação, bases de concreto e cercamento.
- Portão de entrada funcional.
- Torre metálica treliçada, com altura visual aproximada de 30 m conforme a referência.
- Antenas setoriais, parábolas de micro-ondas e suportes.
- Abrigo de equipamentos e armários externos.
- Unidades de climatização.
- Esteiras de cabos com cobertura, suportes, curvas e encaminhamentos plausíveis.
- Caixa de medição, transformador e grupo gerador.
- Iluminação natural, sombras e materiais apropriados.
- Detalhes de construção proporcionais à distância de observação e ao desempenho disponível.

### 4.2 Modos de experiência
1. **Visita imersiva:** começar do lado externo, abrir o portão e caminhar pela estação em primeira pessoa.
2. **Inspeção técnica:** câmera orbital, zoom, enquadramento geral e seleção de componentes.
3. **Apresentação guiada:** percurso com pontos de observação, pausa, avanço e reinício.

### 4.3 Controles e interação
- Movimentação por WASD e/ou setas; mouse para olhar ao redor.
- Instruções de uso, retorno ao início e opção de tela cheia quando suportada.
- Colisões com cercas, paredes, equipamentos e bases.
- Interação contextual próxima aos equipamentos para mostrar nome, função geral e categoria.
- Opção de qualidade gráfica, caso seja necessária para equilibrar fidelidade e desempenho.

## 5. Fora do escopo inicial
- Projeto executivo de engenharia ou validação estrutural.
- Cálculos de cobertura RF, azimute, tilt, capacidade de enlace ou propagação.
- Certificação de aterramento, proteção contra descargas atmosféricas ou instalações elétricas.
- Inventário real de fabricantes, modelos, potências ou especificações não fornecidos.
- Backend, banco de dados, autenticação ou integração com sistemas externos, salvo aprovação posterior.
- Representação interna detalhada ou fiel dos abrigos sem documentação adicional (o interior atual é genérico e ilustrativo).

## 6. Premissas e limitações
- A imagem de referência é visual; cotas ilegíveis não devem ser tratadas como medidas confirmadas.
- Dimensões não fornecidas serão estimativas de visualização e deverão ser identificadas como tais.
- A representação de componentes não comprova conformidade normativa ou viabilidade de engenharia.
- A aplicação deve funcionar localmente e evitar dependência obrigatória de serviços externos.
- Nenhuma biblioteca, CDN ou pacote novo será adicionado sem aprovação do usuário.

### 6.1 Decisões aprovadas em 26-10-2026
- **Stack:** Vite + TypeScript + Three.js puro (sem React/R3F). Dependências aprovadas: `three`, `@types/three`, `vite`, `typescript`.
- **Escala:** real (1 unidade = 1 m), torre de 30 m.
- **Dimensões do terreno:** estimativa de ~16 x 11 m. Não há cota total legível na referência.
- **Interior do abrigo:** fora da primeira entrega; incluído na v0.4.0 como **representação genérica** (decisão de 26-10-2026): só o volume principal é acessível, o anexo segue maciço, e a porta fica aberta até o visitante fechá-la. O banco de baterias entrou como ilustração, sem tecnologia, tensão, capacidade ou autonomia.
- **Arquivos:** estrutura de `src/` proposta na Fase 1 e `DESIGN.md` aprovados. Em 26-10-2026 o usuário também autorizou o `README.md` e o atalho `Iniciar-ERB-Visita-Virtual.bat`.
- **Repositório:** https://github.com/nelsongeraidine/ERB-Visita-Virtual (indicado pelo usuário). Implantação no Vercel feita pelo usuário: https://erb-visita-virtual.vercel.app/

### 6.2 Dimensões estimadas (não confirmadas)
Todas ficam em [src/config.ts](src/config.ts). Só a altura da torre (30 m) e o espaçamento de postes (~2 m) vêm da referência.

| Item | Valor adotado | Origem |
|---|---|---|
| Altura da torre | 30 m (+ ~2 m de para-raios) | Legível na referência (para-raios: estimativa) |
| Seção da torre | quadrada, 3,0 m na base e 0,9 m no topo | Estimativa |
| Terreno | 16 x 11 m | Estimativa |
| Abrigo | 4,8 x 2,6 m, 2,8 m de parede, mais anexo de 1,3 m | Estimativa |
| Armários | 0,9 / 0,9 / 1,3 m de largura, 1,9 m de altura | Estimativa |
| Portão | vão de 3,2 m, duas folhas | Estimativa |
| Espaçamento de postes | ~2 m (variável junto ao portão) | Cota 2000 legível na planta |
| Parábolas | diâmetros de 1,2 e 1,8 m | Estimativa |
| Azimutes/apontamentos | apenas visuais | Sem dados |

## 7. Plano de execução
- **Fase 1 — Análise e planejamento:** concluída e aprovada em 26-10-2026.
- **Fase 2 — Modelagem base:** primeira versão implementada (terreno, brita, lajes, cercamento com concertina, portão, abrigo, armários, climatização, esteira de cabos, energia, torre com antenas e parábolas, aterramento visual).
- **Fase 3 — Materiais e iluminação:** primeira versão (materiais e texturas procedurais, sol ajustável, sombras, céu, modo noturno). Refinamento visual pendente.
- **Fase 4 — Navegação:** implementada (primeira pessoa, colisões, portão, painéis, câmera orbital).
- **Fase 5 — Apresentação guiada:** implementada (12 pontos de observação, incluindo o interior do abrigo; pausa, avanço, retorno e reinício).
- **Fase 6 — Testes e otimização:** parcial; ver seção 10.
- **Fase 7 — Entrega e publicação:** build local validado; documentação e `README.md` criados; código versionado e enviado ao GitHub; implantado no Vercel e verificado no ar.

## 8. Pendências atuais
- [x] Inspecionar a imagem em `references/` e confirmar o nome exato do arquivo.
- [x] Verificar se já existe código ou estrutura de aplicação na pasta do projeto (não havia).
- [x] Aprovar a arquitetura e as tecnologias propostas antes de adicionar dependências.
- [ ] Validar visualmente com o usuário o layout, a escala e o nível de detalhe da primeira versão.
- [ ] Definir dimensões reais adicionais, caso estejam disponíveis em CAD ou documentação técnica.
- [ ] Definir os requisitos mínimos de desempenho e o computador-alvo para a apresentação.
- [ ] Testar em GPU real, em outras resoluções e com mouse real (ver seção 10).
- [ ] Se houver documentação do interior real do abrigo (layout, equipamentos), substituir a representação genérica.
- [ ] Decidir se o anexo do abrigo também será acessível.
- [x] Inicializar repositório git e publicar no GitHub.
- [x] Implantar no Vercel e confirmar o endereço publicado: https://erb-visita-virtual.vercel.app/
- [ ] Definir a licença do repositório, se houver.

## 9. Critérios de aceitação
- A disposição dos componentes principais é coerente com a imagem de referência.
- O terreno, o portão, o cercamento, a torre, o abrigo e os equipamentos de energia são reconhecíveis.
- A torre possui volume tridimensional e proporção visual coerente com a indicação aproximada de 30 m.
- A navegação funciona e não permite atravessar obstáculos principais.
- Os modos de visita, inspeção e apresentação guiada estão operacionais.
- Os painéis informativos não atribuem especificações técnicas não verificadas.
- A aplicação não apresenta erros críticos conhecidos durante o fluxo principal.
- As instruções para execução local e publicação estão documentadas.

## 10. Testes obrigatórios
- Inicialização local e carregamento da cena.
- Build de produção.
- Controles de câmera e movimentação.
- Colisões e interação com o portão.
- Abertura dos painéis informativos.
- Funcionamento dos três modos.
- Verificação visual em diferentes resoluções.
- Inspeção do console e tratamento de falhas de WebGL, quando possível.

Só marcar um teste como concluído após executá-lo. Registrar testes não executados e suas limitações.

### 10.5 Verificação da publicação (26-10-2026, https://erb-visita-virtual.vercel.app/)
- [x] A página carrega por HTTPS sem erros nem avisos no console; título correto; sem tela de erro de WebGL (WebGL 2 ativo no navegador de teste).
- [x] Só dois arquivos carregados (JS de 189 kB comprimido e CSS de 2 kB), sem pedidos a serviços externos.
- [x] A visita responde: o visitante anda para dentro do terreno com o portão aberto; o percurso guiado continua sem interseções.
- [ ] Não verificado no ar: tela cheia, mouse real (PointLock), outras resoluções, outros navegadores e desempenho em GPU real.

### 10.4 Registro da v0.5.0 (inspeção técnica chega ao interior, mesmo ambiente)
- [x] Typecheck e build de produção; console sem erros nem avisos.
- [x] Seletor de componentes com grupos "Exterior" (15 itens) e "Interior do abrigo (corte)" (6 itens).
- [x] Selecionar um item interno remove cobertura e forro, acende as luzes internas, enquadra a câmera de cima e destaca o item em âmbar, com o painel e a ressalva.
- [x] Clique direto num item interno durante o corte seleciona o item (a caixa do abrigo inteiro não fica na frente).
- [x] Selecionar item exterior, "Vista geral" e sair da inspeção restauram o teto; o botão "Corte do abrigo" liga e desliga.
- [x] Custo de render medido por chamada: ~5 a 7 ms; ~25 quadros/s na vista do corte neste ambiente (não representativo).
- [ ] Observado: em um momento o ambiente de teste caiu para ~0,5 quadros/s por contenção da máquina (OneDrive sincronizando); não reproduzido ao recarregar e não ligado ao código. Medir de novo em GPU real.
- [ ] Não testado: arrastar a câmera orbital com mouse real durante o corte.

### 10.3 Registro da v0.4.0 (interior do abrigo e botão Menu, mesmo ambiente)
- [x] Typecheck e build de produção; console sem erros nem avisos.
- [x] Porta do abrigo: o indicador muda entre "Abrir" e "Fechar"; E abre; a porta chega a 100% de abertura.
- [x] Entrada pelo vão: o visitante caminha para dentro (piso a 0,24 m, olhos a 1,89 m), e as colisões o param diante do quadro elétrico.
- [x] Alvos do interior só aparecem com o visitante dentro (racks, baterias, quadro elétrico, esteira interna, aterramento, climatização); por fora, o raio não os "vê" através das paredes.
- [x] Percurso guiado com 12 passos, incluindo o interior e a saída pela porta: 0 interseções com obstáculos.
- [x] Botão Menu e tecla M voltam à tela inicial a partir da visita e da apresentação guiada.
- [x] Exterior do abrigo sem regressão visual (paredes ocas e porta articulada).
- [ ] Não testado: abrir e fechar a porta com mouse real e PointLock; entrar pelo anexo (maciço, sem acesso); desempenho das duas luzes internas em GPU real.
- [x] Inspeção orbital e interior: limitação resolvida na v0.5.0 com o "corte do abrigo" (ver 10.4).

### 10.2 Registro da v0.3.0 (realismo visual, mesmo ambiente)
- [x] Typecheck e build de produção após as mudanças.
- [x] Console sem erros nem avisos; percurso guiado continua sem interseções.
- [x] Capturas antes/depois de vista geral, portão, abrigo e armários; sem artefatos de AO visíveis na qualidade Alta.
- [x] Quadros/s no passo do abrigo (ambiente de teste, não representativo): baixa 54, média 48, alta com AO 15. O AO sozinho custou de 47 para 17 quadros/s em outra captura.
- [ ] Não verificado em GPU real: o custo do AO e a qualidade Alta precisam ser conferidos no computador de apresentação.
- [x] Modo noturno recapturado após a troca de iluminação: luminária acesa e luar discreto, sem regressão.

### 10.1 Registro de testes (26-10-2026, v0.2.0)
Ambiente: Chromium controlado por Playwright, viewport 1440x850, renderização por ANGLE (não é uma GPU dedicada), servidor `vite` local.

**Executados e aprovados**
- [x] Inicialização local e carregamento da cena: sem erros e sem avisos no console.
- [x] Typecheck (`tsc --noEmit`) e build de produção (`npm run build`).
- [x] Colisões e portão: com o portão fechado o visitante para antes dele (x = -8,45); aberto, atravessa e anda até a torre.
- [x] Abertura dos painéis informativos: tecla E diante do gerador mostra o painel correto, com ressalvas sobre dados não informados.
- [x] Funcionamento dos três modos: visita, inspeção (seleção por lista e por clique, com destaque) e apresentação guiada (avanço automático, pausa, próximo, anterior).
- [x] Validação programática do percurso guiado: 0 interseções com obstáculos ao amostrar o trajeto completo com esfera de raio 0,35 m.
- [x] Ajuda, ocultar interface (botão e tecla H), qualidade baixa/média/alta, controle do sol e modo noturno.
- [x] Inspeção visual por capturas de tela dos pontos principais (portão, abrigo, armários, esteira, base e topo da torre, gerador, transformador).
- [x] Contagem de carga de render: ~212 chamadas de desenho e ~230 mil triângulos na vista do tour; ~70 quadros/s neste ambiente.

**Não executados (limitações)**
- [ ] Bloqueio real do mouse (PointerLock) e olhar com mouse: o ambiente automatizado não fornece mouse real.
- [ ] Tela cheia (F): não acionável no ambiente automatizado.
- [ ] Outras resoluções e layout móvel: só 1440x850 foi capturado.
- [ ] Desempenho em GPU real e em computador-alvo: o valor de quadros/s acima não é representativo.
- [ ] Mensagem de falha de WebGL e perda de contexto: o código existe, mas o caminho de erro não foi provocado.
- [ ] Teste com teclado físico em todas as combinações (apenas E, ?, H e Esc foram exercitados por eventos).
- [ ] Fidelidade da disposição frente à referência foi avaliada visualmente por mim; falta a sua validação.

## 11. Implementações futuras possíveis
- Interior do abrigo com equipamentos detalhados, se houver referência técnica.
- Modo noturno com iluminação externa e sinalizador de obstáculo.
- Alternância entre qualidade gráfica baixa, média e alta.
- Destaque visual de subsistemas (RF, energia, climatização e infraestrutura).
- Exportação de imagens da visita para apresentações.
- Inclusão de dimensões verificadas a partir de arquivos CAD ou levantamento técnico.
- Melhorias de acessibilidade e suporte a diferentes dispositivos, conforme prioridade.

## 12. Histórico de versões
- **0.1.0 — 26-10-2026:** criação inicial do PRD, escopo preliminar, fases, pendências e critérios de aceitação.
- **0.6.1 — 26-10-2026:** endereço publicado no Vercel registrado em README, PRD e CLAUDE, com a verificação no ar (seção 10.5).
- **0.6.0 — 26-10-2026:** publicação: `README.md` criado, documentos atualizados, repositório git inicializado e enviado ao GitHub; `.gitignore` ampliado.
- **0.5.0 — 26-10-2026:** inspeção técnica chega ao interior do abrigo por um "corte" (cobertura e forro ocultos, câmera de cima); seletor de componentes com grupo "Interior do abrigo"; botão "Corte do abrigo". Sem novos arquivos nem dependências.
- **0.4.0 — 26-10-2026:** interior do abrigo visitável e genérico (racks, banco de baterias, quadro elétrico, climatização, esteira interna, aterramento); porta articulada com E; patamar e soleira de acesso; passo novo no percurso guiado (12 passos); botão Menu e tecla M para voltar à tela inicial. Novo arquivo `src/scene/shelterInterior.ts`, sem novas dependências.
- **0.3.0 — 26-10-2026:** melhoria de realismo visual: tom neutro e luz de preenchimento corrigida (fim da dominante azul), solo com vegetação e colinas ao fundo, alambrado translúcido à distância, concreto com juntas e manchas, reboco com escorridos, sombras de contato, flanges e etiquetas, e oclusão ambiental opcional na qualidade Alta. Novo módulo `src/scene/postfx.ts`, sem novas dependências.
- **0.2.0 — 26-10-2026:** Fase 1 aprovada; decisões de stack, escala e dimensões registradas; primeira implementação (fases 2 a 5); registro de testes; criação de `DESIGN.md` e do atalho `Iniciar-ERB-Visita-Virtual.bat`.
