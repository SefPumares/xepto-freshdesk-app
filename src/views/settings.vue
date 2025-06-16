<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label>Theme</ion-label>
          <ion-select v-model="selectedTheme" @ionChange="applyTheme">
            <ion-select-option value="light">Light</ion-select-option>
            <ion-select-option value="dark">Dark</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-label>App Version</ion-label>
          <ion-note slot="end">0.0.1
          </ion-note>
        </ion-item>

        <ion-item>
          <ion-label>Developers</ion-label>
          <ion-note slot="end">Xepto Education Developers</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({
  name: 'AppSettings'
});

const selectedTheme = ref('light');

const applyTheme = () => {
  document.body.classList.remove('light', 'dark');
  document.body.classList.add(selectedTheme.value);
};
</script>

