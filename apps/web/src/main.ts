import { createApp } from 'vue';
import App from './App.vue';
import Explorer from './Explorer.vue';
import { i18n } from './i18n';
import './style.css';

const Root = window.location.pathname.startsWith('/explore') ? Explorer : App;
createApp(Root).use(i18n).mount('#app');
