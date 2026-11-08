<script setup lang="ts">
// Activity log for your account. Everything shows YOUR name: check where it came from.
import type { World } from '@hackutd2026/shared/arena';
defineProps<{ world: World }>();
</script>

<template>
  <table class="w-full text-left text-sm">
    <thead class="text-neutral-500">
      <tr>
        <th class="py-1">When</th>
        <th>Who</th>
        <th>From</th>
        <th>What</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="a in [...world.activity].reverse()" :key="a.id" class="border-t border-line">
        <td class="py-1 pr-3 whitespace-nowrap">{{ arenaTime(a.at) }}</td>
        <td class="pr-3">{{ a.actor }}</td>
        <td class="pr-3 whitespace-nowrap">
          {{ a.location }} <span class="font-mono text-xs text-neutral-500">{{ a.ip }}</span>
        </td>
        <td>{{ a.text }}</td>
      </tr>
    </tbody>
  </table>
</template>
