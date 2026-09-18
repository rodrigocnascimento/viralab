import { createI18n } from 'vue-i18n';

export const messages = {
  en: {
    nav: { opportunities: 'Signals', how: 'How it works', why: 'Why Viralab', access: 'Get early access' },
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
      observed: 'Observed signal', subscribers: 'Subscribers', growth: 'Sample growth', velocity: 'Relative velocity'
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
      email: 'Work email', role: 'I am a…', niche: 'YouTube niche (optional)', submit: 'Join the waitlist',
      success: 'You’re on the list. We’ll send the first signals, not a newsletter.',
      privacy: 'No newsletter cadence. Early-access and product-signal updates only.'
    },
    footer: {
      tagline: 'YouTube Opportunity Intelligence', note: 'Viralab is YouTube opportunity intelligence — not a thumbnail maker, viral score app, or social agency.',
      development: 'Viralab is in active development. Signal models and historical tracking are evolving.',
      privacy: 'Privacy', terms: 'Terms'
    }
  }
} as const;

export const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages });
