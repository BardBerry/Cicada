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
  max-width: 300px;
  padding: 8px 12px;

  background: #222;
  color: white;

  border-radius: 8px;
  font-size: 24px;
  line-height: 1.2;
}

.caption--active {
  background: #333;
}

.caption__text {
  white-space: break-spaces;
  overflow-wrap: anywhere;
}

.caption__caret {
  position: relative;
  display: inline-block;

  width: 4px;
  height: 0;
}

.caption__caret::after {
  content: '';

  position: absolute;
  left: 2px;
  bottom: -0.2em;

  width: 2px;
  height: 1em;

  background: currentColor;
}

.caption__caret--hidden::after {
  display: none;
}
</style>
