import { inject, type InjectionKey, provide } from 'vue';

const overlayDepthKey: InjectionKey<number> = Symbol('ui-overlay-depth');

export function useUiOverlayLayer() {
  const depth = inject(overlayDepthKey, 0) + 1;
  provide(overlayDepthKey, depth);

  // Portals keep Vue ancestry, so a nested surface stays above its parent.
  return { zIndex: `calc(var(--z-index-3) + ${depth})` };
}
