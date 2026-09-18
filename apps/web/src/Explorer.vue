<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase } from './supabase';

type Opportunity = {
  id: string; score: number; confidence: number; multiplier: number; baselineViewCount: string; observedViewCount: string; detectedAt: string;
  video: { providerId: string; title: string; thumbnailUrl: string | null; publishedAt: string | null };
  channel: { title: string; subscriberCount: string | null };
};

const { locale, t } = useI18n();
const items = ref<Opportunity[]>([]);
const loading = ref(true);
const error = ref('');
const minScore = ref(40);
const freeQuota = ref<
  | { kind: 'anonymous'; limit: number; remaining: number; resetsAt: string }
  | { kind: 'signup_bonus'; limit: number; remaining: number }
  | null
>(null);

const anonymousId = (() => {
  const key = 'viralab.anonymous-id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
})();

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'https://api.viralab.space';

const quotaBadge = computed(() => {
  if (!freeQuota.value) return t('explorer.badgeDataset');
  const params = { remaining: freeQuota.value.remaining, limit: freeQuota.value.limit };
  return freeQuota.value.kind === 'signup_bonus'
    ? t('explorer.badgeSignup', params)
    : t('explorer.badgeAnonymous', params);
});

const format = (value: string | null) => value === null
  ? '—'
  : new Intl.NumberFormat(locale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));

const load = async () => {
  loading.value = true;
  error.value = '';

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
        error.value = t('explorer.bonusExhausted');
        return;
      }
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const body = await response.json() as {
      items: Opportunity[];
      meta?: {
        freeQuota?:
          | { kind: 'anonymous'; limit: number; remaining: number; resetsAt: string }
          | { kind: 'signup_bonus'; limit: number; remaining: number };
      };
    };

    items.value = body.items;
    freeQuota.value = body.meta?.freeQuota ?? null;
  } catch {
    error.value = t('explorer.loadError');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <div class="explorer-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
      <span class="dataset-badge">{{ quotaBadge }}</span>
    </header>

    <main class="container explorer-main">
      <div class="explorer-heading">
        <div>
          <p class="eyebrow">{{ t('explorer.eyebrow') }}</p>
          <h1>{{ t('explorer.title') }}</h1>
          <p>{{ t('explorer.intro') }}</p>
        </div>

        <label class="score-filter">
          {{ t('explorer.minScore') }}
          <input v-model.number="minScore" type="range" min="0" max="90" step="10" @change="load">
          <strong>{{ minScore }}</strong>
        </label>
      </div>

      <div v-if="loading" class="explorer-state">{{ t('explorer.loading') }}</div>
      <div v-else-if="error" class="explorer-state">
        {{ error }} <button @click="load">{{ t('explorer.retry') }}</button>
      </div>
      <div v-else-if="items.length === 0" class="explorer-state">{{ t('explorer.empty') }}</div>

      <section v-else class="opportunity-list" aria-live="polite">
        <article v-for="item in items" :key="item.id" class="opportunity-row">
          <img v-if="item.video.thumbnailUrl" :src="item.video.thumbnailUrl" :alt="item.video.title">

          <div class="opportunity-copy">
            <span class="signal-label">VIDEO OUTLIER</span>
            <h2>{{ item.video.title }}</h2>
            <p>{{ item.channel.title }} · {{ format(item.channel.subscriberCount) }} {{ t('explorer.subscribers') }}</p>
            <a :href="`https://www.youtube.com/watch?v=${item.video.providerId}`" target="_blank" rel="noopener">{{ t('explorer.openVideo') }}</a>
          </div>

          <div class="opportunity-metrics">
            <span><small>SCORE</small><b>{{ item.score }}</b></span>
            <span><small>{{ t('explorer.multiplier') }}</small><b>{{ item.multiplier.toFixed(1) }}×</b></span>
            <span><small>{{ t('explorer.viewsBaseline') }}</small><b>{{ format(item.observedViewCount) }} / {{ format(item.baselineViewCount) }}</b></span>
            <span><small>{{ t('explorer.confidence') }}</small><b>{{ item.confidence }}%</b></span>
          </div>
        </article>
      </section>

      <p class="model-note">{{ t('explorer.modelNote') }}</p>
    </main>
  </div>
</template>
