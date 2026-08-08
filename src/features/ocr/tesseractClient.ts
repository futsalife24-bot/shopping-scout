import { createWorker, type LoggerMessage } from 'tesseract.js';
import type { OcrLine, OcrResult } from '@/types/commerce';
import { preprocessForOcr } from './imageTools';

let workerPromise: ReturnType<typeof createWorker> | undefined;

function getWorker(onProgress: (progress: number, label: string) => void) {
  if (!workerPromise) {
    workerPromise = createWorker('jpn+eng', 1, {
      logger: (message: LoggerMessage) => {
        if (typeof message.progress === 'number') onProgress(message.progress, message.status);
      }
    });
  }
  return workerPromise;
}

function extractLines(blocks: Awaited<ReturnType<typeof createWorker>> extends never ? never : unknown): OcrLine[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block: { paragraphs?: Array<{ lines?: OcrLine[] }> }) =>
    (block.paragraphs ?? []).flatMap((paragraph) => paragraph.lines ?? [])
  );
}

export async function recognizeLabel(
  source: string,
  onProgress: (progress: number, label: string) => void
): Promise<OcrResult> {
  const prepared = await preprocessForOcr(source);
  const workerStartedAt = performance.now();
  const isFirstWorkerUse = !workerPromise;
  const worker = await getWorker(onProgress);
  const workerWarmupMs = isFirstWorkerUse ? Math.round(performance.now() - workerStartedAt) : 0;
  const startedAt = performance.now();
  const { data } = await worker.recognize(prepared.image, {}, { text: true, blocks: true });
  const ocrMs = Math.round(performance.now() - startedAt);
  return {
    text: data.text,
    confidence: data.confidence,
    lines: extractLines(data.blocks),
    timing: { preprocessingMs: prepared.elapsedMs, workerWarmupMs, ocrMs, parsingMs: 0 }
  };
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = undefined;
  }
}
