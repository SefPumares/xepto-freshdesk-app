<template>
  <ion-app class="app-gradient">
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
</script>

<style>
.app-gradient {
  background: var(--app-gradient-bg);
  color: white;
}

ion-content {
  --background: transparent;
  background: var(--app-gradient-bg);
  color: #ffffff;
}
</style>