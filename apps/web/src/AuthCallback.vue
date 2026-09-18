<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase } from './supabase';

const { t } = useI18n();
const error = ref('');

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const next = params.get('next') || '/explore';

  if (!code) {
    error.value = t('auth.callback.missingCode');
    return;
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    error.value = t('auth.errors.signInFailed');
    return;
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/explore';
  window.location.replace(safeNext);
});
</script>

<template>
  <div class="login-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
    </header>
    <main class="container login-main">
      <section class="login-card">
        <p class="eyebrow">{{ t('auth.callback.eyebrow') }}</p>
        <h1>{{ error ? t('auth.callback.failed') : t('auth.callback.finishing') }}</h1>
        <p v-if="error">{{ error }}</p>
      </section>
    </main>
  </div>
</template>
