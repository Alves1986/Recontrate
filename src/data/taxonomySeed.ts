export interface TaxonomyCategorySeed {
  slug: string;
  legacySlug?: string;
  nome: string;
  descricao: string;
  icone: string;
  avgResponseMin: number;
  verifiedCount: number;
  ordemExibicao: number;
  specialties: Array<{
    nome: string;
    descricao?: string;
    sinonimos?: string[];
  }>;
}

/**
 * Normaliza termo de taxonomia removendo acentos, pontuação extra, maiúsculas e espaços duplicados.
 */
export function normalizeTaxonomyTerm(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalização leve singularizada por tokens para detectar duplicidades de plural/singular e ordem simples.
 */
export function normalizeTaxonomyStem(input: string): string {
  const norm = normalizeTaxonomyTerm(input);
  if (!norm) return '';
  return norm
    .split(' ')
    .map((token) => {
      if (token.length > 4 && token.endsWith('oes')) {
        return `${token.slice(0, -3)}ao`;
      }
      if (token.length > 4 && token.endsWith('s')) {
        return token.slice(0, -1);
      }
      return token;
    })
    .join(' ');
}

export function slugifyTaxonomyTerm(input: string): string {
  return normalizeTaxonomyTerm(input).replace(/\s+/g, '-');
}

export const INITIAL_TAXONOMY_CATEGORIES: TaxonomyCategorySeed[] = [
  {
    slug: 'eletrica',
    legacySlug: 'eletricista',
    nome: 'Elétrica',
    descricao:
      'Instalações residenciais e comerciais, quadros de distribuição, chuveiros, iluminação e automação.',
    icone: 'zap',
    avgResponseMin: 11,
    verifiedCount: 42,
    ordemExibicao: 1,
    specialties: [
      {
        nome: 'Instalação elétrica residencial',
        sinonimos: ['eletrica residencial', 'fiacao residencial', 'eletricista residencial'],
      },
      {
        nome: 'Instalação elétrica comercial',
        sinonimos: ['eletrica comercial', 'loja', 'escritorio'],
      },
      {
        nome: 'Manutenção elétrica',
        sinonimos: ['reparo eletrico', 'curto circuito', 'manutencao de eletrica'],
      },
      {
        nome: 'Instalação de chuveiro',
        sinonimos: ['chuveiro', 'troca de chuveiro', 'chuveiro eletrico', 'disjuntor chuveiro'],
      },
      {
        nome: 'Instalação de tomadas e interruptores',
        sinonimos: ['tomada 20a', 'troca de tomada', 'interruptor'],
      },
      {
        nome: 'Quadro de distribuição',
        sinonimos: ['quadro eletrico', 'disjuntor', 'idr', 'dps'],
      },
      {
        nome: 'Iluminação',
        sinonimos: ['luminaria', 'lustre', 'fita de led', 'spot led'],
      },
      {
        nome: 'Automação residencial',
        sinonimos: ['casa inteligente', 'interruptor smart', 'alexa'],
      },
      {
        nome: 'Aterramento',
        sinonimos: ['haste de aterramento', 'protecao eletrica'],
      },
      {
        nome: 'Manutenção predial elétrica',
        sinonimos: ['condominio eletrica', 'manutencao predial'],
      },
    ],
  },
  {
    slug: 'hidraulica',
    legacySlug: 'encanador',
    nome: 'Hidráulica',
    descricao:
      'Reparos de vazamentos, desentupimento, registros, torneiras, aquecedores e manutenção predial hidráulica.',
    icone: 'droplets',
    avgResponseMin: 14,
    verifiedCount: 35,
    ordemExibicao: 2,
    specialties: [
      {
        nome: 'Instalação hidráulica residencial',
        sinonimos: ['encanador residencial', 'tubulacao', 'agua fria e quente'],
      },
      {
        nome: 'Reparo de vazamento',
        sinonimos: ['caca vazamento', 'vazamento de cano', 'registro pingando'],
      },
      {
        nome: 'Desentupimento',
        sinonimos: ['desentupidor', 'pia entupida', 'ralo entupido'],
      },
      {
        nome: 'Instalação de torneira',
        sinonimos: ['troca de torneira', 'misturador', 'torneira gourmet'],
      },
      {
        nome: 'Instalação de vaso sanitário',
        sinonimos: ['troca de vaso sanitario', 'caixa acoplada', 'valvula hydra'],
      },
      {
        nome: "Manutenção de caixa d'água",
        sinonimos: ['limpeza de caixa dagua', 'boia caixa dagua'],
      },
      {
        nome: 'Instalação de aquecedor',
        sinonimos: ['aquecedor a gas', 'pressurizador'],
      },
      {
        nome: 'Manutenção predial hidráulica',
        sinonimos: ['hidraulica condominio', 'prumada'],
      },
    ],
  },
  {
    slug: 'pintura',
    legacySlug: 'pintor',
    nome: 'Pintura',
    descricao:
      'Pintura residencial e comercial, fachadas, textura, grafiato, verniz e restauração.',
    icone: 'paintbrush',
    avgResponseMin: 19,
    verifiedCount: 29,
    ordemExibicao: 3,
    specialties: [
      { nome: 'Pintura residencial', sinonimos: ['pintor residencial', 'pintura apartamento'] },
      { nome: 'Pintura comercial', sinonimos: ['pintura escritorio', 'pintura loja'] },
      { nome: 'Pintura de fachada', sinonimos: ['pintura externa', 'fachada'] },
      { nome: 'Textura', sinonimos: ['efeito cimento queimado', 'textura parede'] },
      { nome: 'Grafiato', sinonimos: ['aplicacao de grafiato'] },
      { nome: 'Verniz', sinonimos: ['envernizamento', 'verniz madeira'] },
      { nome: 'Pintura de gesso', sinonimos: ['pintura teto gesso', 'massa corrida'] },
      { nome: 'Restauração de pintura', sinonimos: ['tratamento de trincas', 'umidade parede'] },
    ],
  },
  {
    slug: 'diarista-e-limpeza',
    legacySlug: 'diarista',
    nome: 'Diarista e limpeza',
    descricao:
      'Limpeza residencial e comercial, pós-obra, estofados, organização e passadoria.',
    icone: 'sparkles',
    avgResponseMin: 16,
    verifiedCount: 58,
    ordemExibicao: 4,
    specialties: [
      { nome: 'Limpeza residencial', sinonimos: ['faxina residencial', 'diarista apartamento'] },
      { nome: 'Limpeza comercial', sinonimos: ['limpeza escritorio', 'limpeza consultorio'] },
      { nome: 'Limpeza pós-obra', sinonimos: ['limpeza pos reforma', 'faxina pos obra'] },
      { nome: 'Limpeza de sofá', sinonimos: ['higienizacao de sofa', 'lavagem de estofado'] },
      { nome: 'Limpeza de carpete', sinonimos: ['higienizacao de tapete'] },
      { nome: 'Organização residencial', sinonimos: ['personal organizer', 'organizacao armarios'] },
      { nome: 'Passadoria', sinonimos: ['passar roupas', 'passadeira'] },
      { nome: 'Lavanderia', sinonimos: ['lavagem de roupas'] },
    ],
  },
  {
    slug: 'ar-condicionado',
    legacySlug: 'tecnico-de-ar-condicionado',
    nome: 'Ar-condicionado',
    descricao:
      'Instalação de split, cassete e piso teto, higienização, carga de gás e manutenção preventiva.',
    icone: 'wind',
    avgResponseMin: 13,
    verifiedCount: 24,
    ordemExibicao: 5,
    specialties: [
      { nome: 'Instalação de split', sinonimos: ['instalacao ar inverter', 'split hi wall'] },
      { nome: 'Manutenção de split', sinonimos: ['conserto de ar condicionado', 'reparo split'] },
      { nome: 'Higienização', sinonimos: ['limpeza de ar condicionado', 'higienizacao ar'] },
      { nome: 'Carga de gás', sinonimos: ['recarga de gas', 'gas refrigerante'] },
      { nome: 'Instalação de ar-condicionado comercial', sinonimos: ['ar condicionado empresa'] },
      { nome: 'Manutenção preventiva', sinonimos: ['pmoc', 'revisao ar condicionado'] },
      { nome: 'Instalação de cassete', sinonimos: ['ar cassete'] },
      { nome: 'Instalação de piso teto', sinonimos: ['ar piso teto'] },
    ],
  },
  {
    slug: 'montagem-e-moveis',
    nome: 'Montagem e móveis',
    descricao:
      'Montagem e desmontagem de móveis planejados e modulados, armários, cozinhas, suportes de TV e escritórios.',
    icone: 'hammer',
    avgResponseMin: 15,
    verifiedCount: 31,
    ordemExibicao: 6,
    specialties: [
      { nome: 'Montagem de móveis', sinonimos: ['montador de moveis'] },
      { nome: 'Desmontagem de móveis', sinonimos: ['desmontar guarda roupa'] },
      { nome: 'Montagem de armário', sinonimos: ['montagem guarda roupa', 'closet'] },
      { nome: 'Montagem de cozinha', sinonimos: ['armario de cozinha'] },
      { nome: 'Montagem de berço', sinonimos: ['quarto infantil'] },
      { nome: 'Montagem de estante', sinonimos: ['rack e painel'] },
      { nome: 'Instalação de suporte de TV', sinonimos: ['suporte tv parede'] },
      { nome: 'Montagem de escritório', sinonimos: ['mesa escritorio', 'estacao de trabalho'] },
    ],
  },
  {
    slug: 'reforma-e-construcao',
    nome: 'Reforma e construção',
    descricao:
      'Alvenaria, pisos, porcelanato, drywall, forro, impermeabilização e reformas de banheiro e cozinha.',
    icone: 'hard-hat',
    avgResponseMin: 22,
    verifiedCount: 27,
    ordemExibicao: 7,
    specialties: [
      { nome: 'Alvenaria', sinonimos: ['pedreiro', 'levantamento de parede'] },
      { nome: 'Gesso', sinonimos: ['sanca', 'moldura de gesso'] },
      { nome: 'Piso', sinonimos: ['contrapiso', 'assentamento de piso'] },
      { nome: 'Porcelanato', sinonimos: ['assentamento porcelanato', 'azulejista'] },
      { nome: 'Azulejo', sinonimos: ['revestimento ceramico'] },
      { nome: 'Reforma de banheiro', sinonimos: ['reforma wc'] },
      { nome: 'Reforma de cozinha', sinonimos: ['reforma gourmet'] },
      { nome: 'Drywall', sinonimos: ['parede drywall', 'divisoria gesso acartonado'] },
      { nome: 'Forro', sinonimos: ['forro pvc', 'forro drywall'] },
      { nome: 'Impermeabilização', sinonimos: ['manta asfaltica', 'infiltracao laje'] },
    ],
  },
  {
    slug: 'jardinagem',
    nome: 'Jardinagem',
    descricao:
      'Manutenção de jardins, poda, gramado, irrigação, paisagismo, limpeza de área externa e plantio.',
    icone: 'trees',
    avgResponseMin: 20,
    verifiedCount: 18,
    ordemExibicao: 8,
    specialties: [
      { nome: 'Manutenção de jardim', sinonimos: ['jardineiro'] },
      { nome: 'Poda de árvores', sinonimos: ['poda ornamental', 'poda cerca viva'] },
      { nome: 'Gramado', sinonimos: ['corte de grama', 'plantio de grama'] },
      { nome: 'Irrigação', sinonimos: ['sistema de irrigacao'] },
      { nome: 'Paisagismo', sinonimos: ['projeto paisagistico'] },
      { nome: 'Limpeza de área externa', sinonimos: ['limpeza quintal'] },
      { nome: 'Plantio', sinonimos: ['plantio de mudas', 'horta'] },
    ],
  },
  {
    slug: 'tecnico-e-informatica',
    nome: 'Técnico e informática',
    descricao:
      'Manutenção de computadores, formatação, redes Wi-Fi, câmeras de segurança e suporte técnico.',
    icone: 'laptop',
    avgResponseMin: 14,
    verifiedCount: 22,
    ordemExibicao: 9,
    specialties: [
      { nome: 'Manutenção de computador', sinonimos: ['conserto notebook', 'reparo pc'] },
      { nome: 'Formatação', sinonimos: ['formatar notebook', 'reinstalacao windows'] },
      { nome: 'Instalação de programas', sinonimos: ['configuracao software'] },
      { nome: 'Redes e Wi-Fi', sinonimos: ['repetidor wifi', 'rede mesh', 'roteador'] },
      { nome: 'Câmeras de segurança', sinonimos: ['cftv', 'instalacao camera'] },
      { nome: 'Suporte técnico residencial', sinonimos: ['tecnico informatica casa'] },
      { nome: 'Suporte técnico comercial', sinonimos: ['ti empresa'] },
    ],
  },
  {
    slug: 'mudanca-e-frete',
    nome: 'Mudança e frete',
    descricao:
      'Mudanças residenciais e comerciais, fretes rápidos, içamento, embalagem e transporte de móveis.',
    icone: 'truck',
    avgResponseMin: 18,
    verifiedCount: 20,
    ordemExibicao: 10,
    specialties: [
      { nome: 'Mudança residencial', sinonimos: ['caminhao de mudanca'] },
      { nome: 'Mudança comercial', sinonimos: ['mudanca escritorio'] },
      { nome: 'Frete', sinonimos: ['carreto', 'frete rapido'] },
      { nome: 'Içamento', sinonimos: ['icamento de moveis'] },
      { nome: 'Embalagem', sinonimos: ['embalagem para mudanca'] },
      { nome: 'Desmontagem para mudança', sinonimos: ['desmontagem e montagem mudanca'] },
      { nome: 'Transporte de móveis', sinonimos: ['carreto de moveis'] },
    ],
  },
];

export const CATEGORY_EQUIVALENCES: Record<string, string[]> = {
  eletrica: ['eletrica', 'eletricista'],
  eletricista: ['eletrica', 'eletricista'],
  hidraulica: ['hidraulica', 'encanador'],
  encanador: ['hidraulica', 'encanador'],
  pintura: ['pintura', 'pintor'],
  pintor: ['pintura', 'pintor'],
  'diarista-e-limpeza': ['diarista-e-limpeza', 'diarista'],
  diarista: ['diarista-e-limpeza', 'diarista'],
  'ar-condicionado': ['ar-condicionado', 'tecnico-de-ar-condicionado'],
  'tecnico-de-ar-condicionado': ['ar-condicionado', 'tecnico-de-ar-condicionado'],
};
