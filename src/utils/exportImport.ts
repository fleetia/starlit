import { loadMediaBlob, saveMedia } from "@/utils/mediaStorage";
import { loadFavicons } from "@/utils/favicon";
import storage from "@/utils/storage";

import type { BackgroundMedia } from "@/newtab/hooks/useBackgroundImage";
import type { GridSettings, Settings, ColorTheme } from "@/newtab/types";

export type ExportData = {
  gridSettings: GridSettings;
  settings: Settings;
  colorTheme: ColorTheme;
  customCSS?: string;
  backgroundMeta?: BackgroundMedia | null;
  backgroundData?: string;
  favicons?: Record<string, string>;
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("blob 읽기 실패"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("잘못된 base64 데이터입니다.");
  }
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error("base64 디코딩에 실패했습니다.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * 객체를 JSON 파일로 다운로드
 */
export function exportToJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON 파일을 읽어서 파싱
 */
export function importFromJson(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const error = validateExportData(parsed);
        if (error) {
          reject(new Error(error));
          return;
        }
        resolve(parsed as ExportData);
      } catch {
        reject(new Error("잘못된 JSON 파일입니다."));
      }
    };
    reader.onerror = (): void => reject(new Error("파일 읽기 실패"));
    reader.readAsText(file);
  });
}

function validateExportData(data: unknown): string | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return "잘못된 형식: 객체가 아닙니다.";
  }
  const obj = data as Record<string, unknown>;

  if (!obj.gridSettings || typeof obj.gridSettings !== "object") {
    return "잘못된 형식: gridSettings가 없거나 올바르지 않습니다.";
  }
  if (!obj.settings || typeof obj.settings !== "object") {
    return "잘못된 형식: settings가 없거나 올바르지 않습니다.";
  }
  if (!obj.colorTheme || typeof obj.colorTheme !== "object") {
    return "잘못된 형식: colorTheme이 없거나 올바르지 않습니다.";
  }
  if (obj.customCSS !== undefined && typeof obj.customCSS !== "string") {
    return "잘못된 형식: customCSS가 문자열이 아닙니다.";
  }
  if (
    obj.backgroundMeta !== undefined &&
    obj.backgroundMeta !== null &&
    typeof obj.backgroundMeta !== "object"
  ) {
    return "잘못된 형식: backgroundMeta가 올바르지 않습니다.";
  }
  if (
    obj.backgroundData !== undefined &&
    typeof obj.backgroundData !== "string"
  ) {
    return "잘못된 형식: backgroundData가 문자열이 아닙니다.";
  }
  if (
    obj.favicons !== undefined &&
    (typeof obj.favicons !== "object" || obj.favicons === null)
  ) {
    return "잘못된 형식: favicons가 올바르지 않습니다.";
  }

  return null;
}

/**
 * 전체 설정 내보내기 (배경 이미지 + 파비콘 포함)
 */
export async function exportFull(
  gridSettings: GridSettings,
  settings: Settings,
  colorTheme: ColorTheme,
  backgroundMeta: BackgroundMedia | null | undefined,
  customCSS?: string
): Promise<ExportData> {
  const data: ExportData = { gridSettings, settings, colorTheme };
  if (customCSS) data.customCSS = customCSS;

  // 배경 이미지
  if (backgroundMeta) {
    data.backgroundMeta = backgroundMeta;
    if (backgroundMeta.source === "file") {
      const blob = await loadMediaBlob("backgroundMedia");
      if (blob) {
        data.backgroundData = await blobToDataUrl(blob);
      }
    }
  }

  // 파비콘
  const favicons = await loadFavicons();
  if (Object.keys(favicons).length > 0) {
    data.favicons = favicons;
  }

  return data;
}

/**
 * 전체 설정 가져오기 (배경 이미지 + 파비콘 복원)
 */
export async function importFull(data: ExportData): Promise<void> {
  // 기본 설정 복원
  if (data.gridSettings)
    await storage.sync.set({ gridSettings: data.gridSettings });
  if (data.settings) await storage.sync.set({ settings: data.settings });
  if (data.customCSS != null)
    await storage.sync.set({ customCSS: data.customCSS });

  // 배경 이미지 복원
  if (data.backgroundMeta) {
    await storage.sync.set({ backgroundMeta: data.backgroundMeta });
    if (data.backgroundMeta.source === "file" && data.backgroundData) {
      const blob = dataUrlToBlob(data.backgroundData);
      await saveMedia("backgroundMedia", blob);
    }
  }

  // 파비콘 복원 (기존과 merge, 덮어쓰기)
  if (data.favicons) {
    const existing = await loadFavicons();
    const merged = { ...existing, ...data.favicons };
    await storage.local.set({ favicons: merged });
  }
}
