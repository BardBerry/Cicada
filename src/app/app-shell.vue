<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { nextTick, provide } from 'vue';
import { RouterView } from 'vue-router';

import AppNavigation from './app-navigation.vue';
import type { EAppCommand } from './commands/app-command.model';
import { APP_COMMANDS_KEY } from './commands/app-command-context';
import CommandPalette from './commands/command-palette.vue';
import { useAppCommands } from './commands/use-app-commands';
import { useKeymap } from './keymap/use-keymap';
import { useStudioUiStore } from './use-studio-ui-store';

const studioUiStore = useStudioUiStore();
const { isChromaMode } = storeToRefs(studioUiStore);
const commands = useAppCommands();
const { paletteOpen, resolvedCommands } = commands;
let pendingCommand: (() => boolean) | null = null;

provide(APP_COMMANDS_KEY, commands);
useKeymap({
  getContext: () => commands.keymapContext.value,
  onCommand: commands.execute,
});

function selectPaletteCommand(command: EAppCommand) {
  pendingCommand = commands.preparePaletteCommand(command);
  if (pendingCommand) paletteOpen.value = false;
}

function handlePaletteCloseFocus(event: Event) {
  const execute = pendingCommand;
  pendingCommand = null;
  if (!execute) return;
  event.preventDefault();
  // Let the modal release focus ownership before Studio requests input focus.
  void nextTick(() => {
    if (!paletteOpen.value) execute();
  });
}
</script>

<template>
  <div class="app-shell">
    <div v-if="!isChromaMode" class="brand">Cicada</div>

    <AppNavigation v-if="!isChromaMode" class="navigation" />

    <main class="main">
      <RouterView />
    </main>
    <CommandPalette
      v-model:open="paletteOpen"
      :commands="resolvedCommands"
      @select="selectPaletteCommand"
      @close-focus="handlePaletteCloseFocus"
    />
  </div>
</template>

<style scoped>
.app-shell {
  --shell-inset: clamp(12px, 3vw, 28px);
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-background);
}

.brand,
.navigation {
  position: absolute;
  z-index: var(--z-index-1);
  left: var(--shell-inset);
}

.brand {
  top: var(--shell-inset);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.04em;
  pointer-events: none;
}

.navigation {
  top: 50%;
  transform: translateY(-50%);
}

.main {
  position: relative;
  z-index: var(--z-index-0);
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
