<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from './supabase';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const plansHref = '/plans';
const authError = ref('');
const quotaReason = new URLSearchParams(window.location.search).get('reason') === 'anonymous_quota';

const signIn = async () => {
  authError.value = '';
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (!error) return;

  authError.value = error.message.includes('provider is not enabled')
    ? t('auth.errors.providerDisabled')
    : t('auth.errors.signInFailed');
};
</script>

<template>
  <div class="login-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
      <span class="dataset-badge">{{ t(quotaReason ? 'auth.badgeQuota' : 'auth.badgeDefault') }}</span>
    </header>
    <main class="container login-main">
      <section class="login-card">
        <template v-if="quotaReason">
          <p class="eyebrow">{{ t('auth.quotaEyebrow') }}</p>
          <h1>{{ t('auth.quotaTitle') }}</h1>
          <p>{{ t('auth.quotaText') }}</p>
        </template>
        <template v-else>
          <p class="eyebrow">{{ t('auth.defaultEyebrow') }}</p>
          <h1>{{ t('auth.defaultTitle') }}</h1>
          <p>{{ t('auth.defaultText') }}</p>
        </template>
        <button class="button login-primary" type="button" @click="signIn">{{ t('auth.google') }} <span>→</span></button>
        <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
        <a class="plans-link" :href="plansHref">{{ t('auth.plans') }}</a>
        <small>{{ t('auth.plansNote') }}</small>
      </section>
    </main>
  </div>
</template>
