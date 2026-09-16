import { createI18n } from 'vue-i18n';

export const messages = {
  en: {
    nav: { opportunities: 'Opportunities', how: 'How it works', why: 'Why Viralab', explore: 'Explore opportunities' },
    hero: { eyebrow: 'YOUTUBE OPPORTUNITY INTELLIGENCE', title: 'Find the next viral', emphasis: 'before everyone else.', lead: 'Viralab tracks YouTube to surface accelerating channels, unusual video performance and emerging opportunities before they become obvious.', how: 'See how it works ↓', microcopy: 'Built on historical data, not hype.', signal: 'BREAKOUT SIGNAL', velocity: 'growth velocity' },
    problem: { eyebrow: 'TIMING IS THE EDGE', title: 'When everybody sees the trend, the opportunity is already obvious.', early: 'EARLY SIGNAL', breakout: 'BREAKOUT', viral: 'VIRAL', note: 'Viralab is built to find the signal here.' },
    opportunities: { eyebrow: 'WHAT VIRALAB FINDS', title: 'Signals worth paying attention to.', breakoutTitle: 'Breakout Channels', breakoutText: 'Small channels accelerating far above their normal growth baseline.', subscribers: 'subscribers', outlierTitle: 'Video Outliers', outlierText: "Videos performing dramatically above the channel's historical norm.", baseline: 'channel baseline', outlier: 'OUTLIER', nicheTitle: 'Niche Opportunities', nicheText: 'Related signals appearing across channels inside the same niche.', channelsRising: 'channels rising', emerging: 'EMERGING' },
    intelligence: { eyebrow: 'OPPORTUNITY INTELLIGENCE', title: 'Not another trending page.', text: "Every signal is measured against the channel's own history. That makes unusual acceleration visible while it is still early.", historical: 'Historical Data', engine: 'Opportunity Engine', breakout: 'BREAKOUT CHANNEL', subscribers: 'SUBSCRIBERS', growth: '30D GROWTH', velocity: 'VELOCITY' },
    moat: { eyebrow: 'THE COMPOUNDING ADVANTAGE', title: 'YouTube shows the present.', emphasis: "We're building the history.", text: 'The longer Viralab observes the ecosystem, the richer its baseline becomes — and the easier it is to distinguish noise from meaningful movement.' },
    footer: { tagline: 'YouTube Opportunity Intelligence' }
  },
  'pt-BR': {
    nav: { opportunities: 'Oportunidades', how: 'Como funciona', why: 'Por que Viralab', explore: 'Explorar oportunidades' },
    hero: { eyebrow: 'INTELIGÊNCIA DE OPORTUNIDADES NO YOUTUBE', title: 'Encontre o próximo viral', emphasis: 'antes de todo mundo.', lead: 'Viralab monitora o YouTube para revelar canais em aceleração, vídeos com desempenho fora do padrão e oportunidades emergentes antes que fiquem óbvias.', how: 'Veja como funciona ↓', microcopy: 'Construído sobre dados históricos, não hype.', signal: 'SINAL DE BREAKOUT', velocity: 'velocidade de crescimento' },
    problem: { eyebrow: 'TIMING É A VANTAGEM', title: 'Quando todo mundo percebe a tendência, a oportunidade já ficou óbvia.', early: 'SINAL INICIAL', breakout: 'BREAKOUT', viral: 'VIRAL', note: 'Viralab foi criado para encontrar o sinal aqui.' },
    opportunities: { eyebrow: 'O QUE O VIRALAB ENCONTRA', title: 'Sinais que merecem atenção.', breakoutTitle: 'Breakout Channels', breakoutText: 'Canais pequenos acelerando muito acima da sua própria média de crescimento.', subscribers: 'inscritos', outlierTitle: 'Video Outliers', outlierText: 'Vídeos performando muito acima do padrão histórico do próprio canal.', baseline: 'acima da média', outlier: 'OUTLIER', nicheTitle: 'Oportunidades de Nicho', nicheText: 'Sinais relacionados surgindo em vários canais dentro do mesmo nicho.', channelsRising: 'canais crescendo', emerging: 'EMERGENTE' },
    intelligence: { eyebrow: 'INTELIGÊNCIA DE OPORTUNIDADES', title: 'Não é mais uma página de tendências.', text: 'Cada sinal é medido contra o histórico do próprio canal. Assim, acelerações incomuns ficam visíveis enquanto ainda estão no início.', historical: 'Dados Históricos', engine: 'Opportunity Engine', breakout: 'CANAL EM BREAKOUT', subscribers: 'INSCRITOS', growth: 'CRESCIMENTO 30D', velocity: 'VELOCIDADE' },
    moat: { eyebrow: 'A VANTAGEM QUE SE ACUMULA', title: 'O YouTube mostra o presente.', emphasis: 'Nós estamos construindo o histórico.', text: 'Quanto mais tempo o Viralab observa o ecossistema, mais rica fica sua linha de base — e mais fácil se torna separar ruído de movimentos relevantes.' },
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
