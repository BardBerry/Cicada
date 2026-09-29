<script setup lang="ts">
type TProps = {
  text: string;
  active?: boolean;
  showCaret?: boolean;
};
const props = defineProps<TProps>();
</script>

<template>
  <div class="caption" :class="{ 'caption--active': props.active }">
    <span class="text">{{ props.text }}</span>

    <span
      class="caret"
      :class="{ 'caret--hidden': !props.active || !props.showCaret }"
      aria-hidden="true"
    ></span>
  </div>
</template>

<style scoped>
.caption {
  display: inline-block;
  flex-shrink: 0;
  max-width: 100%;
  padding: var(--caption-padding);
  background: var(--caption-background);
  color: var(--caption-text);
  border: 1px solid var(--caption-border);
  border-radius: var(--caption-radius);
  font: var(--caption-font-weight) var(--caption-font-size) /
    var(--caption-line-height) var(--caption-font-family);
  text-align: start;
}

.caption--active {
  background: var(--caption-active-background);
  border-color: var(--caption-active-border);
}

.text {
  white-space: break-spaces;
  overflow-wrap: anywhere;
}

.caret {
  position: relative;
  display: inline-block;

  width: 0;
  height: 0;
}

.caret::after {
  content: '';

  position: absolute;
  left: 2px;
  bottom: -0.15em;

  width: 2px;
  height: 1em;

  background: var(--caption-caret);
  animation: caret-blink 1.2s step-end infinite;
}

.caret--hidden::after {
  visibility: hidden;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}
</style>
