<script setup lang="ts">
import { SpacetimeDBProvider } from 'spacetimedb/vue';
import { DbConnection } from '~/module_bindings';
import { readToken, saveToken } from '~/utils/token';

const config = useRuntimeConfig().public;

const connectionBuilder = DbConnection.builder()
  .withUri(config.spacetimeUrl)
  .withDatabaseName(config.spacetimeDb)
  .withToken(readToken(config.spacetimeUrl, config.spacetimeDb))
  .onConnect((_conn, _identity, token) => saveToken(config.spacetimeUrl, config.spacetimeDb, token));
</script>

<template>
  <SpacetimeDBProvider :connection-builder="connectionBuilder">
    <SessionGate>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </SessionGate>
  </SpacetimeDBProvider>
</template>
