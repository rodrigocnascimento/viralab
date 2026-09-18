<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const menuOpen = ref(false);
const submitted = ref(false);
const email = ref('');
const role = ref('operator');
const niche = ref('');

function submitWaitlist() {
  const subject = encodeURIComponent('Viralab early access');
  const body = encodeURIComponent(`Email: ${email.value}\nRole: ${role.value}\nNiche: ${niche.value || '—'}`);
  submitted.value = true;
  window.location.href = `mailto:hello@viralab.space?subject=${subject}&body=${body}`;
}
</script>

<template>
<div class="site-shell">
<header class="nav container">
  <a class="brand" href="#top" aria-label="Viralab home"><span class="brand-mark">V</span><span>vira<strong>lab</strong></span></a>
  <nav :class="{ open: menuOpen }" aria-label="Main navigation"><a href="#signals" @click="menuOpen=false">{{ t('nav.opportunities') }}</a><a href="#how" @click="menuOpen=false">{{ t('nav.how') }}</a><a href="#about" @click="menuOpen=false">{{ t('nav.why') }}</a></nav>
  <a class="button button-small" href="#access">{{ t('nav.access') }}</a>
  <button class="menu-toggle" :aria-expanded="menuOpen" aria-label="Toggle navigation" @click="menuOpen=!menuOpen"><span></span><span></span></button>
</header>

<main id="top">
<section class="hero container">
 <div class="hero-copy"><p class="eyebrow">{{t('hero.eyebrow')}}</p><h1>{{t('hero.title')}} <em>{{t('hero.emphasis')}}</em></h1><p class="lead">{{t('hero.lead')}}</p>
 <div class="actions"><a class="button" href="#access">{{t('hero.primary')}} <span>→</span></a><a class="text-link" href="#sample">{{t('hero.secondary')}} ↓</a></div><p class="microcopy">{{t('hero.microcopy')}}</p></div>
 <div class="hero-visual" aria-label="A Viralab sample signal emerging before the market sees it"><div class="sun"></div><div class="dog" aria-hidden="true"><span class="ear left"></span><span class="ear right"></span><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="muzzle"></i></span></div><div class="signal-card"><span class="signal-label">{{t('hero.sample')}}</span><span class="signal-label">{{t('hero.signal')}}</span><strong>+327%</strong><span>{{t('hero.velocity')}}</span></div><div class="dots"></div></div>
</section>

<section id="sample" class="sample-section"><div class="container sample-grid"><div><p class="eyebrow">{{t('sample.eyebrow')}}</p><h2>{{t('sample.title')}}</h2><p>{{t('sample.note')}}</p></div><article class="dashboard-card"><div class="dash-head"><span>{{t('sample.observed')}}</span><b>91 <small>/ 100</small></b></div><h3>Oficina do João</h3><p>{{t('sample.context')}}</p><div class="chart"><span style="height:18%"></span><span style="height:24%"></span><span style="height:29%"></span><span style="height:38%"></span><span style="height:58%"></span><span style="height:88%"></span></div><div class="dash-stats"><span><small>{{t('sample.subscribers')}}</small><b>18.4K</b></span><span><small>{{t('sample.growth')}}</small><b>+327%</b></span><span><small>{{t('sample.velocity')}}</small><b>4.2×</b></span></div><span class="sample-disclaimer">Illustrative sample · not a live recommendation</span></article></div></section>

<section class="problem band"><div class="container problem-grid"><div><p class="eyebrow">{{t('problem.eyebrow')}}</p><h2>{{t('problem.title')}}</h2></div><div class="timeline"><span>{{t('problem.early')}}</span><span>{{t('problem.breakout')}}</span><span>{{t('problem.viral')}}</span><div class="line"><i></i></div><p>{{t('problem.note')}}</p></div></div></section>

