<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { supabase } from './supabase';

const error = ref('');

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const next = params.get('next') || '/explore';

  if (!code) {
    error.value = 'Missing OAuth authorization code.';
    return;
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    error.value = exchangeError.message;
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
        <p class="eyebrow">VIRALAB AUTH</p>
        <h1>{{ error ? 'Login failed.' : 'Finishing sign in…' }}</h1>
        <p v-if="error">{{ error }}</p>
      </section>
    </main>
  </div>
</template>
