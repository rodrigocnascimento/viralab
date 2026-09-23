import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_PROJECT);

export default defineConfig({
  build: {
    sourcemap: sentryEnabled ? 'hidden' : false,
  },
  plugins: [
    vue(),
    ...(sentryEnabled
      ? [sentryVitePlugin({
          org: process.env.SENTRY_ORG ?? 'viralab',
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: process.env.SENTRY_RELEASE ? { name: process.env.SENTRY_RELEASE } : undefined,
          sourcemaps: {
            filesToDeleteAfterUpload: ['./dist/**/*.map'],
          },
        })]
      : []),
  ],
});
