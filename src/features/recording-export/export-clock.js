// Installed only in the isolated export document, before Vue/Motion imports.
// Native completion must precede further simulation: Motion finalizes values
// and presence promises in onfinish, not the native `finished` promise.
{
  let nowMs = 1000;
  let nextId = 1;
  const callbacks = new Map();
  const nativeStarts = new WeakMap();
  const originalAnimate = Element.prototype.animate;

  Object.defineProperty(performance, 'now', { value: () => nowMs });
  window.requestAnimationFrame = (callback) => {
    const id = nextId++;
    callbacks.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => callbacks.delete(id);

  Element.prototype.animate = function (...args) {
    const animation = originalAnimate.apply(this, args);
    nativeStarts.set(animation, nowMs);
    animation.pause();
    return animation;
  };

  async function sampleNativeAnimations() {
    const completions = [];
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'finished') continue;
      if (!nativeStarts.has(animation)) nativeStarts.set(animation, nowMs);
      const elapsedMs = nowMs - nativeStarts.get(animation);
      animation.pause();
      animation.currentTime = elapsedMs;
      const endTime = animation.effect?.getComputedTiming().endTime;
      if (
        typeof endTime === 'number' &&
        Number.isFinite(endTime) &&
        elapsedMs >= endTime
      ) {
        completions.push(
          new Promise((resolve) => {
            function settled() {
              animation.removeEventListener('finish', settled);
              animation.removeEventListener('cancel', settled);
              resolve();
            }
            animation.addEventListener('finish', settled);
            animation.addEventListener('cancel', settled);
          }),
        );
        animation.finish();
      }
    }
    await Promise.all(completions);
  }

  async function tick(timestampMs) {
    nowMs = timestampMs;
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(nowMs);
    await Promise.resolve();
    await sampleNativeAnimations();
    await Promise.resolve();
  }

  Object.assign(window, {
    cicadaExportClock: {
      async advanceTo(timestampMs) {
        if (timestampMs < nowMs) throw new Error('Export clock cannot rewind');
        while (nowMs + 1000 / 60 < timestampMs) await tick(nowMs + 1000 / 60);
        await tick(timestampMs);
      },
    },
  });
}