<section id="signals" class="section container"><p class="eyebrow">{{t('opportunities.eyebrow')}}</p><h2>{{t('opportunities.title')}}</h2><div class="cards">
<article><span class="card-index">01 · {{t('opportunities.sample')}}</span><div class="icon">↗</div><h3>{{t('opportunities.breakoutTitle')}}</h3><p>{{t('opportunities.breakoutText')}}</p><p class="so-what">{{t('opportunities.breakoutAction')}}</p><div class="metric"><b>18.4K</b><span>{{t('opportunities.subscribers')}}</span><strong>+327%</strong></div></article>
<article><span class="card-index">02 · {{t('opportunities.sample')}}</span><div class="icon">⌁</div><h3>{{t('opportunities.outlierTitle')}}</h3><p>{{t('opportunities.outlierText')}}</p><p class="so-what">{{t('opportunities.outlierAction')}}</p><div class="metric"><b>12.8×</b><span>{{t('opportunities.baseline')}}</span><strong>{{t('opportunities.outlier')}}</strong></div></article>
<article><span class="card-index">03 · {{t('opportunities.sample')}}</span><div class="icon">◎</div><h3>{{t('opportunities.nicheTitle')}}</h3><p>{{t('opportunities.nicheText')}}</p><p class="so-what">{{t('opportunities.nicheAction')}}</p><div class="metric"><b>7</b><span>{{t('opportunities.channelsRising')}}</span><strong>{{t('opportunities.emerging')}}</strong></div></article>
</div></section>

<section id="how" class="section intelligence"><div class="container intelligence-grid"><div><p class="eyebrow">{{t('intelligence.eyebrow')}}</p><h2>{{t('intelligence.title')}}</h2><p>{{t('intelligence.text')}}</p></div><div class="flow flow-large"><span>YouTube Data API</span><i>→</i><span>Discovery</span><i>→</i><span>{{t('intelligence.historical')}}</span><i>→</i><b>{{t('intelligence.engine')}}</b></div></div></section>

<section class="section score-section container"><p class="eyebrow">{{t('score.eyebrow')}}</p><h2>{{t('score.title')}}</h2><div class="score-grid"><article><b>01</b><h3>{{t('score.baseline')}}</h3><p>{{t('score.baselineText')}}</p></article><article><b>02</b><h3>{{t('score.velocity')}}</h3><p>{{t('score.velocityText')}}</p></article><article><b>03</b><h3>{{t('score.confidence')}}</h3><p>{{t('score.confidenceText')}}</p></article></div><p class="method-note">{{t('score.note')}}</p></section>

<section id="about" class="moat container"><p class="eyebrow">{{t('moat.eyebrow')}}</p><h2>{{t('moat.title')}}<br><em>{{t('moat.emphasis')}}</em></h2><p>{{t('moat.text')}}</p></section>

<section id="access" class="access band"><div class="container access-grid"><div><p class="eyebrow">{{t('access.eyebrow')}}</p><h2>{{t('access.title')}}</h2><p>{{t('access.text')}}</p></div><form class="waitlist" @submit.prevent="submitWaitlist"><template v-if="!submitted"><label>{{t('access.email')}}<input v-model="email" required type="email" autocomplete="email" placeholder="you@company.com"></label><div class="form-row"><label>{{t('access.role')}}<select v-model="role"><option value="operator">Channel operator / MCN</option><option value="researcher">Researcher / analyst</option><option value="creator">Serious creator</option></select></label><label>{{t('access.niche')}}<input v-model="niche" type="text" placeholder="Automotive, finance…"></label></div><button class="button button-light" type="submit">{{t('access.submit')}} →</button><small>{{t('access.privacy')}}</small></template><p v-else class="success">{{t('access.success')}}</p></form></div></section>
</main>

<footer><div class="container footer-grid"><div><a class="brand" href="#top"><span class="brand-mark">V</span><span>vira<strong>lab</strong></span></a><p>{{t('footer.tagline')}}</p></div><p>{{t('footer.note')}}</p><div class="footer-links"><a href="mailto:hello@viralab.space">hello@viralab.space</a><a href="/privacy.html">{{t('footer.privacy')}}</a><a href="/terms.html">{{t('footer.terms')}}</a></div></div><div class="container footer-bottom"><span>© 2026 Viralab</span><span>{{t('footer.development')}}</span></div></footer>
</div>
</template>
