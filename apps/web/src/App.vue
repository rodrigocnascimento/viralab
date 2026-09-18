<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="site-shell">
    <header class="nav container">
      <a class="brand" href="#top" aria-label="Viralab home"><span class="brand-mark">V</span><span>vira<strong>lab</strong></span></a>
      <nav aria-label="Main navigation"><a href="#opportunities">{{ t('nav.opportunities') }}</a><a href="#how">{{ t('nav.how') }}</a><a href="#about">{{ t('nav.why') }}</a></nav>
      <a class="button button-small" href="#opportunities">{{ t('nav.explore') }}</a>
    </header>

    <main id="top">
      <section class="hero container">
        <div class="hero-copy">
          <p class="eyebrow">{{ t('hero.eyebrow') }}</p>
          <h1>{{ t('hero.title') }} <em>{{ t('hero.emphasis') }}</em></h1>
          <p class="lead">{{ t('hero.lead') }}</p>
          <div class="actions"><a class="button" href="#opportunities">{{ t('nav.explore') }} <span>→</span></a><a class="text-link" href="#how">{{ t('hero.how') }}</a></div>
          <p class="microcopy">{{ t('hero.microcopy') }}</p><p class="launch-note">{{ t('hero.launchNote') }}</p>
        </div>
        <div class="hero-visual" aria-label="Viralab opportunity preview">
          <div class="sun"></div>
          <div class="dog" aria-hidden="true"><span class="ear left"></span><span class="ear right"></span><span class="face"><i class="eye e1"></i><i class="eye e2"></i><i class="muzzle"></i></span></div>
          <div class="signal-card"><span class="signal-label">{{ t('hero.sample') }}</span><span class="signal-label">{{ t('hero.signal') }}</span><strong>+327%</strong><span>{{ t('hero.velocity') }}</span></div><div class="dots"></div>
        </div>
      </section>

      <section class="problem band"><div class="container problem-grid"><div><p class="eyebrow">{{ t('problem.eyebrow') }}</p><h2>{{ t('problem.title') }}</h2></div><div class="timeline"><span>{{ t('problem.early') }}</span><span>{{ t('problem.breakout') }}</span><span>{{ t('problem.viral') }}</span><div class="line"><i></i></div><p>{{ t('problem.note') }}</p></div></div></section>

      <section id="opportunities" class="section container">
        <p class="eyebrow">{{ t('opportunities.eyebrow') }}</p><h2>{{ t('opportunities.title') }}</h2>
        <div class="cards">
          <article><span class="card-index">01</span><div class="icon">↗</div><h3>{{ t('opportunities.breakoutTitle') }}</h3><p>{{ t('opportunities.breakoutText') }}</p><div class="metric"><b>18.4K</b><span>{{ t('opportunities.subscribers') }}</span><strong>+327%</strong></div></article>
          <article><span class="card-index">02</span><div class="icon">⌁</div><h3>{{ t('opportunities.outlierTitle') }}</h3><p>{{ t('opportunities.outlierText') }}</p><div class="metric"><b>12.8×</b><span>{{ t('opportunities.baseline') }}</span><strong>{{ t('opportunities.outlier') }}</strong></div></article>
          <article><span class="card-index">03</span><div class="icon">◎</div><h3>{{ t('opportunities.nicheTitle') }}</h3><p>{{ t('opportunities.nicheText') }}</p><div class="metric"><b>7</b><span>{{ t('opportunities.channelsRising') }}</span><strong>{{ t('opportunities.emerging') }}</strong></div></article>
        </div>
      </section>

      <section id="how" class="section intelligence"><div class="container intelligence-grid"><div><p class="eyebrow">{{ t('intelligence.eyebrow') }}</p><h2>{{ t('intelligence.title') }}</h2><p>{{ t('intelligence.text') }}</p><div class="flow"><span>YouTube Data API</span><i>→</i><span>Discovery</span><i>→</i><span>{{ t('intelligence.historical') }}</span><i>→</i><b>{{ t('intelligence.engine') }}</b></div></div>
        <div class="dashboard-card"><div class="dash-head"><span>{{ t('intelligence.breakout') }}</span><b>91 <small>/ 100</small></b></div><h3>Oficina do João</h3><p>Automotive · Brazil</p><div class="chart"><span style="height:18%"></span><span style="height:24%"></span><span style="height:29%"></span><span style="height:38%"></span><span style="height:58%"></span><span style="height:88%"></span></div><div class="dash-stats"><span><small>{{ t('intelligence.subscribers') }}</small><b>18.4K</b></span><span><small>{{ t('intelligence.growth') }}</small><b>+327%</b></span><span><small>{{ t('intelligence.velocity') }}</small><b>4.2×</b></span></div></div></div></section>

      <section id="about" class="moat container"><p class="eyebrow">{{ t('moat.eyebrow') }}</p><h2>{{ t('moat.title') }}<br><em>{{ t('moat.emphasis') }}</em></h2><p>{{ t('moat.text') }}</p></section>

      <section class="final-cta band"><div class="container final-cta-inner"><div><p class="eyebrow">{{ t('cta.eyebrow') }}</p><h2>{{ t('cta.title') }}</h2><p>{{ t('cta.text') }}</p></div><a class="button button-light" href="#opportunities">{{ t('cta.button') }} <span>→</span></a></div></section>
    </main>

    <footer><div class="container footer-inner"><a class="brand" href="#top"><span class="brand-mark">V</span><span>vira<strong>lab</strong></span></a><p>{{ t('footer.tagline') }}</p><span>© 2026 Viralab</span></div></footer>
  </div>
</template>
