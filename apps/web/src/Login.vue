<script setup lang="ts">
import { computed, ref } from 'vue';
import { supabase } from './supabase';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const pt = computed(() => locale.value === 'pt-BR');
const plansHref = '/plans';
const authError = ref('');
const signIn = async () => {
  authError.value = '';
  const redirectTo = `${window.location.origin}/auth/callback?next=/explore`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) authError.value = error.message;
};
</script>

<template>
  <div class="login-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
      <span class="dataset-badge">{{ pt ? 'CONTINUE EXPLORANDO' : 'KEEP EXPLORING' }}</span>
    </header>
    <main class="container login-main">
      <section class="login-card">
        <p class="eyebrow">{{ pt ? 'LIMITE GRATUITO ATINGIDO' : 'FREE EXPLORATION LIMIT REACHED' }}</p>
        <h1>{{ pt ? 'Continue de onde parou.' : 'Continue where you left off.' }}</h1>
        <p>{{ pt ? 'Entre para continuar explorando sinais do dataset Viralab sem o limite anônimo.' : 'Sign in to keep exploring Viralab dataset signals without the anonymous limit.' }}</p>
        <button class="button login-primary" type="button" @click="signIn">{{ pt ? 'Entrar com Google' : 'Continue with Google' }} <span>→</span></button>
        <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
        <a class="plans-link" :href="plansHref">{{ pt ? 'Ver planos pagos' : 'View paid plans' }}</a>
        <small>{{ pt ? 'A página de planos será disponibilizada em uma próxima etapa.' : 'Plans will be available in a later release.' }}</small>
      </section>
    </main>
  </div>
</template>
