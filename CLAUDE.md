# CLAUDE.md — ERB Visita Virtual 3D
**Data de Atualização: 26-10-2026_Versão 0.6.1**

## Visão geral
Projeto de uma aplicação web 3D para apresentar uma Estação Rádio-Base (ERB) de telefonia celular.
A experiência prevista inclui visita em primeira pessoa, inspeção técnica e apresentação guiada.
A imagem de referência original fica na pasta `references/` e orienta a disposição visual da estação.

## Arquitetura em uma página
- **Interface:** aplicação web com navegação e painéis informativos.
- **Cena 3D:** terreno, cercamento, portão, abrigo, armários, torre, antenas, cabos e energia.
- **Interação:** câmera em primeira pessoa, colisões, inspeção orbital e percurso guiado.
- **Tecnologia:** avaliar a estrutura existente antes de escolher React, TypeScript, Three.js ou alternativas.
- **Referência:** preservar o arquivo de imagem em `references/`; não presumir dimensões que não estejam legíveis.
- **Publicação:** desenvolvimento local; versionamento no GitHub; implantação posterior no Vercel.
- **Documentação:** `PRD.md` registra escopo, fases, pendências, critérios de aceitação e melhorias futuras.

## Escopo do projeto
O escopo funcional, as fases, as pendências e os critérios de aceitação estão definidos em [@PRD.md](PRD.md).
Se uma solicitação entrar em conflito com o PRD, informe o conflito e aguarde orientação antes de implementar.

## Regras de comportamento
1. Antes de qualquer mudança não trivial (mais de um arquivo ou alteração de comportamento), apresente um plano e aguarde aprovação.
2. Não adicione bibliotecas externas, CDNs ou pacotes sem consultar o usuário e receber aprovação.
3. Escreva comentários em português; explique o **porquê**, não o que o código já evidencia.
4. Antes de criar qualquer arquivo além dos três principais (`CLAUDE.md`, `PRD.md` e `DESIGN.md`), justifique sua necessidade e aguarde aprovação. Já autorizados pelo usuário: `README.md` e `Iniciar-ERB-Visita-Virtual.bat` (além dos arquivos de configuração do Vite/TypeScript e de `src/`).
5. Se uma solicitação conflitar com `PRD.md`, avise antes de implementar e proponha como resolver.
6. Registre cada atualização relevante do projeto com data e versão no formato `Data de Atualização: DD-MM-YYYY_Versão X.XX`. Mantenha `PRD.md` atualizado.

## Convenções de código
- Prefira nomes claros e consistentes; use inglês para identificadores técnicos e português para a documentação voltada ao usuário.
- Preserve a arquitetura existente; evite reescritas desnecessárias e arquivos excessivamente grandes.
- Separe cena 3D, controles, interface e dados dos equipamentos quando a arquitetura permitir.
- Não invente especificações, dimensões, marcas ou conformidade técnica sem fonte.
- Priorize acessibilidade, desempenho, legibilidade e tratamento de erros.
- Não declare testes executados sem realmente executá-los.

## Como rodar
- **Estado atual:** primeira versão implementada (Vite + TypeScript + Three.js). Dependências em uso: `three`, `@types/three`, `vite`, `typescript`.
- **Atalho no Windows:** duplo clique em `Iniciar-ERB-Visita-Virtual.bat` (instala na primeira vez, sobe o servidor e abre o navegador).
- `npm install`: instala as dependências.
- `npm run dev`: servidor de desenvolvimento em http://127.0.0.1:5173/.
- `npm run typecheck`: verificação de tipos.
- `npm run build`: typecheck e build de produção em `dist/`.
- `npm run preview`: serve o build localmente.
- **Estrutura:** `src/scene/` (geometria e materiais), `src/controls/` (primeira pessoa, orbital, tour, colisão), `src/ui/` (HUD e estilos), `src/data/` (textos dos equipamentos), `src/config.ts` (layout e dimensões estimadas).
- **Teclas úteis:** M volta à tela inicial; R reinicia a vista do modo atual; H oculta a interface.
- **Interior do abrigo:** `src/scene/shelterInterior.ts` é representação genérica. Não afirmar fabricante, modelo, tensão, capacidade ou autonomia sem fonte.
- **Verificação:** a página expõe `window.__erb` (mundo, câmera, tour e `verifyTour()`) para testes; `verifyTour()` deve retornar lista vazia.
- Sob OneDrive, o Vite pode recarregar a página sozinho quando o sync altera o horário dos arquivos; é esperado.
- **Repositório:** https://github.com/nelsongeraidine/ERB-Visita-Virtual (branch `main`). `dist/`, `node_modules/`, `.env*`, `.vercel` e caches de ferramentas estão no `.gitignore`.
- **Vercel:** projeto Vite detectado sozinho (build `npm run build`, saída `dist`), sem variáveis de ambiente nem backend. Publicado em https://erb-visita-virtual.vercel.app/ (cada push em `main` reimplanta).
