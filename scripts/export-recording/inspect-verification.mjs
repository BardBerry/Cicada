import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const log = process.argv[2];
const line = readFileSync(log, 'utf8')
  .split('\n')
  .find((value) => value.startsWith('CICADA_NATIVE_VERIFY '));
if (!line) throw new Error('No verification report');
const result = JSON.parse(line.slice('CICADA_NATIVE_VERIFY '.length));
const layouts = readFileSync(log, 'utf8')
  .split('\n')
  .filter((value) => value.startsWith('CICADA_EXPORT_RENDER '))
  .map(
    (value) =>
      JSON.parse(value.slice('CICADA_EXPORT_RENDER '.length)).layoutMetrics,
  )
  .filter(Boolean);
if (result.paths && typeof result.paths[0] === 'object' && layouts.length) {
  result.fixedLogicalLayoutInvariant = layouts.every(
    (layout) => JSON.stringify(layout) === JSON.stringify(layouts[0]),
  );
  result.logicalLayouts = layouts;
}
writeFileSync(`${log}.json`, JSON.stringify(result, null, 2));
if (result.verificationFailure || result.bootstrapError)
  throw new Error(JSON.stringify(result));
const outputs =
  result.paths?.map((entry) =>
    typeof entry === 'string' ? entry : entry.output,
  ) ?? [result.savedPath, result.repeatPath, result.draftPath].filter(Boolean);
const videos = outputs.map((output) => ({
  output,
  ...JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height,r_frame_rate,nb_frames,duration',
        '-of',
        'json',
        output,
      ],
      { encoding: 'utf8' },
    ),
  ),
}));
const { progress, savedSummary, draftSummary } = result;
const rest = { ...result };
for (const key of [
  'progress',
  'previewMetrics',
  'draftPreviewMetrics',
  'savedSummary',
  'draftSummary',
  'logicalLayouts',
])
  delete rest[key];
process.stdout.write(
  `${JSON.stringify(
    {
      ...rest,
      videos,
      progressEvents: progress?.length,
      progressPhases: progress
        ? [...new Set(progress.map(({ phase }) => phase))]
        : undefined,
      savedRenderer: savedSummary
        ? {
            appliedEvents: savedSummary.appliedEventCount,
            maxItems: savedSummary.maxItems,
            finalItems: savedSummary.finalItems,
            animationUpdates: savedSummary.animationUpdates,
          }
        : undefined,
      draftRenderer: draftSummary
        ? {
            appliedEvents: draftSummary.appliedEventCount,
            maxItems: draftSummary.maxItems,
            finalItems: draftSummary.finalItems,
            animationUpdates: draftSummary.animationUpdates,
          }
        : undefined,
    },
    null,
    2,
  )}\n`,
);
