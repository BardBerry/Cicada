<script setup lang="ts">
import Caption from './caption.vue';

type TProps = {
  committedCaptions: string[];
  activeText: string;
};

const props = defineProps<TProps>();
</script>

<template>
  <div class="studio-caption-canvas">
    <Caption
      v-for="(caption, index) in props.committedCaptions"
      :key="index"
      :text="caption"
    />

    <Caption :text="props.activeText" active />
  </div>
</template>

<style scoped>
.studio-caption-canvas {
  width: 100%;
  height: 100%;
  padding: var(--capture-padding);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--caption-gap);
  overflow: auto;
}
</style>
