# DESIGN.md — ERB Visita Virtual 3D
**Data de Atualização: 26-10-2026_Versão 0.6.1**

## 1. Direção visual
Apresentação técnica sóbria: a cena 3D é a protagonista e a interface é discreta. Painéis escuros e translúcidos sobre a imagem, tipografia do sistema, um único destaque âmbar (cor de sinalização) para foco e ação principal. Estação com aspecto de recém-construída, sem exagero de sujeira ou ferrugem. Sem logotipos de operadoras e sem marcas fictícias.

## 2. Paleta (tokens em `src/ui/styles.css`)
| Token | Valor | Uso |
|---|---|---|
| `--bg` | rgba(13,19,27,0.80) | painéis sobre a cena |
| `--bg-solid` | #0d131b | modais, carregamento |
| `--text` | #e8eef4 | texto principal |
| `--muted` | #9db0c2 | texto secundário |
| `--accent` | #f0b429 | foco, modo ativo, ação principal, ressalvas |
| `--line` | rgba(255,255,255,0.10) | contornos |

## 3. Tipografia
Pilha do sistema (`system-ui`, Segoe UI, Roboto), sem fontes externas para funcionar offline. Título de 1,8 a 2,8 rem, corpo de 0,9 rem nos painéis, rótulos auxiliares de 0,74 a 0,85 rem. Hierarquia por peso e cor, não por tamanho excessivo.

## 4. Materiais e iluminação
- **Materiais distintos:** concreto, brita, solo, aço galvanizado (liso e fosco), metal pintado, alumínio, reboco do abrigo, plástico técnico, borracha, vidro de luminárias, cabos (preto, vermelho, verde), cobre, cerâmica das buchas, pintura do gerador e do transformador.
- **Texturas procedurais** (canvas): concreto, brita (cor e relevo), solo, reboco, tela losangular com alfa e metal escovado. Nenhum arquivo externo.
- **Brita:** textura com relevo e pedras 3D instanciadas em densidade ajustável pela qualidade.
- **Dia (padrão):** céu procedural, sol direcional com sombras, reflexos por ambiente gerado do céu, névoa leve. Sol padrão a sudoeste (46° de altura) para iluminar as faces sul e oeste, como na referência. Direção e altura ajustáveis em Ajustes.
- **Noite (opcional):** luar discreto, luminárias externas do abrigo acesas e sinalizador de obstáculo piscando com luz vermelha.
- **Sombras de contato:** manchas radiais sob os equipamentos para ancorá-los ao piso.
- **Cor:** mapeamento de tons Neutral (Khronos), que preserva a cor dos materiais claros. O preenchimento das sombras vem de um hemisférico neutro-quente; o mapa de céu (muito intenso e azul) entra só com 6% para reflexo nos metais. Sem essa separação, todas as sombras ficavam azuladas.
- **Solo e horizonte:** solo com manchas de capim seco e verde em macro-escala (tile de 70 m) mais relevo fino; cordão de colinas distantes com névoa. Alambrado em mistura por alfa, translúcido à distância.
- **Concreto e reboco:** concreto com manchas suaves e juntas a cada 2 m nas lajes; reboco com escorridos de chuva; vedações de borracha, placas de aviso e etiquetas.
- **Oclusão ambiental (GTAO):** só na qualidade Alta. Em GPU modesta custa cerca de 30 ms por quadro. Alambrado, sombras de contato, colinas e céu ficam fora do passe.

## 5. Organização da interface
- **Tela inicial:** a própria estação gira ao fundo; cartão à esquerda com título, subtítulo, três botões (Iniciar visita, Inspeção técnica, Apresentação guiada), dica de teclas e aviso de simulação visual.
- **Barra superior:** nome do modo atual, seletor de modos (1, 2, 3) e ações: Menu (M, volta à tela inicial), Reiniciar vista (R), Ajustes, Tela cheia (F), Ajuda (?), Ocultar (H). "Reiniciar vista" só reposiciona a câmera dentro do modo atual; "Menu" sai do modo.
- **Ajustes (popover):** qualidade (baixa, média, alta), azimute e altura do sol, modo noturno.
- **Visita:** mira central, indicador "E · nome" diante de equipamentos, aviso para clicar e capturar o mouse.
- **Inspeção:** seletor de componente (grupos "Exterior" e "Interior do abrigo (corte)"), botão Vista geral e botão "Corte do abrigo" no canto inferior esquerdo.
- **Apresentação:** barra inferior com título, texto, progresso e controles.
- **Painel de equipamento:** lateral direito, compacto, para não cobrir a estação.
- **Ocultar interface:** remove tudo e deixa um botão discreto para voltar.

