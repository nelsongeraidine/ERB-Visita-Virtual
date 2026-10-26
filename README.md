# Estação Rádio-Base: Visita Virtual 3D

Simulação interativa de infraestrutura de telecomunicações: uma visita virtual em primeira pessoa a uma estação rádio-base (ERB) de telefonia celular, com modo de inspeção técnica e apresentação guiada. Feita em Three.js e TypeScript, 100% procedural e offline (sem modelos 3D, texturas nem CDNs externos).

> **Aviso:** é uma simulação visual a partir de uma imagem de referência. Posições e dimensões são **estimativas**, exceto a altura indicada de 30 m da torre. Não é projeto executivo de engenharia: não afirma cargas, tensões, potências, azimutes, capacidades nem conformidade normativa.

**Demonstração publicada:** https://erb-visita-virtual.vercel.app/

**Versão:** 0.6.1

## O que tem

- **Cenário:** terreno cercado com concertina e portão, brita em 3D, lajes de concreto, abrigo de equipamentos, três armários externos com climatização, esteira de cabos coberta, medição de energia, transformador, grupo gerador e torre treliçada de 30 m com escada, plataformas, antenas setoriais, parábolas de micro-ondas, sinalizador e para-raios.
- **Interior do abrigo (genérico):** racks de telecomunicações, banco de baterias, quadro de distribuição elétrica, climatização, esteira de cabos no teto e aterramento. Representação ilustrativa, sem fabricante, modelo, tensão, capacidade ou autonomia.
- **Três modos:**
  1. **Visita imersiva:** primeira pessoa com colisões; abre o portão e a porta do abrigo com **E**.
  2. **Inspeção técnica:** câmera orbital, seleção de componentes e **corte do abrigo** para ver o interior de cima.
  3. **Apresentação guiada:** 12 pontos de observação, com pausa, avanço, retorno e reinício.
- **Interface:** painéis informativos por equipamento (com ressalva do que é estimativa), ajuda, tela cheia, ocultar interface, qualidade baixa/média/alta, sol ajustável e modo noturno.

## Como rodar

Requisitos: Node.js atual e um navegador com WebGL 2.

```bash
npm install
npm run dev        # http://127.0.0.1:5173/
```

No Windows, o atalho `Iniciar-ERB-Visita-Virtual.bat` instala as dependências na primeira vez, sobe o servidor e abre o navegador.

Outros comandos:

| Comando | Função |
|---|---|
| `npm run typecheck` | verificação de tipos |
| `npm run build` | typecheck e build de produção em `dist/` |
| `npm run preview` | serve o build localmente |

## Controles

| Ação | Tecla |
|---|---|
| Andar | `W` `A` `S` `D` ou setas |
| Olhar | mouse (clique na cena para capturar; `Esc` libera) |
| Correr | `Shift` |
| Interagir, abrir portão ou porta | `E` |
| Reiniciar a vista do modo atual | `R` |
| Voltar à tela inicial | `M` |
| Tela cheia | `F` |
| Ocultar interface | `H` |
| Ajuda | `?` |
| Modos | `1` visita, `2` inspeção, `3` apresentação |
| Apresentação | `Espaço` pausa; `←` e `→` voltam e avançam |

## Tecnologia

Vite, TypeScript e Three.js (`three`, `@types/three`, `vite`, `typescript`). Sem React nem bibliotecas de física: colisões 2D com limites verticais, escritas no projeto. Oclusão ambiental (GTAO) opcional, só na qualidade Alta.

## Estrutura

```
src/
  main.ts            inicialização, modos, interações e laço de render
  config.ts          layout e dimensões estimadas (um único lugar para corrigir)
  scene/             geometria e materiais (site, torre, abrigo, interior, armários, energia, esteira, luz, pós-processamento)
  controls/          primeira pessoa, câmera orbital, apresentação guiada e colisão
  ui/                HUD e estilos
  data/              textos dos painéis dos equipamentos
```

## Documentação

- [PRD.md](PRD.md): escopo, decisões, dimensões estimadas, pendências e registro de testes.
- [DESIGN.md](DESIGN.md): direção visual, materiais, iluminação, controles, acessibilidade e modos.
- [CLAUDE.md](CLAUDE.md): regras de trabalho do projeto e comandos.

## Limitações conhecidas

- Dimensões e posições são estimativas visuais a partir de uma imagem de referência.
- O interior do abrigo é genérico; o anexo do abrigo é maciço, sem acesso.
- Os testes foram feitos em navegador automatizado: faltam validações com mouse real, tela cheia, outras resoluções e GPU real (detalhes na seção 10 do PRD).
- A qualidade Alta (com oclusão ambiental) pode ser pesada em GPUs modestas.

## Publicação

Publicado no Vercel em https://erb-visita-virtual.vercel.app/. O projeto Vite é detectado sozinho (comando `npm run build`, saída `dist`). Não há variáveis de ambiente nem backend, e cada push em `main` gera uma nova implantação.

## Licença

Nenhuma licença foi definida até o momento.
