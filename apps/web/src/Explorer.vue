<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase } from './supabase';

type Opportunity = {
  id: string; score: number; confidence: number; multiplier: number; baselineViewCount: string; observedViewCount: string; detectedAt: string;
  video: { providerId: string; title: string; thumbnailUrl: string | null; publishedAt: string | null };
  channel: { title: string; subscriberCount: string | null };
};

const { locale } = useI18n();
const pt = computed(() => locale.value === 'pt-BR');
const items = ref<Opportunity[]>([]);
const loading = ref(true);
const error = ref('');
const minScore = ref(40);
const freeQuota = ref<{ kind: 'anonymous' | 'signup_bonus'; limit: number; remaining: number; resetsAt: string } | null>(null);
const anonymousId = (() => {
  const key = 'viralab.anonymous-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
})();
const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'https://api.viralab.space';

const format = (value: string | null) => value === null ? '—' : new Intl.NumberFormat(pt.value ? 'pt-BR' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
const load = async () => {
  loading.value = true; error.value = '';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'x-viralab-anonymous-id': anonymousId };
    if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`;
    const response = await fetch(`${apiBase}/api/v1/opportunities?minScore=${minScore.value}&limit=50`, { headers });
    if (response.status === 429) {
      const body = await response.json().catch(() => null) as { error?: string; upgrade?: string } | null;
      if (body?.upgrade === 'sign_in') {
        window.location.replace('/login?reason=anonymous_quota');
        return;
      }
      if (body?.error === 'free_quota_exhausted') {
        error.value = pt.value ? 'Seu bônus de cadastro terminou. As consultas anônimas voltam no próximo ciclo diário.' : 'Your signup bonus is finished. Anonymous searches return on the next daily cycle.';
        return;
      }
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json() as { items: Opportunity[]; meta?: { freeQuota?: { kind: 'anonymous' | 'signup_bonus'; limit: number; remaining: number; resetsAt: string } } };
    items.value = body.items;
    freeQuota.value = body.meta?.freeQuota ?? null;
  } catch {
    error.value = pt.value ? 'Não foi possível carregar os sinais agora.' : 'Unable to load signals right now.';
  } finally { loading.value = false; }
};
onMounted(load);
</script>

<template>
  <div class="explorer-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
      <span class="dataset-badge">{{ freeQuota ? (freeQuota.kind === 'signup_bonus' ? `${freeQuota.remaining}/${freeQuota.limit} ${pt ? 'BUSCAS BÔNUS DO CADASTRO' : 'SIGNUP BONUS SEARCHES LEFT'}` : `${freeQuota.remaining}/${freeQuota.limit} ${pt ? 'CONSULTAS GRÁTIS HOJE' : 'FREE QUERIES LEFT TODAY'}`) : (pt ? 'DATASET VIRALAB · YOUTUBE' : 'VIRALAB DATASET · YOUTUBE') }}</span>
    </header>
    <main class="container explorer-main">
      <div class="explorer-heading">
        <div><p class="eyebrow">{{ pt ? 'OPPORTUNITY EXPLORER' : 'OPPORTUNITY EXPLORER' }}</p><h1>{{ pt ? 'Sinais antes do consenso.' : 'Signals before consensus.' }}</h1><p>{{ pt ? 'Outliers calculados sobre o dataset do Viralab. Abrir esta tela não consulta o YouTube.' : 'Outliers computed from Viralab’s dataset. Opening this screen does not query YouTube.' }}</p></div>
        <label class="score-filter">{{ pt ? 'Score mínimo' : 'Minimum score' }} <input v-model.number="minScore" type="range" min="0" max="90" step="10" @change="load"><strong>{{ minScore }}</strong></label>
      </div>

      <div v-if="loading" class="explorer-state">{{ pt ? 'Calculando sinais…' : 'Loading signals…' }}</div>
      <div v-else-if="error" class="explorer-state">{{ error }} <button @click="load">{{ pt ? 'Tentar novamente' : 'Retry' }}</button></div>
      <div v-else-if="items.length === 0" class="explorer-state">{{ pt ? 'Nenhum sinal atingiu este score ainda. O dataset continua sendo atualizado.' : 'No signals reach this score yet. The dataset is still being refreshed.' }}</div>
      <section v-else class="opportunity-list" aria-live="polite">
        <article v-for="item in items" :key="item.id" class="opportunity-row">
          <img v-if="item.video.thumbnailUrl" :src="item.video.thumbnailUrl" :alt="item.video.title">
          <div class="opportunity-copy"><span class="signal-label">VIDEO OUTLIER</span><h2>{{ item.video.title }}</h2><p>{{ item.channel.title }} · {{ format(item.channel.subscriberCount) }} {{ pt ? 'inscritos' : 'subscribers' }}</p><a :href="`https://www.youtube.com/watch?v=${item.video.providerId}`" target="_blank" rel="noopener">{{ pt ? 'Abrir vídeo ↗' : 'Open video ↗' }}</a></div>
          <div class="opportunity-metrics"><span><small>SCORE</small><b>{{ item.score }}</b></span><span><small>{{ pt ? 'MULTIPLICADOR' : 'MULTIPLIER' }}</small><b>{{ item.multiplier.toFixed(1) }}×</b></span><span><small>{{ pt ? 'VIEWS / BASE' : 'VIEWS / BASELINE' }}</small><b>{{ format(item.observedViewCount) }} / {{ format(item.baselineViewCount) }}</b></span><span><small>{{ pt ? 'CONFIANÇA' : 'CONFIDENCE' }}</small><b>{{ item.confidence }}%</b></span></div>
        </article>
      </section>
      <p class="model-note">{{ pt ? 'Modelo MVP: views do vídeo comparadas à média histórica de views por vídeo do canal. O histórico temporal da Case 07 substituirá essa baseline por janelas observadas.' : 'MVP model: video views compared with the channel’s lifetime average views per video. Case 07 temporal history will replace this baseline with observed windows.' }}</p>
    </main>
  </div>
</template>
