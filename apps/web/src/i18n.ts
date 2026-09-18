import { createI18n } from 'vue-i18n';

export type SupportedLocale = 'en' | 'pt-BR';

export const resolveLocale = (languages: readonly string[]): SupportedLocale => {
  for (const language of languages) {
    const normalized = language.trim().toLowerCase();
    if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  }
  return 'en';
};

const browserLanguages = (): string[] => {
  if (typeof navigator === 'undefined') return [];
  const preferred = navigator.languages?.length ? [...navigator.languages] : [];
  if (navigator.language && !preferred.includes(navigator.language)) preferred.push(navigator.language);
  return preferred;
};

export const messages = {
  en: {
    nav: { opportunities: 'Signals', how: 'How it works', why: 'Why Viralab', login: 'Log in', access: 'Get early access' },
    hero: {
      eyebrow: 'YOUTUBE OPPORTUNITY INTELLIGENCE',
      title: 'See which YouTube channels and topics are breaking their own baseline',
      emphasis: '— before the trending page notices.',
      lead: 'Viralab maps channels and videos, compares performance with each channel’s own baseline, and surfaces unusual growth while the opportunity is still early.',
      primary: 'Get early access', secondary: 'See a live sample signal',
      microcopy: 'Built for channel operators, researchers, and serious creators who care about timing — not trending lists.',
      sample: 'SAMPLE SIGNAL', signal: 'BREAKOUT VELOCITY', velocity: 'vs. channel baseline'
    },
    sample: {
      eyebrow: 'ONE SIGNAL, MADE CONCRETE', title: 'This is the kind of movement Viralab is built to surface.',
      context: 'Sample · Automotive · Brazil', note: 'The useful question is not “is this channel big?” It is “is this channel moving unusually fast relative to itself?”',
      observed: 'Observed signal', subscribers: 'Subscribers', growth: 'Sample growth', velocity: 'Relative velocity',
      disclaimer: 'Illustrative sample · not a live recommendation'
    },
    carousel: {
      discoverNiches: 'DISCOVER NICHES', smallChannels: 'Small channels, shared acceleration',
      discoverTrends: 'DISCOVER TRENDS', topicsMoving: 'Topics moving before Trending',
      findOutliers: 'FIND OUTLIERS', videosEscaping: 'Videos escaping the normal range',
      trackBreakouts: 'TRACK BREAKOUTS', channelsLeaving: 'Channels leaving their baseline',
      moveEarly: 'MOVE EARLY', signalBeforeConsensus: 'Signal before consensus'
    },
    problem: {
      eyebrow: 'TIMING IS THE EDGE', title: 'By the time a trend looks obvious, the easiest part of the opportunity may already be gone.',
      early: 'EARLY SIGNAL', breakout: 'BREAKOUT', viral: 'MAINSTREAM',
      note: 'Viralab is built to surface the movement between early signal and obvious trend.'
    },
    opportunities: {
      eyebrow: 'WHAT VIRALAB LOOKS FOR', title: 'Three signals. Three decisions.',
      breakoutTitle: 'Breakout Channels', breakoutText: 'Channels moving materially outside their own normal performance band.',
      breakoutAction: 'Worth watching, partnering with, or treating as a leading indicator.',
      outlierTitle: 'Video Outliers', outlierText: 'Videos performing far above the channel’s typical range.',
      outlierAction: 'Find the topic, format, or angle that is resonating. Steal the pattern, not the thumbnail.',
      nicheTitle: 'Niche Momentum', nicheText: 'Similar unusual movement appearing across multiple channels.',
      nicheAction: 'That is evidence of a market forming — not one lucky upload.',
      sample: 'SAMPLE', subscribers: 'subscribers', baseline: 'vs. baseline', outlier: 'OUTLIER', channelsRising: 'channels moving', emerging: 'EMERGING'
    },
    intelligence: {
      eyebrow: 'RELATIVE PERFORMANCE > RAW VIEWS', title: 'More useful than a generic trending page.',
      text: 'Raw views tell you what is already popular. Viralab asks what changed, how unusual that change is for that channel, and whether similar movement is showing up elsewhere.',
      historical: 'Observed performance', engine: 'Opportunity signals'
    },
    score: {
      eyebrow: 'HOW THE SCORE THINKS', title: 'A signal needs context, not just a big number.',
      baseline: 'Baseline', baselineText: 'Compare a channel or video with its own normal performance.',
      velocity: 'Velocity', velocityText: 'Measure how far observed performance has moved away from that baseline.',
      confidence: 'Confidence', confidenceText: 'Treat stronger evidence as stronger signal, and keep weak evidence visibly uncertain.',
      note: 'The scoring model evolves as Viralab accumulates observation history. Method changes are documented rather than hidden.'
    },
    moat: {
      eyebrow: 'THE COMPOUNDING DATA ADVANTAGE', title: 'A snapshot shows what happened.', emphasis: 'History helps explain what is changing.',
      text: 'Each observation makes the baseline more useful. Over time, Viralab can separate sustained acceleration from noise with more context — turning a stream of public metrics into an accumulated opportunity dataset.'
    },
    access: {
      eyebrow: 'EARLY ACCESS', title: 'Start with the signals, not the hype.',
      text: 'Join the early-access list. We will tell you when the signal feed becomes searchable and actionable.',
      email: 'Work email', role: 'I am a…', niche: 'YouTube niche (optional)', submit: 'Join the waitlist', joining: 'Joining…',
      emailPlaceholder: 'you@company.com', nichePlaceholder: 'Automotive, finance…',
      roles: { operator: 'Channel operator / MCN', researcher: 'Researcher / analyst', creator: 'Serious creator' },
      errors: { rateLimited: 'Too many attempts. Please try again later.', requestFailed: 'We could not save your request. Please try again.' },
      success: 'You’re on the list. We’ll send the first signals, not a newsletter.',
      privacy: 'No newsletter cadence. Early-access and product-signal updates only.'
    },
    footer: {
      tagline: 'YouTube Opportunity Intelligence', note: 'Viralab is YouTube opportunity intelligence — not a thumbnail maker, viral score app, or social agency.',
      development: 'Viralab is in active development. Signal models and historical tracking are evolving.',
      privacy: 'Privacy', terms: 'Terms'
    },
    auth: {
      badgeQuota: 'SIGN UP AND GET +5 SEARCHES',
      badgeDefault: 'SIGN IN TO VIRALAB',
      quotaEyebrow: 'TODAY’S FREE LIMIT REACHED',
      quotaTitle: 'Create your account and get 5 more searches.',
      quotaText: 'You used today’s 10 anonymous searches. On first signup, your account receives a one-time bonus of 5 free Explorer searches.',
      defaultEyebrow: 'SIGN IN TO VIRALAB',
      defaultTitle: 'Keep exploring signals.',
      defaultText: 'Sign in to use Viralab with your account. If you are new, your first signup includes a one-time bonus of 5 free searches.',
      google: 'Continue with Google',
      plans: 'View paid plans',
      plansNote: 'Plans will be available in a later release.',
      errors: {
        providerDisabled: 'Google sign-in is not enabled on the server yet.',
        signInFailed: 'We could not start Google sign-in. Please try again.'
      },
      callback: {
        eyebrow: 'VIRALAB AUTH',
        finishing: 'Finishing sign in…',
        failed: 'Login failed.',
        missingCode: 'Missing OAuth authorization code.'
      }
    },
    explorer: {
      badgeDataset: 'VIRALAB DATASET · YOUTUBE',
      badgeAnonymous: '{remaining}/{limit} FREE QUERIES LEFT TODAY',
      badgeSignup: '{remaining}/{limit} SIGNUP BONUS SEARCHES LEFT',
      eyebrow: 'OPPORTUNITY EXPLORER',
      title: 'Signals before consensus.',
      intro: 'Outliers computed from Viralab’s dataset. Opening this screen does not query YouTube.',
      minScore: 'Minimum score',
      loading: 'Loading signals…',
      retry: 'Retry',
      empty: 'No signals reach this score yet. The dataset is still being refreshed.',
      loadError: 'Unable to load signals right now.',
      bonusExhausted: 'Your signup bonus is finished. Anonymous searches return on the next daily cycle.',
      subscribers: 'subscribers',
      openVideo: 'Open video ↗',
      multiplier: 'MULTIPLIER',
      viewsBaseline: 'VIEWS / BASELINE',
      confidence: 'CONFIDENCE',
      modelNote: 'MVP model: video views compared with the channel’s lifetime average views per video. Case 07 temporal history will replace this baseline with observed windows.'
    }
  },
  'pt-BR': {
    nav: { opportunities: 'Sinais', how: 'Como funciona', why: 'Por que Viralab', login: 'Entrar', access: 'Acesso antecipado' },
    hero: {
      eyebrow: 'INTELIGÊNCIA DE OPORTUNIDADES NO YOUTUBE',
      title: 'Veja quais canais e temas do YouTube estão rompendo a própria linha de base',
      emphasis: '— antes que a página de tendências perceba.',
      lead: 'O Viralab mapeia canais e vídeos, compara o desempenho com a própria linha de base de cada canal e destaca crescimentos incomuns enquanto a oportunidade ainda está no começo.',
      primary: 'Quero acesso antecipado', secondary: 'Ver um sinal de exemplo',
      microcopy: 'Feito para operadores de canais, pesquisadores e criadores que valorizam timing — não listas de tendências.',
      sample: 'SINAL DE EXEMPLO', signal: 'VELOCIDADE DE BREAKOUT', velocity: 'vs. linha de base do canal'
    },
    sample: {
      eyebrow: 'UM SINAL, DE FORMA CONCRETA', title: 'É esse tipo de movimento que o Viralab foi criado para revelar.',
      context: 'Exemplo · Automotivo · Brasil', note: 'A pergunta útil não é “esse canal é grande?”. É “esse canal está se movendo de forma incomum em relação a ele mesmo?”.',
      observed: 'Sinal observado', subscribers: 'Inscritos', growth: 'Crescimento do exemplo', velocity: 'Velocidade relativa',
      disclaimer: 'Exemplo ilustrativo · não é uma recomendação em tempo real'
    },
    carousel: {
      discoverNiches: 'DESCOBRIR NICHOS', smallChannels: 'Canais pequenos, aceleração compartilhada',
      discoverTrends: 'DESCOBRIR TENDÊNCIAS', topicsMoving: 'Temas se movendo antes do Trending',
      findOutliers: 'ENCONTRAR OUTLIERS', videosEscaping: 'Vídeos escapando da faixa normal',
      trackBreakouts: 'ACOMPANHAR BREAKOUTS', channelsLeaving: 'Canais saindo da própria linha de base',
      moveEarly: 'AGIR CEDO', signalBeforeConsensus: 'Sinal antes do consenso'
    },
    problem: {
      eyebrow: 'TIMING É A VANTAGEM', title: 'Quando uma tendência já parece óbvia, a parte mais fácil da oportunidade pode ter passado.',
      early: 'SINAL INICIAL', breakout: 'BREAKOUT', viral: 'MASSA',
      note: 'O Viralab foi criado para revelar o movimento entre o sinal inicial e a tendência óbvia.'
    },
    opportunities: {
      eyebrow: 'O QUE O VIRALAB PROCURA', title: 'Três sinais. Três decisões.',
      breakoutTitle: 'Canais em breakout', breakoutText: 'Canais se movendo materialmente fora da própria faixa normal de desempenho.',
      breakoutAction: 'Vale acompanhar, buscar parceria ou tratar como indicador antecipado.',
      outlierTitle: 'Vídeos fora da curva', outlierText: 'Vídeos performando muito acima da faixa típica do canal.',
      outlierAction: 'Encontre o tema, formato ou abordagem que está ressoando. Copie o padrão, não a thumbnail.',
      nicheTitle: 'Momentum de nicho', nicheText: 'Movimento incomum semelhante aparecendo em vários canais.',
      nicheAction: 'Isso é evidência de um mercado se formando — não apenas um upload com sorte.',
      sample: 'EXEMPLO', subscribers: 'inscritos', baseline: 'vs. base', outlier: 'OUTLIER', channelsRising: 'canais subindo', emerging: 'EMERGENTE'
    },
    intelligence: {
      eyebrow: 'DESEMPENHO RELATIVO > VIEWS BRUTAS', title: 'Mais útil que uma página genérica de tendências.',
      text: 'Views brutas mostram o que já é popular. O Viralab pergunta o que mudou, quão incomum essa mudança é para o canal e se movimentos semelhantes estão aparecendo em outros lugares.',
      historical: 'Desempenho observado', engine: 'Sinais de oportunidade'
    },
    score: {
      eyebrow: 'COMO O SCORE PENSA', title: 'Um sinal precisa de contexto, não só de um número grande.',
      baseline: 'Linha de base', baselineText: 'Compare um canal ou vídeo com o próprio desempenho normal.',
      velocity: 'Velocidade', velocityText: 'Meça o quanto o desempenho observado se afastou dessa linha de base.',
      confidence: 'Confiança', confidenceText: 'Evidência mais forte gera sinal mais forte; evidência fraca permanece visivelmente incerta.',
      note: 'O modelo de score evolui conforme o Viralab acumula histórico de observações. Mudanças de método são documentadas em vez de escondidas.'
    },
    moat: {
      eyebrow: 'A VANTAGEM COMPOSTA DOS DADOS', title: 'Um snapshot mostra o que aconteceu.', emphasis: 'O histórico ajuda a explicar o que está mudando.',
      text: 'Cada observação torna a linha de base mais útil. Com o tempo, o Viralab consegue separar aceleração sustentada de ruído com mais contexto — transformando métricas públicas em um dataset acumulado de oportunidades.'
    },
    access: {
      eyebrow: 'ACESSO ANTECIPADO', title: 'Comece pelos sinais, não pelo hype.',
      text: 'Entre na lista de acesso antecipado. Avisaremos quando o feed de sinais estiver pesquisável e acionável.',
      email: 'E-mail profissional', role: 'Eu sou…', niche: 'Nicho no YouTube (opcional)', submit: 'Entrar na lista', joining: 'Entrando…',
      emailPlaceholder: 'voce@empresa.com', nichePlaceholder: 'Automotivo, finanças…',
      roles: { operator: 'Operador de canal / MCN', researcher: 'Pesquisador / analista', creator: 'Criador profissional' },
      errors: { rateLimited: 'Muitas tentativas. Tente novamente mais tarde.', requestFailed: 'Não foi possível salvar sua solicitação. Tente novamente.' },
      success: 'Você está na lista. Vamos enviar os primeiros sinais, não uma newsletter.',
      privacy: 'Sem cadência de newsletter. Apenas acesso antecipado e atualizações de produto.'
    },
    footer: {
      tagline: 'Inteligência de Oportunidades no YouTube', note: 'Viralab é inteligência de oportunidades no YouTube — não um criador de thumbnails, app de score viral ou agência social.',
      development: 'O Viralab está em desenvolvimento ativo. Os modelos de sinais e o histórico ainda estão evoluindo.',
      privacy: 'Privacidade', terms: 'Termos'
    },
    auth: {
      badgeQuota: 'CADASTRE-SE E GANHE +5 BUSCAS',
      badgeDefault: 'ENTRAR NO VIRALAB',
      quotaEyebrow: 'LIMITE GRATUITO DE HOJE ATINGIDO',
      quotaTitle: 'Crie sua conta e ganhe mais 5 buscas.',
      quotaText: 'Você usou as 10 consultas anônimas de hoje. No primeiro cadastro, sua conta recebe um bônus único de 5 consultas gratuitas no Explorer.',
      defaultEyebrow: 'ENTRAR NO VIRALAB',
      defaultTitle: 'Continue explorando sinais.',
      defaultText: 'Entre com sua conta para usar o Viralab. Se você ainda não tem conta, o primeiro cadastro inclui um bônus único de 5 consultas gratuitas.',
      google: 'Entrar ou criar conta com Google',
      plans: 'Ver planos pagos',
      plansNote: 'A página de planos será disponibilizada em uma próxima etapa.',
      errors: {
        providerDisabled: 'O login com Google ainda não está habilitado no servidor.',
        signInFailed: 'Não foi possível iniciar o login com Google. Tente novamente.'
      },
      callback: {
        eyebrow: 'AUTENTICAÇÃO VIRALAB',
        finishing: 'Finalizando login…',
        failed: 'Falha no login.',
        missingCode: 'Código de autorização OAuth ausente.'
      }
    },
    explorer: {
      badgeDataset: 'DATASET VIRALAB · YOUTUBE',
      badgeAnonymous: '{remaining}/{limit} CONSULTAS GRÁTIS HOJE',
      badgeSignup: '{remaining}/{limit} BUSCAS BÔNUS DO CADASTRO',
      eyebrow: 'EXPLORADOR DE OPORTUNIDADES',
      title: 'Sinais antes do consenso.',
      intro: 'Outliers calculados sobre o dataset do Viralab. Abrir esta tela não consulta o YouTube.',
      minScore: 'Score mínimo',
      loading: 'Calculando sinais…',
      retry: 'Tentar novamente',
      empty: 'Nenhum sinal atingiu este score ainda. O dataset continua sendo atualizado.',
      loadError: 'Não foi possível carregar os sinais agora.',
      bonusExhausted: 'Seu bônus de cadastro terminou. As consultas anônimas voltam no próximo ciclo diário.',
      subscribers: 'inscritos',
      openVideo: 'Abrir vídeo ↗',
      multiplier: 'MULTIPLICADOR',
      viewsBaseline: 'VIEWS / BASE',
      confidence: 'CONFIANÇA',
      modelNote: 'Modelo MVP: views do vídeo comparadas à média histórica de views por vídeo do canal. O histórico temporal da Case 07 substituirá essa linha de base por janelas observadas.'
    }
  }
} as const;

export const initialLocale = resolveLocale(browserLanguages());

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages,
});
