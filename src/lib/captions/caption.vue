<script setup lang="ts">
type TProps = {
  text: string;
  active?: boolean;
};
const props = defineProps<TProps>();
</script>

<template>
  <div class="caption" :class="{ 'caption--active': props.active }">
    <span class="caption__text">{{ props.text }}</span>

    <span
      class="caption__caret"
      :class="{ 'caption__caret--hidden': !props.active }"
    ></span>
  </div>
</template>

<style scoped>
.caption {
  display: inline-block;
  max-width: min(100%, var(--caption-max-width));
  padding: var(--caption-padding);

  background: var(--caption-background);
  color: var(--caption-text-color);

  border: var(--caption-border-width) solid var(--caption-border-color);
  border-radius: var(--caption-radius);
  font-family: var(--caption-font-family);
  font-size: var(--caption-font-size);
  font-weight: var(--caption-font-weight);
  line-height: var(--caption-line-height);
}

.caption--active {
  border-color: var(--caption-active-border-color);
  background: var(--caption-active-background);
}

.caption__text {
  white-space: break-spaces;
  overflow-wrap: anywhere;
}

.caption__caret {
  position: relative;
  display: inline-block;

  width: var(--caption-caret-spacing);
  height: 0;
}

.caption__caret::after {
  content: '';

  position: absolute;
  left: var(--caption-caret-offset);
  bottom: var(--caption-caret-bottom);

  width: var(--caption-caret-width);
  height: var(--caption-caret-height);

  background: var(--caption-caret-color);
}

.caption__caret--hidden::after {
  display: none;
}
</style>
