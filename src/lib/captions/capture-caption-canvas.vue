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
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 24px;

  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 8px;

  background-color: #00ff00;
}
</style>
