// Conteúdo dos painéis informativos.
// Regra do projeto: nenhuma especificação (tensão, potência, modelo, fabricante, azimute,
// capacidade) é afirmada sem fonte. Onde a referência não informa, o texto diz isso.

export interface EquipmentInfo {
  id: string;
  name: string;
  category: string;
  role: string;
  detail: string;
  /** Observações sobre o que é estimativa ou não foi informado */
  note?: string;
}

export const EQUIPMENT: Record<string, EquipmentInfo> = {
  tower: {
    id: 'tower',
    name: 'Torre metálica treliçada',
    category: 'Estrutura de suporte',
    role: 'Eleva antenas e parábolas para obter linha de visada e alcance.',
    detail:
      'Torre autoportante treliçada, com seção quadrada, montantes, diagonais e travessas, apoiada em quatro pedestais de concreto sobre uma laje. Possui escada vertical com cabo de segurança, plataformas de descanso e de topo e eletrocalha vertical para os cabos.',
    note: 'Altura de 30 m conforme indicado na referência. Largura da base e do topo são estimativas visuais; não há dados de carga, resistência ou conformidade normativa.',
  },
  antennas: {
    id: 'antennas',
    name: 'Antenas setoriais (móveis)',
    category: 'Radiofrequência',
    role: 'Irradiam e recebem o sinal do serviço móvel, cada painel cobrindo um setor.',
    detail:
      'Seis painéis verticais distribuídos em três setores nas faces da torre, fixados por tubos e braçadeiras. Os cabos descem pela eletrocalha vertical até o abrigo.',
    note: 'Quantidade, orientação e inclinação são parâmetros de visualização. A referência não fornece azimutes, tilt, bandas nem modelos.',
  },
  dishes: {
    id: 'dishes',
    name: 'Parábolas de micro-ondas',
    category: 'Transmissão',
    role: 'Formam enlaces ponto a ponto de alta capacidade com outras estações.',
    detail:
      'Duas parábolas de diâmetros diferentes, com refletor, alimentador, hastes de suporte e braços de fixação à torre.',
    note: 'Diâmetros e apontamento são estimativas visuais. Nenhum enlace real foi calculado ou representado.',
  },
  beacon: {
    id: 'beacon',
    name: 'Sinalizador de obstáculo e para-raios',
    category: 'Segurança e proteção',
    role: 'A luz vermelha avisa aeronaves; o para-raios capta descargas atmosféricas.',
    detail:
      'Luminária de obstrução no topo e haste captora acima da torre. Um condutor de cobre desce pelo canto da estrutura até a barra de equipotencialização na base.',
    note: 'Representação visual preliminar. Não há malha de aterramento nem certificação associada.',
  },
  shelter: {
    id: 'shelter',
    name: 'Abrigo de equipamentos (shelter)',
    category: 'Edificação técnica',
    role: 'Abriga os equipamentos de telecomunicações e energia protegidos do tempo.',
    detail:
      'Edificação de alvenaria com volume principal e anexo mais baixo, laje de cobertura com beiral, portas metálicas, grelha de ventilação, unidade de climatização de parede e entradas de cabos.',
    note: 'O interior é uma representação genérica e ilustrativa: a referência não mostra a configuração interna real.',
  },
  shelterDoor: {
    id: 'shelterDoor',
    name: 'Porta do abrigo',
    category: 'Edificação técnica',
    role: 'Controla o acesso ao interior do abrigo.',
    detail:
      'Porta metálica de folha única com batente, vedação de borracha, veneziana, maçaneta e dobradiças. Abre para fora; o piso interno fica um degrau acima da calçada, com patamar e soleira.',
    note: 'Largura do vão estimada em 0,95 m.',
  },
  racks: {
    id: 'racks',
    name: 'Racks de telecomunicações (genérico)',
    category: 'Equipamento de telecom',
    role: 'Alojam equipamentos de rádio, transmissão e energia em prateleiras padronizadas de 19 polegadas.',
    detail:
      'Três racks em linha junto à parede. Um deles está com a porta entreaberta para mostrar equipamentos de várias alturas com indicadores luminosos; os outros têm porta perfurada para ventilação. Os cabos chegam pelo topo, vindos da esteira aérea.',
    note: 'Representação genérica. Quantidade, conteúdo, fabricante, modelo e função de cada equipamento não foram informados e não são afirmados.',
  },
  batteries: {
    id: 'batteries',
    name: 'Banco de baterias (genérico)',
    category: 'Energia elétrica',
    role: 'Em estações de telecom, costuma manter a alimentação dos equipamentos entre a falta de energia da rede e a entrada do gerador.',
    detail:
      'Estante aberta em três níveis com blocos de bateria, terminais e barras de ligação em cobre, encostada na parede oeste.',
    note: 'A referência não mostra baterias. Tecnologia, tensão, capacidade e autonomia não foram informadas e não são afirmadas. É apenas uma ilustração.',
  },
  qdg: {
    id: 'qdg',
    name: 'Quadro de distribuição elétrica (genérico)',
    category: 'Energia elétrica',
    role: 'Distribui a energia e protege os circuitos que alimentam os equipamentos do abrigo.',
    detail: 'Quadro de parede aberto, com trilhos, barramentos de cobre e três fileiras de disjuntores, e tampa de proteção na parte inferior.',
    note: 'Representação genérica. Tensões, correntes, quantidade e função de cada disjuntor não foram informadas e não são afirmadas. Não é projeto elétrico.',
  },
  cabinets: {
    id: 'cabinets',
    name: 'Armários externos de telecom',
    category: 'Equipamento outdoor',
    role: 'Alojam equipamentos de telecomunicações em gabinetes para uso externo.',
    detail:
      'Três gabinetes metálicos sobre laje de concreto: dois de porta única e um de porta dupla. Têm grelhas de ventilação, dobradiças, fechaduras e entradas de cabos pela base.',
    note: 'A referência não identifica fabricante, modelo nem função específica de cada gabinete.',
  },
  ac: {
    id: 'ac',
    name: 'Climatização (unidades externas)',
    category: 'Infraestrutura de apoio',
    role: 'Retiram calor dos equipamentos para manter a temperatura de operação.',
    detail:
      'Unidades com grelha e ventilador visíveis, instaladas na parede do abrigo (com a face interna visível por dentro) e na face posterior de dois armários, com tubo de dreno.',
    note: 'Representação visual. O dimensionamento térmico não foi validado.',
  },
  tray: {
    id: 'tray',
    name: 'Esteiras de cabos com cobertura',
    category: 'Encaminhamento de cabos',
    role: 'Conduzem e protegem os cabos entre o abrigo e a torre.',
    detail:
      'Descida junto à parede do abrigo, curva e trecho aéreo sobre pilaretes até a eletrocalha vertical da torre. Um trecho foi deixado descoberto para mostrar os cabos. Dentro do abrigo, os cabos entram pela parede e seguem por uma escada para cabos no teto até o topo dos racks.',
    note: 'Trajeto plausível a partir da referência; não corresponde a projeto de cabeamento. A função de cada cabo é ilustrativa.',
  },
  meter: {
    id: 'meter',
    name: 'Medição de energia',
    category: 'Energia elétrica',
    role: 'Registra o consumo de energia fornecido pela concessionária.',
    detail: 'Duas caixas de medição em pilaretes junto à cerca, com visor e eletrodutos de descida.',
    note: 'Quantidade de medidores e padrão de entrada não foram informados.',
  },
  transformer: {
    id: 'transformer',
    name: 'Transformador',
    category: 'Energia elétrica',
    role: 'Adequa o nível de tensão da rede para alimentar a estação.',
    detail: 'Equipamento com cuba, aletas de resfriamento, buchas isoladoras e terminais, sobre base de concreto.',
    note: 'Tensões, potência e tipo não foram informados e não são afirmados.',
  },
  generator: {
    id: 'generator',
    name: 'Grupo gerador de energia',
    category: 'Energia elétrica',
    role: 'Fonte de contingência para manter a estação em operação se a rede falhar.',
    detail:
      'Conjunto em carenagem verde com portas de manutenção, grelhas, painel de comando, silencioso de escapamento e radiador na extremidade, sobre base metálica.',
    note: 'Potência, combustível e autonomia não foram informados e não são afirmados.',
  },
  fence: {
    id: 'fence',
    name: 'Cercamento perimetral',
    category: 'Segurança patrimonial',
    role: 'Delimita o terreno e restringe o acesso à infraestrutura.',
    detail:
      'Tela losangular em postes de aço com travessas, escoras nos cantos, concertina no topo e meio-fio de concreto na base. O espaçamento entre postes segue a ordem de 2 m indicada na planta.',
  },
  gate: {
    id: 'gate',
    name: 'Portão de acesso',
    category: 'Segurança patrimonial',
    role: 'Controla a entrada de pessoas e veículos na estação.',
    detail:
      'Portão de duas folhas gradeadas, com dobradiças, diagonal de travamento e fechamento central com cadeado. Abre para dentro do terreno.',
    note: 'Largura do vão estimada em 3,2 m.',
  },
  grounding: {
    id: 'grounding',
    name: 'Aterramento e equipotencialização',
    category: 'Proteção elétrica',
    role: 'Dá caminho seguro às correntes de descarga e iguala potenciais.',
    detail:
      'Barra de cobre na base da torre ligada ao condutor de descida que vem do para-raios. No interior do abrigo há também uma barra de aterramento na parede, ligada ao rack por um cabo verde.',
    note: 'Representação visual preliminar. O traçado da malha subterrânea não foi modelado e não há afirmação de conformidade.',
  },
};
