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
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 8px;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  overflow: auto;

  border: 1px solid var(--caption-stage-focus-color, #888);
  border-radius: 4px;
}
</style>
