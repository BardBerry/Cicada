// Injected only by the opt-in native-export-verification build.
(() => {
  function measureLayout() {
    return {
      viewport: [innerWidth, innerHeight],
      laneWidth: document.querySelector('.lane').offsetWidth,
      gap: getComputedStyle(document.querySelector('.history')).gap,
      items: [...document.querySelectorAll('.item')].map((item) => {
        const text = item.querySelector('.text');
        const rect = item.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(text);
        return {
          text: text.textContent,
          rect: [rect.x, rect.y, rect.width, rect.height],
          lines: [...range.getClientRects()].map((line) => [
            line.x,
            line.y,
            line.width,
            line.height,
          ]),
          transform: getComputedStyle(item).transform,
        };
      }),
    };
  }

  window.cicadaExportVerify = true;
  window.cicadaExportMeasureLayout = measureLayout;
})();
