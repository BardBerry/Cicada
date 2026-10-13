import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const directory = process.argv[2];
const measurements = JSON.parse(
  readFileSync(path.join(directory, 'measurements.json'), 'utf8'),
);
if (measurements.error) throw new Error(measurements.error);
const image = (...args) =>
  execFileSync('magick', args, { encoding: 'utf8' }).trim();
const summary = [];
for (const result of measurements.results) {
  const { name, time } = result.sample;
  const file = (suffix) => path.join(directory, `${name}-${suffix}.png`);
  for (const filter of ['Triangle', 'Cubic', 'Lanczos']) {
    image(
      file('1920'),
      '-filter',
      filter,
      '-resize',
      '200%',
      file(`upscaled-${filter}`),
    );
  }
  const visible = result.before.items.filter(
    (item) => Number(item.opacity) > 0.01,
  );
  const left = Math.floor(Math.min(...visible.map(({ rect }) => rect[0])) - 10);
  const top = Math.floor(Math.min(...visible.map(({ rect }) => rect[1])) - 10);
  const right = Math.ceil(
    Math.max(...visible.map(({ rect }) => rect[0] + rect[2])) + 10,
  );
  const bottom = Math.ceil(
    Math.max(...visible.map(({ rect }) => rect[1] + rect[3])) + 10,
  );
  const crop = `${2 * (right - left)}x${2 * (bottom - top)}+${2 * left}+${2 * top}`;
  const panels = [];
  for (const [source, label] of [
    ['3840', 'Native 4K'],
    ['upscaled-Cubic', '1080p enlarged: Cubic'],
    ['upscaled-Lanczos', '1080p enlarged: Lanczos'],
  ]) {
    const target = file(`crop-${source}`);
    image(file(source), '-crop', crop, '+repage', target);
    const panel = file(`panel-${source}`);
    image(
      target,
      '-background',
      '#ffffff',
      '-fill',
      '#111111',
      '-font',
      'Helvetica',
      '-pointsize',
      '22',
      '-gravity',
      'north',
      '-splice',
      '0x36',
      '-annotate',
      '+0+5',
      label,
      panel,
    );
    panels.push(panel);
  }
  image(...panels, '+append', file('comparison'));
  const item = visible.at(-1);
  const [x, y] = item.lines[0];
  const detailCrop = `300x90+${Math.floor(x * 2)}+${Math.floor((y - 3) * 2)}`;
  const details = [];
  for (const source of ['3840', 'upscaled-Cubic', 'upscaled-Lanczos']) {
    const target = file(`text-detail-${source}`);
    image(
      file(source),
      '-crop',
      detailCrop,
      '+repage',
      '-filter',
      'Point',
      '-resize',
      '300%',
      target,
    );
    details.push(target);
  }
  image(...details, '-append', file('text-detail-comparison'));
  if (name === 'ordinary') {
    const [textX, textY, textWidth] = item.lines[0];
    for (const [feature, region] of [
      [
        'caret',
        `56x80+${Math.floor((textX + textWidth - 12) * 2)}+${Math.floor((textY - 3) * 2)}`,
      ],
      [
        'corner',
        `80x80+${Math.floor(item.rect[0] * 2)}+${Math.floor(item.rect[1] * 2)}`,
      ],
    ]) {
      const crops = [];
      for (const source of ['3840', 'upscaled-Cubic', 'upscaled-Lanczos']) {
        const target = file(`${feature}-${source}`);
        image(
          file(source),
          '-crop',
          region,
          '+repage',
          '-filter',
          'Point',
          '-resize',
          '400%',
          target,
        );
        crops.push(target);
      }
      image(...crops, '+append', file(`${feature}-comparison`));
    }
  }
  const lowSignature = image(file('1920'), '-format', '%#', 'info:');
  const repeatSignature = image(
    path.join(directory, `${name}-repeat-1920.png`),
    '-format',
    '%#',
    'info:',
  );
  summary.push({
    name,
    timestampMs: time,
    geometryUnchanged: result.captures.every((c) => c.geometryUnchanged),
    repeatPixelsIdentical: lowSignature === repeatSignature,
    items: visible.map(({ text, rect, lines, transform }) => ({
      text,
      rect,
      lineCount: lines.length,
      transform,
    })),
    captures: result.captures.map(({ metadata }) => {
      const [width, height, x, y] = image(
        metadata.path,
        '-fuzz',
        '1%',
        '-trim',
        '-format',
        '%w %h %X %Y',
        'info:',
      )
        .split(' ')
        .map(Number);
      const scale = metadata.bitmapSize[0] / 1920;
      return {
        ...metadata,
        normalizedPixelBounds: [
          x / scale,
          y / scale,
          width / scale,
          height / scale,
        ],
      };
    }),
    comparison: file('comparison'),
    detailComparison: file('text-detail-comparison'),
  });
}
writeFileSync(
  path.join(directory, 'analysis.json'),
  JSON.stringify(summary, null, 2),
);
const report = {
  samples: summary.map((sample) => ({
    name: sample.name,
    timestampMs: sample.timestampMs,
    lineCounts: sample.items.map((item) => item.lineCount),
    geometryUnchanged: sample.geometryUnchanged,
    repeatPixelsIdentical: sample.repeatPixelsIdentical,
    normalizedBoundsSpread: [0, 1, 2, 3].map((axis) => {
      const values = sample.captures.map(
        (capture) => capture.normalizedPixelBounds[axis],
      );
      return Math.max(...values) - Math.min(...values);
    }),
  })),
  timings: [1280, 1920, 2560, 3840].map((width) => {
    const captures = summary.flatMap((sample) =>
      sample.captures.filter((capture) => capture.bitmapSize[0] === width),
    );
    const times = captures.map((capture) => capture.nativeMs);
    return {
      width,
      count: times.length,
      meanMs: times.reduce((total, value) => total + value, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
    };
  }),
};
writeFileSync(
  path.join(directory, 'summary.json'),
  JSON.stringify(report, null, 2),
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
