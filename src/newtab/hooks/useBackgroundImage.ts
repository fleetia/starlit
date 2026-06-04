import { useEffect, useState } from "react";
import { parseGIF, decompressFrames } from "gifuct-js";

import { useStorageState } from "@/hooks/useStorageState";
import { setCSSVariable } from "@fleetia/components";
import { saveMedia, loadMedia, deleteMedia } from "@/utils/mediaStorage";

export type BackgroundMedia = {
  type: "image" | "video";
  source: "url" | "file";
  url: string;
};

const MEDIA_KEY = "backgroundMedia";

export function useBackgroundImage() {
  const { value: meta, setValue: setMeta } =
    useStorageState<BackgroundMedia | null>("backgroundMeta", null);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!meta) {
      setCSSVariable("--background-image", "none");
      return;
    }

    if (meta.source === "url") {
      if (meta.type === "image") {
        setCSSVariable("--background-image", `url("${meta.url}")`);
      }
    } else {
      const capturedType = meta.type;
      loadMedia(MEDIA_KEY).then(url => {
        if (url) {
          setBlobUrl(url);
          if (capturedType === "image") {
            setCSSVariable("--background-image", `url("${url}")`);
          }
        }
      });
    }
  }, [meta]);

  useEffect(() => {
    if (blobUrl && meta?.source === "file" && meta.type === "image") {
      setCSSVariable("--background-image", `url("${blobUrl}")`);
    }
  }, [blobUrl, meta]);

  const updateFromUrl = async (url: string): Promise<void> => {
    await deleteMedia(MEDIA_KEY);
    setBlobUrl("");

    if (!url) {
      await setMeta(null);
      setCSSVariable("--background-image", "none");
      return;
    }

    const isVideo = /\.(mp4|webm|mov|gif)(\?|$)/i.test(url);
    const newMeta: BackgroundMedia = {
      type: isVideo ? "video" : "image",
      source: "url",
      url
    };
    await setMeta(newMeta);
    if (!isVideo) {
      setCSSVariable("--background-image", `url("${url}")`);
    }
  };

  const updateFromFile = async (file: File): Promise<void> => {
    setIsProcessing(true);
    try {
      let blob: Blob;
      let type: "image" | "video";

      if (file.type === "image/gif") {
        blob = await gifToWebm(file);
        type = "video";
      } else if (file.type.startsWith("video/")) {
        blob = file;
        type = "video";
      } else {
        blob = await compressToWebp(file);
        type = "image";
      }

      const objectUrl = await saveMedia(MEDIA_KEY, blob);
      setBlobUrl(objectUrl);
      await setMeta({ type, source: "file", url: "" });
    } finally {
      setIsProcessing(false);
    }
  };

  const clear = async (): Promise<void> => {
    await deleteMedia(MEDIA_KEY);
    await setMeta(null);
    setBlobUrl("");
    setCSSVariable("--background-image", "none");
  };

  return { meta, blobUrl, isProcessing, updateFromUrl, updateFromFile, clear };
}

function compressToWebp(file: File, maxWidth = 1920): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas context failed"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/webp",
        1
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function gifToWebm(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) throw new Error("no frames in gif");

  const { width, height } = gif.lsd;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context failed");

  const stream = canvas.captureStream();
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>(resolve => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
  });

  recorder.start();

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) throw new Error("canvas context failed");

  for (const frame of frames) {
    const { dims, patch, delay, disposalType } = frame;
    const rgba = new Uint8ClampedArray(dims.width * dims.height * 4);
    rgba.set(patch);
    const imageData = new ImageData(rgba, dims.width, dims.height);

    if (disposalType === 2) {
      ctx.clearRect(0, 0, width, height);
    }

    tempCtx.clearRect(0, 0, width, height);
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(tempCanvas, dims.left, dims.top, dims.width, dims.height);

    const frameDelay = Math.max(delay, 20);
    await new Promise(r => setTimeout(r, frameDelay));
  }

  recorder.stop();
  return done;
}
