import { computed, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { EKeymapScope } from '../keymap/keymap.model';
import { resolveCommandShortcuts } from '../keymap/resolve-command-shortcuts';
import { EAppRouteName } from '../router/app-route.model';
import { useStudioUiStore } from '../use-studio-ui-store';
import {
  EAppCommand,
  type TCommandAvailability,
  type TCommandHandler,
} from './app-command.model';
import type { TAppCommands } from './app-command-context';
import { isStudioCommand, type TStudioCommand } from './app-command-routing';
import { COMMAND_DEFINITIONS } from './command-definitions';

export function useAppCommands(): TAppCommands {
  const route = useRoute();
  const router = useRouter();
  const studioUiStore = useStudioUiStore();
  const paletteOpen = ref(false);
  const studioHandler = shallowRef<TCommandHandler<TStudioCommand> | null>(
    null,
  );
  const isStudioActive = computed(
    () => route.name === EAppRouteName.Studio && studioHandler.value !== null,
  );
  const keymapContext = computed(() => ({
    scope: !isStudioActive.value
      ? null
      : studioUiStore.isZenMode
        ? EKeymapScope.StudioZen
        : EKeymapScope.Studio,
  }));
  const resolvedCommands = computed(() =>
    COMMAND_DEFINITIONS.map((definition) => ({
      ...definition,
      ...getAvailability(definition.id),
      shortcuts: resolveCommandShortcuts({
        command: definition.id,
        context: keymapContext.value,
      }),
    })),
  );

  function attachStudioHandler(handler: TCommandHandler<TStudioCommand>) {
    studioHandler.value = handler;
    return () => {
      if (studioHandler.value === handler) studioHandler.value = null;
    };
  }

  function getAvailability(command: EAppCommand): TCommandAvailability {
    if (isStudioCommand(command)) {
      if (!isStudioActive.value || !studioHandler.value) {
        return { enabled: false, disabledReason: 'Available in Studio' };
      }
      return studioHandler.value.getAvailability(command);
    }
    return { enabled: true };
  }

  function execute(command: EAppCommand): boolean {
    if (!getAvailability(command).enabled) return false;

    if (isStudioCommand(command)) {
      return studioHandler.value?.execute(command) ?? false;
    }

    switch (command) {
      case EAppCommand.OpenCommandPalette:
        paletteOpen.value = true;
        return true;
      case EAppCommand.GoToStudio:
        void router.push({ name: EAppRouteName.Studio });
        return true;
      case EAppCommand.GoToSettings:
        void router.push({ name: EAppRouteName.Settings });
        return true;
    }
  }

  function preparePaletteCommand(command: EAppCommand) {
    if (!getAvailability(command).enabled) return null;
    const expectedHandler = studioHandler.value;
    const expectedRoute = route.fullPath;

    // Dismissal is deferred; never execute a selection against a replacement page.
    return () => {
      if (route.fullPath !== expectedRoute) return false;
      if (isStudioCommand(command) && studioHandler.value !== expectedHandler) {
        return false;
      }
      return execute(command);
    };
  }

  return {
    paletteOpen,
    resolvedCommands,
    keymapContext,
    getAvailability,
    execute,
    attachStudioHandler,
    preparePaletteCommand,
  };
}
