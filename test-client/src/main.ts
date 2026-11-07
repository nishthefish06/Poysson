import { createApp, h } from 'vue';
import { SpacetimeDBProvider } from 'spacetimedb/vue';
import { DbConnection } from './module_bindings';
import { SPACETIME_DB, SPACETIME_URL, readToken, saveToken } from './config';
import App from './App.vue';
import './style.css';

const connectionBuilder = DbConnection.builder()
  .withUri(SPACETIME_URL)
  .withDatabaseName(SPACETIME_DB)
  .withToken(readToken())
  .onConnect((_conn, _identity, token) => saveToken(token));

createApp({
  render: () => h(SpacetimeDBProvider, { connectionBuilder }, { default: () => h(App) }),
}).mount('#app');
