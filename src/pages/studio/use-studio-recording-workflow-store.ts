import { defineStore } from 'pinia';
import { ref, shallowReadonly } from 'vue';

type TCaptureReplacementTarget = {
  expectedRecordingId: string | null;
  expectedGeneration: number;
};

export const useStudioRecordingWorkflowStore = defineStore(
  'studio-recording-workflow',
  () => {
    const captureReplacementTarget = ref<TCaptureReplacementTarget | null>(
      null,
    );

    function retainCaptureReplacementTarget(
      target: TCaptureReplacementTarget,
    ): boolean {
      if (captureReplacementTarget.value) return false;

      captureReplacementTarget.value = Object.freeze({ ...target });
      return true;
    }

    function clearCaptureReplacementTarget() {
      captureReplacementTarget.value = null;
    }

    return {
      captureReplacementTarget: shallowReadonly(captureReplacementTarget),
      retainCaptureReplacementTarget,
      clearCaptureReplacementTarget,
    };
  },
);
