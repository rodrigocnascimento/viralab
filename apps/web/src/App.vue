<script setup lang="ts">
import { onMounted, ref } from 'vue';

type Health = { status: string; service: string; dependencies: { database: string } };
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const health = ref<Health | null>(null);
const error = ref('');

onMounted(async () => {
  try {
    const response = await fetch(`${apiUrl}/health`);
    health.value = await response.json() as Health;
    if (!response.ok) error.value = 'API is reachable, but a dependency is unavailable.';
  } catch {
    error.value = 'Could not reach the Viralab API.';
  }
});
</script>

<template>
  <main>
    <p class="eyebrow">YOUTUBE OPPORTUNITY INTELLIGENCE</p>
    <h1>Viralab</h1>
    <p class="lead">Find YouTube opportunities before they become obvious.</p>
    <section class="status">
      <strong>Foundation status</strong>
      <p v-if="health">API: {{ health.status }} · PostgreSQL: {{ health.dependencies.database }}</p>
      <p v-else-if="error">{{ error }}</p>
      <p v-else>Checking API…</p>
    </section>
  </main>
</template>
