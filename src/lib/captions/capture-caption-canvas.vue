<script setup lang="ts">
import { computed } from 'vue';
import Caption from './caption.vue';

type TProps = {
  committedCaptions: string[];
  activeText: string;
};

const props = defineProps<TProps>();

const MAX_VISIBLE_COMMITTED_CAPTIONS = 3;

const visibleCommittedCaptions = computed(() =>
  props.committedCaptions.slice(-MAX_VISIBLE_COMMITTED_CAPTIONS),
);
</script>

<template>
  <div class="capture-caption-canvas">
    <Caption
      v-for="(caption, index) in visibleCommittedCaptions"
      :key="index"
      :text="caption"
    />

    <Caption v-if="props.activeText" :text="props.activeText" active />
  </div>
</template>

<style scoped>
.capture-caption-canvas {
  width: 100%;
  height: 100%;
  padding: var(--capture-padding);

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: var(--caption-gap);

  background-color: var(--capture-chroma-color);
}
</style>
