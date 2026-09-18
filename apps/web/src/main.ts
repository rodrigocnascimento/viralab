import { createApp } from 'vue';
import App from './App.vue';
import Explorer from './Explorer.vue';
import Login from './Login.vue';
import AuthCallback from './AuthCallback.vue';
import { i18n, initialLocale } from './i18n';
import './style.css';

document.documentElement.lang = initialLocale;

const Root = window.location.pathname.startsWith('/auth/callback') ? AuthCallback : window.location.pathname.startsWith('/login') ? Login : window.location.pathname.startsWith('/explore') ? Explorer : App;
createApp(Root).use(i18n).mount('#app');
