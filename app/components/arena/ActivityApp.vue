<script setup lang="ts">
// Activity log for your account. Everything shows YOUR name: check where it came from.
import type { World } from '@hackutd2026/shared/arena';
defineProps<{ world: World }>();
</script>

<template>
  <div class="wa">
    <div class="eyebrow eyebrow--cyan">Activity on your account</div>
    <p class="wa__note">Everything shows your name. Check where it came from.</p>
    <table class="wa__table wa__table--log">
      <thead>
        <tr>
          <th>When</th>
          <th>Who</th>
          <th>From</th>
          <th>What</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in [...world.activity].reverse()" :key="a.id">
          <td class="mono">{{ arenaTime(a.at) }}</td>
          <td>{{ a.actor }}</td>
          <td>
            {{ a.location }} <span class="wa__meta mono">{{ a.ip }}</span>
          </td>
          <td>{{ a.text }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
