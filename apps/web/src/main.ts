import { createApp } from 'vue';
import App from './App.vue';
import Explorer from './Explorer.vue';
import Login from './Login.vue';
import AuthCallback from './AuthCallback.vue';
import { i18n, initialLocale } from './i18n';
import { initSentry, Sentry } from './sentry';
import './style.css';

document.documentElement.lang = initialLocale;

const Root = window.location.pathname.startsWith('/auth/callback')
  ? AuthCallback
  : window.location.pathname.startsWith('/login')
    ? Login
    : window.location.pathname.startsWith('/explore')
      ? Explorer
      : App;

const renderBootFailure = () => {
  const target = document.querySelector<HTMLElement>('#app');
  if (!target || target.dataset.runtimeFailure === 'true') return;

  target.dataset.runtimeFailure = 'true';
  target.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff4df;color:#33251d;font-family:Inter,system-ui,sans-serif">
      <section style="max-width:620px;padding:32px;background:#fffaf0;border:1px solid #dfcdb7">
        <p style="margin:0 0 12px;font-size:11px;font-weight:800;letter-spacing:.14em;color:#8c6039">VIRALAB</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:500">Não foi possível carregar a aplicação.</h1>
        <p style="line-height:1.6;color:#756151">Atualize a página. Se o problema continuar, o erro já foi registrado no console para diagnóstico.</p>
        <button onclick="window.location.reload()" style="border:0;background:#33251d;color:white;padding:12px 16px;font-weight:700;cursor:pointer">Tentar novamente</button>
      </section>
    </main>
  `;
};

window.addEventListener('error', (event) => {
  console.error('[viralab:web:error]', event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[viralab:web:unhandledrejection]', event.reason);
});

try {
  const app = createApp(Root);
  const sentryEnabled = initSentry(app);
  const sentryVueErrorHandler = app.config.errorHandler;
  let appMounted = false;

  app.config.errorHandler = (error, instance, info) => {
    sentryVueErrorHandler?.(error, instance, info);
    if (sentryEnabled) {
      Sentry.captureException(error, {
        contexts: {
          vue: { info },
        },
      });
    }
    console.error('[viralab:web:vue-error]', { error, instance, info });
    if (!appMounted) {
      renderBootFailure();
    }
  };

  app.use(i18n);
  app.mount('#app');
  appMounted = true;
} catch (error) {
  Sentry.captureException(error);
  console.error('[viralab:web:bootstrap-error]', error);
  renderBootFailure();
}
