<template>
  <ion-tabs>
    <ion-router-outlet :key="$route.fullPath"></ion-router-outlet>

    <ion-tab-bar slot="bottom">
      <ion-tab-button tab="dashboard" href="/dashboard">
        <ion-icon :icon="gridOutline"></ion-icon>
        <ion-label>Dashboard</ion-label>
      </ion-tab-button>

      <ion-tab-button tab="tickets" href="/tickets">
        <ion-icon :icon="listOutline"></ion-icon>
        <ion-label>Tickets</ion-label>
      </ion-tab-button>

      <ion-tab-button tab="settings" href="/settings">
        <ion-icon :icon="settingsOutline"></ion-icon>
        <ion-label>Settings</ion-label>
      </ion-tab-button>
    </ion-tab-bar>
  </ion-tabs>
</template>

<script setup lang="ts">
import {
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel
} from '@ionic/vue';
import { gridOutline, listOutline, settingsOutline } from 'ionicons/icons';
</script>