## 6. Controles de navegação
| Ação | Tecla |
|---|---|
| Andar | W A S D ou setas |
| Olhar | mouse (clique na cena para capturar; Esc libera) |
| Correr | Shift |
| Interagir / abrir portão | E |
| Reiniciar a vista do modo atual | R |
| Voltar à tela inicial (menu) | M |
| Tela cheia | F |
| Ocultar interface | H |
| Ajuda | ? |
| Modos | 1 visita, 2 inspeção, 3 apresentação |
| Apresentação | Espaço pausa; setas esquerda e direita voltam e avançam |

Altura dos olhos: 1,65 m. Raio do corpo: 0,30 m. Ângulo vertical limitado a cerca de 77°. Sem salto: Espaço não é usado na visita.

### 6.1 Interior do abrigo
- **Acesso:** E diante da porta (por fora ou por dentro) abre e fecha; a porta abre para fora e fica aberta até o visitante fechá-la. Calçada, patamar, soleira e piso interno formam degraus de 7, 8 e 4 cm.
- **Conteúdo, todo genérico:** 3 racks em linha (um com a porta entreaberta mostrando equipamentos e LEDs), banco de baterias em estante aberta, quadro de distribuição elétrica de parede, face interna da climatização, escada para cabos no teto (do ponto de entrada até o topo dos racks) e barra de aterramento com cabo verde.
- **Luz:** duas luminárias lineares e duas luzes pontuais, ligadas só com a porta aberta; o interior fechado não gasta luz.
- **Ressalva visual e textual:** o rótulo de cada item interno diz "(genérico)" e o painel informa o que não foi informado. Nenhuma marca, modelo, tensão, capacidade ou autonomia.
- **Interatividade:** os itens internos só são alvo com o visitante dentro do abrigo; por fora, o raio de interação não os alcança através das paredes.

## 7. Comportamento dos painéis
- Abre com E diante do equipamento (alcance varia por item) ou por clique/lista na inspeção.
- Mostra categoria, nome, função, descrição e, quando aplicável, uma **ressalva** em destaque âmbar: o que é estimativa ou não foi informado.
- Nunca afirma tensão, potência, modelo, fabricante, azimute ou conformidade sem fonte.
- Fecha com Esc, E novamente no mesmo item ou pelo botão ×.

## 8. Modos de apresentação
1. **Visita imersiva:** começa do lado de fora, diante do portão fechado; E abre; colisões com cerca, paredes, equipamentos, torre e pilaretes; a esteira de cabos (a 3,35 m) é atravessável por baixo.
2. **Inspeção técnica:** câmera orbital com zoom, deslocamento, vista geral e enquadramento animado no componente selecionado; destaque por caixa âmbar. O **corte do abrigo** oculta cobertura e forro e posiciona a câmera de cima, sudeste, para ver racks, baterias, quadro, climatização e esteira interna; é ativado por esses itens no seletor, por clique neles durante o corte ou pelo botão, e desfeito por item exterior, Vista geral ou saída do modo.
3. **Apresentação guiada:** 12 pontos (incluindo o interior do abrigo) com transições suaves por curva, pausa, avanço, retorno e reinício. Pontos intermediários mantêm a câmera longe de estruturas; o percurso é validado por amostragem contra as colisões.

## 9. Acessibilidade e legibilidade
- Botões reais com rótulos de texto; modo ativo indicado por `aria-pressed`; foco visível em âmbar.
- Regiões `aria-live` para o indicador de interação, o painel e os avisos.
- Ajuda como diálogo modal; Esc fecha painéis em ordem.
- Contraste alto de texto claro sobre painéis escuros; texto mínimo de 0,74 rem apenas em rótulos.
- `prefers-reduced-motion` desativa transições da interface.
- Layout adaptado a telas estreitas (painel de equipamento sobe para a base).
- Limitação: a cena 3D em si não tem alternativa textual completa; as informações dos equipamentos estão disponíveis pela lista da inspeção.

## 10. Desempenho
Geometria fundida por material (poucas chamadas de desenho), brita e concertina instanciadas, materiais e geometrias compartilhados, qualidade em três níveis (resolução, sombras, densidade de brita; AO só na Alta) e liberação de recursos no `dispose`.
