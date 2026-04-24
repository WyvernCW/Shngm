import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// Simple Hash Router Implementation
const routes = {
  '': 'Home',
  'all': 'All',
  'trending': 'Trending',
  'library': 'Library',
  'series': 'Series',
  'read': 'Reader',
  'search': 'Search'
};

const app = createApp(App);
app.mount('#app');
