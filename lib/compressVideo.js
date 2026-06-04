export const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
export const MAX_FALLBACK_BYTES = 20 * 1024 * 1024;

let ffmpegInstance = null;
let loadPromise = null;

async function loadFfmpeg(onProgress) {
  if (typeof window === "undefined") {
    throw new Error("Video compression is only available in the browser.");
  }
  if (ffmpegInstance) return ffmpegInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }) => {
        if (typeof onProgress === "function") {
          onProgress(Math.round((progress || 0) * 100));
        }
      });
      const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

function sanitizeExtension(name) {
  const ext = (name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "mp4";
}

/**
 * @param {File} file
 * @param {{ onStatus?: (msg: string) => void, onProgress?: (pct: number) => void }} [options]
 * @returns {Promise<{ blob: Blob, fileName: string, compressed: boolean, sizeBytes: number, compressionFailed?: boolean }>}
 */
export async function compressVideoForUpload(file, options = {}) {
  const { onStatus, onProgress } = options;

  if (!file || !(file instanceof File)) {
    throw new Error("Please select a video file.");
  }

  if (file.size <= MAX_OUTPUT_BYTES) {
    return {
      blob: file,
      fileName: file.name,
      compressed: false,
      sizeBytes: file.size,
    };
  }

  onStatus?.("compressing");

  try {
    const { fetchFile } = await import("@ffmpeg/util");
    const ffmpeg = await loadFfmpeg(onProgress);
    const inputName = `input.${sanitizeExtension(file.name)}`;
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const crfLevels = [26, 30, 34, 38];
    let lastBlob = null;

    for (const crf of crfLevels) {
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        "scale=720:-2",
        "-c:v",
        "libx264",
        "-crf",
        String(crf),
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        "-movflags",
        "+faststart",
        "-fs",
        String(MAX_OUTPUT_BYTES),
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: "video/mp4" });
      lastBlob = blob;

      if (blob.size <= MAX_OUTPUT_BYTES) {
        const outName = `${file.name.replace(/\.[^.]+$/, "") || "testimonial"}.mp4`;
        try {
          await ffmpeg.deleteFile(inputName);
          await ffmpeg.deleteFile(outputName);
        } catch {
          /* ignore cleanup errors */
        }
        return {
          blob,
          fileName: outName,
          compressed: true,
          sizeBytes: blob.size,
        };
      }
    }

    if (lastBlob && lastBlob.size <= MAX_OUTPUT_BYTES) {
      const outName = `${file.name.replace(/\.[^.]+$/, "") || "testimonial"}.mp4`;
      return {
        blob: lastBlob,
        fileName: outName,
        compressed: true,
        sizeBytes: lastBlob.size,
      };
    }

    throw new Error("COMPRESS_TOO_LARGE");
  } catch (err) {
    if (file.size <= MAX_FALLBACK_BYTES) {
      return {
        blob: file,
        fileName: file.name,
        compressed: false,
        sizeBytes: file.size,
        compressionFailed: true,
      };
    }
    const message =
      err?.message === "COMPRESS_TOO_LARGE"
        ? "Compression could not reduce the video under 10 MB, and the file is over 20 MB."
        : err?.message || "Compression failed.";
    throw new Error(message);
  }
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}
