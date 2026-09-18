import { createI18n } from 'vue-i18n';

export const messages = {
  en: {
    nav: {
      opportunities: 'Signals',
      how: 'How it works',
      why: 'Why Viralab',
      explore: 'See opportunity signals'
    },
    hero: {
      eyebrow: 'YOUTUBE OPPORTUNITY INTELLIGENCE',
      title: 'Spot breakout opportunities',
      emphasis: 'before the market catches up.',
      lead: "Viralab maps YouTube channels and videos, compares performance against each channel's own baseline, and surfaces unusual growth before it becomes obvious.",
      how: 'How Viralab finds signals ↓',
      microcopy: 'Built for creators, operators and researchers who care about timing — not just trending lists.',
      launchNote: 'Viralab is in active development. Opportunity scoring and historical tracking are rolling out progressively.',
      sample: 'SAMPLE SIGNAL',
      signal: 'BREAKOUT VELOCITY',
      velocity: 'vs. recent baseline'
    },
    problem: {
      eyebrow: 'TIMING IS THE EDGE',
      title: 'By the time a trend looks obvious, the easiest part of the opportunity may already be gone.',
      early: 'EARLY SIGNAL',
      breakout: 'BREAKOUT',
      viral: 'MAINSTREAM',
      note: 'Viralab is designed to surface the movement between early signal and obvious trend.'
    },
    opportunities: {
      eyebrow: 'WHAT VIRALAB LOOKS FOR',
      title: 'Three signal types that can reveal opportunity early.',
      breakoutTitle: 'Breakout Channels',
      breakoutText: 'Channels whose recent momentum materially exceeds their own normal growth pattern.',
      subscribers: 'subscribers',
      outlierTitle: 'Video Outliers',
      outlierText: "Videos performing far above the channel's typical range — a useful clue that a topic, format or angle is resonating.",
      baseline: 'vs. baseline',
      outlier: 'OUTLIER',
      nicheTitle: 'Niche Momentum',
      nicheText: 'Similar signals appearing across multiple channels, suggesting movement beyond a single lucky upload.',
      channelsRising: 'channels moving',
      emerging: 'EMERGING'
    },
    intelligence: {
      eyebrow: 'FROM NOISE TO SIGNAL',
      title: 'More useful than a generic trending page.',
      text: "Raw views tell you what is already popular. Viralab focuses on relative performance: what changed, how unusual it is for that channel, and whether similar movement is appearing elsewhere.",
      historical: 'Observed Performance',
      engine: 'Opportunity Signals',
      breakout: 'SAMPLE BREAKOUT',
      subscribers: 'SUBSCRIBERS',
      growth: '30D GROWTH',
      velocity: 'VELOCITY'
    },
    moat: {
      eyebrow: 'THE COMPOUNDING DATA ADVANTAGE',
      title: 'A snapshot shows what happened.',
      emphasis: 'History helps explain what is changing.',
      text: 'As Viralab accumulates observations over time, channel baselines become richer and unusual acceleration becomes easier to distinguish from noise. That dataset is the foundation for better opportunity detection.'
    },
    cta: {
      eyebrow: 'FIND MOVEMENT BEFORE CONSENSUS',
      title: 'Start with the signals, not the hype.',
      text: 'See the types of channel, video and niche movement Viralab is being built to detect — then follow the product as those signals become searchable and actionable.',
      button: 'See the signal model'
    },
    footer: { tagline: 'YouTube Opportunity Intelligence' }
  },
  'pt-BR': {
    nav: {
      opportunities: 'Sinais',
      how: 'Como funciona',
      why: 'Por que Viralab',
      explore: 'Ver sinais de oportunidade'
    },
    hero: {
      eyebrow: 'INTELIGÊNCIA DE OPORTUNIDADES NO YOUTUBE',
      title: 'Encontre oportunidades em breakout',
      emphasis: 'antes que o mercado perceba.',
      lead: 'O Viralab mapeia canais e vídeos do YouTube, compara o desempenho com a própria linha de base de cada canal e destaca movimentos de crescimento fora do padrão antes que fiquem óbvios.',
      how: 'Como o Viralab encontra sinais ↓',
      microcopy: 'Feito para creators, operadores e pesquisadores que valorizam timing — não apenas listas de tendências.',
      launchNote: 'O Viralab está em desenvolvimento ativo. Scoring de oportunidades e histórico estão sendo liberados progressivamente.',
      sample: 'SINAL DE EXEMPLO',
      signal: 'VELOCIDADE DE BREAKOUT',
      velocity: 'vs. linha de base recente'
    },
    problem: {
      eyebrow: 'TIMING É A VANTAGEM',
      title: 'Quando uma tendência já parece óbvia, a parte mais fácil da oportunidade pode ter passado.',
      early: 'SINAL INICIAL',
      breakout: 'BREAKOUT',
      viral: 'MAINSTREAM',
      note: 'O Viralab foi desenhado para encontrar o movimento entre o sinal inicial e a tendência óbvia.'
    },
    opportunities: {
      eyebrow: 'O QUE O VIRALAB PROCURA',
      title: 'Três tipos de sinal que podem revelar oportunidade mais cedo.',
      breakoutTitle: 'Canais em Breakout',
      breakoutText: 'Canais cujo ritmo recente de crescimento está muito acima do seu próprio padrão normal.',
      subscribers: 'inscritos',
      outlierTitle: 'Vídeos Outliers',
      outlierText: 'Vídeos performando muito acima da faixa típica do canal — um indício de que tema, formato ou abordagem está encontrando demanda.',
      baseline: 'vs. linha de base',
      outlier: 'OUTLIER',
      nicheTitle: 'Momento de Nicho',
      nicheText: 'Sinais semelhantes surgindo em vários canais, indicando movimento além de um único vídeo que deu sorte.',
      channelsRising: 'canais em movimento',
      emerging: 'EMERGENTE'
    },
    intelligence: {
      eyebrow: 'DO RUÍDO AO SINAL',
      title: 'Mais útil do que uma página genérica de tendências.',
      text: 'Views brutas mostram o que já é popular. O Viralab olha para desempenho relativo: o que mudou, quão incomum aquilo é para o canal e se movimentos parecidos estão surgindo em outros lugares.',
      historical: 'Desempenho Observado',
      engine: 'Sinais de Oportunidade',
      breakout: 'BREAKOUT DE EXEMPLO',
      subscribers: 'INSCRITOS',
      growth: 'CRESCIMENTO 30D',
      velocity: 'VELOCIDADE'
    },
    moat: {
      eyebrow: 'A VANTAGEM DOS DADOS ACUMULADOS',
      title: 'Um snapshot mostra o que aconteceu.',
      emphasis: 'O histórico ajuda a explicar o que está mudando.',
      text: 'À medida que o Viralab acumula observações, as linhas de base dos canais ficam mais ricas e acelerações incomuns ficam mais fáceis de separar do ruído. Esse dataset é a base para detectar oportunidades melhores.'
    },
    cta: {
      eyebrow: 'ENCONTRE MOVIMENTO ANTES DO CONSENSO',
      title: 'Comece pelos sinais, não pelo hype.',
      text: 'Veja os tipos de movimento em canais, vídeos e nichos que o Viralab está sendo construído para detectar — e acompanhe a evolução desses sinais até virarem pesquisa e ação.',
      button: 'Ver o modelo de sinais'
    },
    footer: { tagline: 'Inteligência de Oportunidades no YouTube' }
  }
} as const;

export type SupportedLocale = keyof typeof messages;

export function resolveBrowserLocale(languages?: readonly string[]): SupportedLocale {
  const preferredLanguages = languages ?? (typeof navigator !== 'undefined' ? navigator.languages : []);
  return preferredLanguages.some((language) => language.toLowerCase() === 'pt-br') ? 'pt-BR' : 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveBrowserLocale(),
  fallbackLocale: 'en',
  messages
});
