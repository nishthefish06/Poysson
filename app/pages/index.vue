<script setup lang="ts">
const auth = useAuth()
await navigateTo(auth.stage.value === 'verified' ? '/dashboard' : '/login', { replace: true })
</script>

<template>
  <div />
</template>
