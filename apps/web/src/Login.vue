<script setup lang="ts">
import { computed, ref } from 'vue';
import { supabase } from './supabase';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const pt = computed(() => locale.value === 'pt-BR');
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
  if (error) {
    authError.value = error.message.includes('provider is not enabled')
      ? (pt.value ? 'O login com Google ainda não está habilitado no servidor.' : 'Google sign-in is not enabled on the server yet.')
      : error.message;
  }
};
</script>

<template>
  <div class="login-shell">
    <header class="explorer-nav container">
      <a class="brand brand-logo" href="/" aria-label="Viralab home"><img src="/viralab-logo.svg" alt="Viralab"></a>
      <span class="dataset-badge">{{ quotaReason ? (pt ? 'DESBLOQUEIE +5 BUSCAS HOJE' : 'UNLOCK +5 SEARCHES TODAY') : (pt ? 'ENTRAR NO VIRALAB' : 'SIGN IN TO VIRALAB') }}</span>
    </header>
    <main class="container login-main">
      <section class="login-card">
        <template v-if="quotaReason">
          <p class="eyebrow">{{ pt ? 'LIMITE GRATUITO DE HOJE ATINGIDO' : 'TODAY’S FREE LIMIT REACHED' }}</p>
          <h1>{{ pt ? 'Entre e ganhe mais 5 buscas hoje.' : 'Sign in and get 5 more searches today.' }}</h1>
          <p>{{ pt ? 'Você usou as 10 consultas anônimas de hoje. Entre com Google para liberar um bônus de 5 consultas gratuitas no Explorer.' : 'You used today’s 10 anonymous searches. Sign in with Google to unlock 5 additional free Explorer searches.' }}</p>
        </template>
        <template v-else>
          <p class="eyebrow">{{ pt ? 'ENTRAR NO VIRALAB' : 'SIGN IN TO VIRALAB' }}</p>
          <h1>{{ pt ? 'Continue explorando sinais.' : 'Keep exploring signals.' }}</h1>
          <p>{{ pt ? 'Entre com sua conta para usar o Viralab. O login também libera um bônus de 5 consultas gratuitas depois do limite anônimo do dia.' : 'Sign in to use Viralab with your account. Login also unlocks 5 additional free searches after the anonymous daily allowance.' }}</p>
        </template>
        <button class="button login-primary" type="button" @click="signIn">{{ pt ? 'Entrar com Google' : 'Continue with Google' }} <span>→</span></button>
        <p v-if="authError" class="form-error" role="alert">{{ authError }}</p>
        <a class="plans-link" :href="plansHref">{{ pt ? 'Ver planos pagos' : 'View paid plans' }}</a>
        <small>{{ pt ? 'A página de planos será disponibilizada em uma próxima etapa.' : 'Plans will be available in a later release.' }}</small>
      </section>
    </main>
  </div>
</template>
