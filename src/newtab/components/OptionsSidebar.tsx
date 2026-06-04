import React, { useRef, useState, useMemo, useEffect } from "react";
import classNames from "classnames/bind";

import { ColorRow } from "@fleetia/components/ColorRow";
import { PositionGrid } from "@fleetia/components/PositionGrid";
import { RangeInput } from "@fleetia/components/RangeInput";
import { Button } from "@fleetia/components/Button";
import { useTranslation, type Locale } from "@fleetia/components/i18n";
import type { ColorTheme } from "@fleetia/components/theme";
import storage from "@/utils/storage";
import {
  exportToJson,
  importFromJson,
  exportFull,
  importFull
} from "@/utils/exportImport";

import type { BackgroundMedia } from "../hooks/useBackgroundImage";
import { Bookmark, GridSettings, GroupPreference, Settings } from "../types";
import { defaultOptionValue } from "../defaultOptionValue";
import { BookmarkTreeSelector } from "./BookmarkTreeSelector";
import { positionToPlaceSelf } from "../utils/positionToPlaceSelf";

import styles from "./OptionsSidebar.module.scss";

const cx = classNames.bind(styles);

function ProcessingIndicator(): React.ReactElement {
  const { t } = useTranslation();
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setDotCount(prev => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={cx("processingIndicator")}>
      {t("sidebar.background.processing")}
      {".".repeat(dotCount)}
    </div>
  );
}

function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function deepShallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];
    if (valA === valB) continue;
    if (
      typeof valA === "object" &&
      valA !== null &&
      typeof valB === "object" &&
      valB !== null &&
      !Array.isArray(valA) &&
      !Array.isArray(valB)
    ) {
      if (
        !shallowEqual(
          valA as Record<string, unknown>,
          valB as Record<string, unknown>
        )
      )
        return false;
    } else {
      return false;
    }
  }
  return true;
}

const POSITION_OPTIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center-center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

type PrimaryTab = "appearance" | "layout" | "css" | "groups" | "general";
type AppearanceSub = "background" | "container" | "bookmark" | "folder";
type OptionsSidebarProps = {
  gridSettings: GridSettings;
  settings: Settings;
  size: number;
  iconSize: number;
  onClose: () => void;
  onGridSettingChange: (
    key: keyof GridSettings,
    value: number | string
  ) => Promise<void>;
  onGridSettingsUpdate: (settings: GridSettings) => Promise<void>;
  onSettingChange: (
    key: keyof Settings,
    value: boolean | string
  ) => Promise<void>;
  onSizeChange: (value: number) => Promise<void>;
  onIconSizeChange: (value: number) => Promise<void>;
  onBackgroundUrl: (url: string) => Promise<void>;
  onBackgroundFile: (file: File) => Promise<void>;
  isBackgroundProcessing: boolean;
  onBackgroundClear: () => Promise<void>;
  backgroundMeta: BackgroundMedia | null | undefined;
  colorTheme: ColorTheme;
  onThemeChange: (key: keyof ColorTheme, value: string) => Promise<void>;
  onThemeReset: () => Promise<void>;
  onThemePreset: (preset: ColorTheme) => Promise<void>;
  orderedTree: Bookmark[];
  rootPath: string[];
  groupPreferences: GroupPreference[];
  onSelectRoot: (path: string[]) => void;
  onSiblingReorder: (parentKey: string, titles: string[]) => void;
  onToggleVisibility: (key: string) => void;
  customCSS: string;
  onCustomCSSChange: (css: string) => Promise<void>;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function OptionsSidebar({
  gridSettings,
  settings,
  size,
  iconSize,
  onClose,
  onGridSettingsUpdate,
  onSettingChange,
  onSizeChange,
  onIconSizeChange,
  onBackgroundUrl,
  onBackgroundFile,
  isBackgroundProcessing,
  onBackgroundClear,
  backgroundMeta,
  colorTheme,
  onThemeChange,
  onThemeReset,
  onThemePreset,
  orderedTree,
  rootPath,
  groupPreferences,
  onSelectRoot,
  onSiblingReorder,
  onToggleVisibility,
  customCSS,
  onCustomCSSChange,
  locale,
  onLocaleChange
}: OptionsSidebarProps): React.ReactElement {
  const { t } = useTranslation();
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>("general");
  const [appearanceSub, setAppearanceSub] =
    useState<AppearanceSub>("background");

  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const settingsFileRef = useRef<HTMLInputElement>(null);
  const bgImageFileRef = useRef<HTMLInputElement>(null);

  // --- Draft state (미리보기용) ---
  const [draftGrid, setDraftGrid] = useState(() =>
    structuredClone(gridSettings)
  );
  const [draftSettings, setDraftSettings] = useState(() =>
    structuredClone(settings)
  );
  const [draftTheme, setDraftTheme] = useState(() =>
    structuredClone(colorTheme)
  );
  const [draftSize, setDraftSize] = useState(size);
  const [draftIconSize, setDraftIconSize] = useState(iconSize);
  const [draftCSS, setDraftCSS] = useState(customCSS);

  // 스냅샷 (dirty 비교 기준) — 모달 열린 시점에 freeze
  const [snapshot] = useState(() => ({
    gridSettings: structuredClone(gridSettings),
    settings: structuredClone(settings),
    colorTheme: structuredClone(colorTheme),
    size,
    iconSize,
    customCSS
  }));

  // --- Dirty 감지 ---
  const isDirty = useMemo(() => {
    return (
      !deepShallowEqual(
        draftGrid as unknown as Record<string, unknown>,
        snapshot.gridSettings as unknown as Record<string, unknown>
      ) ||
      !shallowEqual(
        draftSettings as unknown as Record<string, unknown>,
        snapshot.settings as unknown as Record<string, unknown>
      ) ||
      !shallowEqual(
        draftTheme as unknown as Record<string, unknown>,
        snapshot.colorTheme as unknown as Record<string, unknown>
      ) ||
      draftSize !== snapshot.size ||
      draftIconSize !== snapshot.iconSize ||
      draftCSS !== snapshot.customCSS
    );
  }, [
    draftGrid,
    draftSettings,
    draftTheme,
    draftSize,
    draftIconSize,
    draftCSS,
    snapshot
  ]);

  // --- 확인 다이얼로그 ---
  const [showConfirm, setShowConfirm] = useState(false);

  // --- 저장 ---
  const handleSave = async () => {
    if (
      !deepShallowEqual(
        draftGrid as unknown as Record<string, unknown>,
        snapshot.gridSettings as unknown as Record<string, unknown>
      )
    ) {
      await onGridSettingsUpdate(draftGrid);
    }
    if (
      !shallowEqual(
        draftSettings as unknown as Record<string, unknown>,
        snapshot.settings as unknown as Record<string, unknown>
      )
    ) {
      for (const key of Object.keys(draftSettings) as (keyof Settings)[]) {
        if (draftSettings[key] !== snapshot.settings[key]) {
          await onSettingChange(key, draftSettings[key] as boolean | string);
        }
      }
    }
    if (
      !shallowEqual(
        draftTheme as unknown as Record<string, unknown>,
        snapshot.colorTheme as unknown as Record<string, unknown>
      )
    ) {
      for (const key of Object.keys(draftTheme) as (keyof ColorTheme)[]) {
        if (draftTheme[key] !== snapshot.colorTheme[key]) {
          await onThemeChange(key, draftTheme[key]);
        }
      }
    }
    if (draftSize !== snapshot.size) await onSizeChange(draftSize);
    if (draftIconSize !== snapshot.iconSize)
      await onIconSizeChange(draftIconSize);
    if (draftCSS !== snapshot.customCSS) await onCustomCSSChange(draftCSS);
    onClose();
  };

  // --- 취소 ---
  const handleCancel = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    onClose();
  };

  // --- Draft 값 파생 ---
  const bgColorValue = draftGrid.background?.color ?? "rgba(255, 255, 255, 1)";
  const iconColorValue = draftGrid.icon?.color ?? "rgba(255, 255, 255, 1)";

  const cssToSettingsKey: Record<string, keyof GridSettings> = {
    columns: "columns",
    rows: "rows",
    gap: "gap",
    "card-gap": "cardGap",
    "masonry-columns": "masonryColumns"
  };

  const handleOnChange = (key: string, value: string): void => {
    const settingsKey = cssToSettingsKey[key];
    if (settingsKey) {
      const parsed = Number(value);
      setDraftGrid(prev => ({
        ...prev,
        [settingsKey]: Number.isNaN(parsed) ? value : parsed
      }));
    }
  };

  // --- 즉시 적용 핸들러 (배경 이미지, 내보내기/가져오기, 초기화) ---
  const handleBackgroundImageApply = (): void => {
    if (backgroundImageUrl.trim()) {
      onBackgroundUrl(backgroundImageUrl.trim());
    }
  };

  const handleBackgroundMediaFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onBackgroundFile(file);
    setBackgroundImageUrl("");
    e.target.value = "";
  };

  const handleExportSettings = async (): Promise<void> => {
    const data = await exportFull(
      gridSettings,
      settings,
      colorTheme,
      backgroundMeta,
      customCSS
    );
    exportToJson(data, "starlit-settings.json");
  };

  const handleImportSettingsFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await importFromJson(file);
    if (
      !data ||
      typeof data !== "object" ||
      (!data.gridSettings && !data.settings && !data.colorTheme)
    ) {
      console.warn("Invalid import data: missing required fields");
      return;
    }
    await importFull(data);
    if (data.colorTheme) await onThemePreset(data.colorTheme);
    window.location.reload();
    e.target.value = "";
  };

  const handleMarginChange = (margin: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }) => {
    setDraftGrid(prev => ({ ...prev, margin }));
  };

  // --- Tab structure ---
  const primaryTabs: { key: PrimaryTab; label: string }[] = [
    { key: "general", label: t("sidebar.tab.general") },
    { key: "appearance", label: t("sidebar.tab.appearance") },
    { key: "layout", label: t("sidebar.tab.layout") },
    { key: "css", label: t("sidebar.tab.css") },
    { key: "groups", label: t("sidebar.tab.groups") }
  ];

  const appearanceSubTabs: { key: AppearanceSub; label: string }[] = [
    { key: "background", label: t("sidebar.appearance.background") },
    { key: "container", label: t("sidebar.appearance.container") },
    { key: "bookmark", label: t("sidebar.appearance.bookmark") },
    { key: "folder", label: t("sidebar.appearance.folder") }
  ];

  const subTabs = primaryTab === "appearance" ? appearanceSubTabs : [];

  const currentSub = primaryTab === "appearance" ? appearanceSub : null;

  const setCurrentSub = (key: string) => {
    if (primaryTab === "appearance") setAppearanceSub(key as AppearanceSub);
  };

  // --- Mini mockup renderers ---
  const renderMockup = () => {
    if (primaryTab === "layout") {
      const isHorizontal = draftSettings.iconLayout === "horizontal";
      const cols = draftGrid.columns ?? 5;
      const hCols = draftGrid.horizontalColumns ?? 1;
      const rowCount = draftGrid.rows ?? 3;
      const masonry = draftGrid.masonryColumns ?? 2;
      const gapScale = Math.max(
        1,
        Math.round(parseFloat(String(draftGrid.gap)) * 3)
      );
      const cardGapScale = Math.max(
        1,
        Math.round(parseFloat(String(draftGrid.cardGap)) * 3)
      );

      const folderColor = draftGrid.folder?.color ?? draftTheme.surface;
      const folderAccent = draftGrid.folder?.accent ?? draftTheme.accent;

      const isExpandHorizontal = draftSettings.isExpandView && isHorizontal;
      const mockCols = isHorizontal ? hCols : cols;

      const mockItemSize = isHorizontal
        ? Math.max(20, Math.floor(100 / hCols) - gapScale)
        : Math.max(14, Math.floor(100 / mockCols) - gapScale);

      const renderItem = (i: number, isFolder: boolean) => {
        const bg = isFolder ? folderColor : iconColorValue;
        return (
          <div
            key={i}
            className={cx("mock-item", { "mock-item-h": isHorizontal })}
            style={{ backgroundColor: bg, width: mockItemSize }}
          >
            <div
              className={cx("mock-icon")}
              style={isFolder ? { backgroundColor: folderAccent } : undefined}
            />
            <div className={cx("mock-text")} />
          </div>
        );
      };

      const shouldFill = (fill: boolean) => fill && !isExpandHorizontal;

      const renderCard = (itemCount: number, key: number, fill = false) => (
        <div
          key={key}
          className={cx("mock-card-layout", {
            "mock-card-fill": shouldFill(fill)
          })}
          style={{ backgroundColor: bgColorValue }}
        >
          <div className={cx("mock-card-header")}>
            <div className={cx("mock-breadcrumb")} />
            <div className={cx("mock-route")} />
          </div>
          <div
            className={cx("mock-grid", { "mock-grid-fill": shouldFill(fill) })}
            style={{
              gridTemplateColumns: `repeat(${mockCols}, 1fr)`,
              gap: `${gapScale}px`
            }}
          >
            {Array.from({ length: itemCount }, (_, i) => renderItem(i, i < 2))}
          </div>
        </div>
      );

      // 펼치기+가로: 아이템 개수는 columns와 무관, 고정 개수
      const cardItemCounts = isExpandHorizontal
        ? [
            Math.max(6, hCols * 3),
            Math.max(4, hCols * 2),
            Math.max(3, hCols * 2)
          ]
        : [
            Math.min(mockCols * 3, 15),
            Math.min(mockCols * 2, 10),
            Math.min(mockCols * 2, 8)
          ];

      if (draftSettings.isExpandView) {
        return (
          <div className={cx("mockup", "mockup-layout")}>
            <div className={cx("mockup-screen")}>
              <div
                className={cx("mock-masonry")}
                style={{
                  columnCount: masonry,
                  columnGap: `${cardGapScale}px`,
                  placeSelf: positionToPlaceSelf(draftGrid.position)
                }}
              >
                {cardItemCounts.map((count, i) => renderCard(count, i, true))}
              </div>
            </div>
            <span className={cx("mockup-label")}>
              {t("sidebar.layout.preview")}
            </span>
            <span className={cx("mockup-note")}>
              {t("sidebar.preview.note")}
            </span>
          </div>
        );
      }

      const scrollItemCount = isHorizontal
        ? Math.min(hCols * 3, 10)
        : Math.min(cols * rowCount, 15);

      return (
        <div className={cx("mockup", "mockup-layout")}>
          <div className={cx("mockup-screen")}>
            <div style={{ placeSelf: positionToPlaceSelf(draftGrid.position) }}>
              {renderCard(scrollItemCount, 0)}
            </div>
          </div>
          <span className={cx("mockup-label")}>
            {t("sidebar.layout.preview")}
          </span>
        </div>
      );
    }

    if (primaryTab === "appearance") {
      if (appearanceSub === "background") {
        const isHorizontal = draftSettings.iconLayout === "horizontal";
        const cols = draftGrid.columns ?? 5;
        const hCols = draftGrid.horizontalColumns ?? 1;
        const rowCount = draftGrid.rows ?? 3;
        const masonry = draftGrid.masonryColumns ?? 2;
        const gapScale = Math.max(
          1,
          Math.round(parseFloat(String(draftGrid.gap)) * 3)
        );
        const cardGapScale = Math.max(
          1,
          Math.round(parseFloat(String(draftGrid.cardGap)) * 3)
        );

        const folderColor = draftGrid.folder?.color ?? draftTheme.surface;
        const folderAccent = draftGrid.folder?.accent ?? draftTheme.accent;

        const isBgExpandHorizontal = draftSettings.isExpandView && isHorizontal;
        const bgMockCols = isHorizontal ? hCols : cols;

        const bgMockItemSize = isHorizontal
          ? Math.max(20, Math.floor(100 / hCols) - gapScale)
          : Math.max(14, Math.floor(100 / bgMockCols) - gapScale);

        const renderBgItem = (i: number, isFolder: boolean) => {
          const bg = isFolder ? folderColor : iconColorValue;
          return (
            <div
              key={i}
              className={cx("mock-item", { "mock-item-h": isHorizontal })}
              style={{ backgroundColor: bg, width: bgMockItemSize }}
            >
              <div
                className={cx("mock-icon")}
                style={isFolder ? { backgroundColor: folderAccent } : undefined}
              />
              <div className={cx("mock-text")} />
            </div>
          );
        };

        const shouldBgFill = (fill: boolean) => fill && !isBgExpandHorizontal;

        const renderBgCard = (itemCount: number, key: number, fill = false) => (
          <div
            key={key}
            className={cx("mock-card-layout", {
              "mock-card-fill": shouldBgFill(fill)
            })}
            style={{ backgroundColor: bgColorValue }}
          >
            <div className={cx("mock-card-header")}>
              <div className={cx("mock-breadcrumb")} />
              <div className={cx("mock-route")} />
            </div>
            <div
              className={cx("mock-grid", {
                "mock-grid-fill": shouldBgFill(fill)
              })}
              style={{
                gridTemplateColumns: `repeat(${bgMockCols}, 1fr)`,
                gap: `${gapScale}px`
              }}
            >
              {Array.from({ length: itemCount }, (_, i) =>
                renderBgItem(i, i < 2)
              )}
            </div>
          </div>
        );

        const bgCardItemCounts = isBgExpandHorizontal
          ? [
              Math.max(6, hCols * 3),
              Math.max(4, hCols * 2),
              Math.max(3, hCols * 2)
            ]
          : [
              Math.min(bgMockCols * 3, 15),
              Math.min(bgMockCols * 2, 10),
              Math.min(bgMockCols * 2, 8)
            ];

        const bgScrollItemCount = isHorizontal
          ? Math.min(hCols * 3, 10)
          : Math.min(cols * rowCount, 15);

        const bgLayoutContent = draftSettings.isExpandView ? (
          <div
            className={cx("mock-masonry")}
            style={{
              columnCount: masonry,
              columnGap: `${cardGapScale}px`,
              placeSelf: positionToPlaceSelf(draftGrid.position)
            }}
          >
            {bgCardItemCounts.map((count, i) => renderBgCard(count, i, true))}
          </div>
        ) : (
          <div style={{ placeSelf: positionToPlaceSelf(draftGrid.position) }}>
            {renderBgCard(bgScrollItemCount, 0)}
          </div>
        );

        return (
          <div className={cx("mockup", "mockup-background")}>
            <div
              className={cx("mockup-screen")}
              style={{
                background:
                  "var(--background-image, #f0f0f0) center/cover no-repeat"
              }}
            >
              {bgLayoutContent}
            </div>
            <span className={cx("mockup-label")}>
              {t("sidebar.background.preview")}
            </span>
          </div>
        );
      }
      if (appearanceSub === "container") {
        const borderEnabled = draftGrid.heading?.borderEnabled ?? false;

        const cssVars = {
          "--ct-title-hover": draftTheme.accent,
          "--ct-subtitle-hover": draftGrid.heading?.subtitleHoverColor ?? "#000"
        } as React.CSSProperties;

        return (
          <div className={cx("mockup", "mockup-container")} style={cssVars}>
            <div
              className={cx("mockup-card")}
              style={{ borderRadius: draftGrid.heading?.borderRadius ?? 0 }}
            >
              <span
                className={cx("mockup-title", "mockup-title-hover")}
                style={{
                  color: draftGrid.heading?.titleColor ?? "#000",
                  fontSize: draftGrid.heading?.titleSize ?? 14,
                  paintOrder: "stroke fill",
                  WebkitTextStroke: borderEnabled
                    ? `${draftGrid.heading?.borderWidth ?? 1}px ${draftGrid.heading?.borderColor ?? "#000"}`
                    : undefined
                }}
              >
                {t("sidebar.container.mockupTitle")}
              </span>
              <span
                className={cx("mockup-subtitle", "mockup-subtitle-hover")}
                style={{
                  color: draftGrid.heading?.subtitleColor ?? "#999",
                  fontSize: draftGrid.heading?.subtitleSize ?? 12
                }}
              >
                {t("sidebar.container.mockupSubtitle")}
              </span>
            </div>
            <span className={cx("mockup-label")}>
              {t("sidebar.container.preview")}
            </span>
          </div>
        );
      }
      if (appearanceSub === "bookmark") {
        const bmHorizontal = draftSettings.iconLayout === "horizontal";
        const em = draftSize;
        const btnWidth = bmHorizontal
          ? undefined
          : em * (draftGrid.icon?.width ?? 4);
        const btnHeight = bmHorizontal
          ? undefined
          : em * (draftGrid.icon?.height ?? 4);
        const iconSz = Math.min(draftIconSize, em * 2);
        const fontSize = em * 0.75;
        const pad = em * 0.5;
        const gapVal = em * 0.5;
        const radius = draftGrid.icon?.borderRadius ?? em * 0.3;

        const cssVars = {
          "--bm-hover-bg": draftTheme.hoverBg,
          "--bm-hover-text": draftTheme.hoverText,
          "--bm-hover-y": `${-em * 0.3}px`,
          "--bm-hover-shadow": `0 ${em * 0.3}px 0 ${draftTheme.accent}`
        } as React.CSSProperties;

        return (
          <div className={cx("mockup", "mockup-bookmark")} style={cssVars}>
            <div
              className={cx("mockup-bm-button", {
                "mockup-bm-button-h": bmHorizontal
              })}
              style={{
                backgroundColor: iconColorValue,
                minWidth: btnWidth,
                minHeight: btnHeight,
                padding: pad,
                gap: gapVal,
                borderRadius: radius
              }}
            >
              <div
                className={cx("mockup-bm-icon")}
                style={{
                  width: iconSz,
                  height: iconSz,
                  borderRadius: draftGrid.icon?.iconRadius ?? em * 0.4,
                  background: draftTheme.accent,
                  border: `1px solid ${draftTheme.border}`
                }}
              />
              <span
                className={cx("mockup-bm-name", {
                  "mockup-bm-name-left": bmHorizontal
                })}
                style={{ color: draftTheme.text, fontSize }}
              >
                {t("sidebar.bookmark.mockupName")}
              </span>
            </div>
            <span className={cx("mockup-label")}>
              {t("sidebar.bookmark.preview")}
            </span>
          </div>
        );
      }
      if (appearanceSub === "folder") {
        const flHorizontal = draftSettings.iconLayout === "horizontal";
        const em = draftSize;
        const btnWidth = flHorizontal
          ? undefined
          : em * (draftGrid.icon?.width ?? 4);
        const btnHeight = flHorizontal
          ? undefined
          : em * (draftGrid.icon?.height ?? 4);
        const iconSz = Math.min(draftIconSize, em * 2);
        const fontSize = em * 0.75;
        const pad = em * 0.5;
        const gapVal = em * 0.5;
        const radius = draftGrid.icon?.borderRadius ?? em * 0.3;
        const iconRadius = draftGrid.icon?.iconRadius ?? em * 0.4;

        const folderBg = draftGrid.folder?.color ?? draftTheme.surface;
        const folderBorder = draftGrid.folder?.border ?? draftTheme.border;
        const folderAccent = draftGrid.folder?.accent ?? draftTheme.accent;
        const folderAccentText =
          draftGrid.folder?.accentText ?? draftTheme.accentText;
        const folderText = draftGrid.folder?.text ?? draftTheme.text;

        const cssVars = {
          "--fl-hover-bg": draftTheme.hoverBg,
          "--fl-hover-text": draftTheme.hoverText,
          "--fl-hover-y": `${-em * 0.3}px`,
          "--fl-hover-shadow": `0 ${em * 0.3}px 0 ${folderAccent}`
        } as React.CSSProperties;

        return (
          <div className={cx("mockup", "mockup-folder")} style={cssVars}>
            <div
              className={cx("mockup-fl-button", {
                "mockup-fl-button-h": flHorizontal
              })}
              style={{
                backgroundColor: folderBg,
                borderColor: folderBorder,
                minWidth: btnWidth,
                minHeight: btnHeight,
                padding: pad,
                gap: gapVal,
                borderRadius: radius
              }}
            >
              <div
                className={cx("mockup-fl-icon")}
                style={{
                  width: iconSz,
                  height: iconSz,
                  borderRadius: iconRadius,
                  backgroundColor: folderAccent,
                  color: folderAccentText,
                  borderColor: folderBorder
                }}
              >
                F
              </div>
              <span
                className={cx("mockup-fl-name", {
                  "mockup-fl-name-left": flHorizontal
                })}
                style={{ color: folderText, fontSize }}
              >
                {t("sidebar.folder.mockupName")}
              </span>
            </div>
            <span className={cx("mockup-label")}>
              {t("sidebar.folder.preview")}
            </span>
          </div>
        );
      }
    }

    return null;
  };

  // --- Tab content renderers ---
  const renderContent = () => {
    // === 외형 > 배경 ===
    if (primaryTab === "appearance" && appearanceSub === "background") {
      return (
        <>
          <label className={cx("subGroupTitle")}>
            {t("sidebar.background.image")}
          </label>
          <div className={cx("backgroundImageContainer")}>
            <input
              name="bg"
              type="text"
              value={backgroundImageUrl}
              onChange={e => setBackgroundImageUrl(e.target.value)}
              placeholder={t("sidebar.background.urlPlaceholder")}
              className={cx("textInput")}
            />
            <button onClick={handleBackgroundImageApply}>
              {t("sidebar.background.apply")}
            </button>
          </div>
          <div className={cx("backgroundImageContainer")}>
            <button
              onClick={() => bgImageFileRef.current?.click()}
              disabled={isBackgroundProcessing}
            >
              {t("sidebar.background.fileUpload")}
            </button>
            <button
              onClick={onBackgroundClear}
              disabled={isBackgroundProcessing}
            >
              {t("sidebar.background.remove")}
            </button>
            <input
              ref={bgImageFileRef}
              type="file"
              accept="image/*,video/*,.gif"
              style={{ display: "none" }}
              onChange={handleBackgroundMediaFile}
            />
          </div>
          {isBackgroundProcessing && <ProcessingIndicator />}
          <label className={cx("subGroupTitle")}>
            {t("sidebar.background.box")}
          </label>
          <ColorRow
            label={t("sidebar.background.color")}
            value={bgColorValue}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                background: { ...prev.background, color }
              }));
            }}
          />
        </>
      );
    }

    // === 외형 > 컨테이너 ===
    if (primaryTab === "appearance" && appearanceSub === "container") {
      return (
        <>
          <label className={cx("subGroupTitle")}>
            {t("sidebar.container.title")}
          </label>
          <ColorRow
            label={t("sidebar.container.text")}
            value={draftGrid.heading?.titleColor ?? "#000000"}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  titleColor: color
                } as GridSettings["heading"]
              }));
            }}
          />
          <RangeInput
            label={t("sidebar.container.size")}
            value={draftGrid.heading?.titleSize ?? 14}
            min={8}
            max={30}
            displayValue={`${draftGrid.heading?.titleSize ?? 14}px`}
            onChange={v => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  titleSize: v
                } as GridSettings["heading"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.container.hover")}
            value={draftTheme.accent}
            showAlpha
            onChange={color => {
              if (draftGrid.folder?.accent == null) {
                setDraftGrid(prev => ({
                  ...prev,
                  folder: {
                    ...prev.folder,
                    accent: draftTheme.accent,
                    accentText: prev.folder?.accentText ?? draftTheme.accentText
                  }
                }));
              }
              setDraftTheme(prev => ({ ...prev, accent: color }));
            }}
          />
          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftGrid.heading?.borderEnabled ?? false}
              onChange={e => {
                const heading = draftGrid.heading ?? {
                  titleColor: "#000000",
                  subtitleColor: "#999999",
                  borderEnabled: false,
                  borderWidth: 1,
                  borderColor: "#000000",
                  subtitleHoverColor: "#000000"
                };
                const next = { ...heading, borderEnabled: e.target.checked };
                setDraftGrid(prev => ({ ...prev, heading: next }));
              }}
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.container.border")}
            </span>
          </label>
          {draftGrid.heading?.borderEnabled && (
            <>
              <ColorRow
                label={t("sidebar.container.borderColor")}
                value={draftGrid.heading?.borderColor ?? "#000000"}
                showAlpha
                onChange={color => {
                  const heading = draftGrid.heading!;
                  const next = { ...heading, borderColor: color };
                  setDraftGrid(prev => ({ ...prev, heading: next }));
                }}
              />
              <RangeInput
                label={t("sidebar.container.borderWidth")}
                value={draftGrid.heading?.borderWidth ?? 1}
                min={1}
                max={5}
                displayValue={`${draftGrid.heading?.borderWidth ?? 1}px`}
                onChange={v => {
                  const heading = draftGrid.heading!;
                  const next = { ...heading, borderWidth: v };
                  setDraftGrid(prev => ({ ...prev, heading: next }));
                }}
              />
            </>
          )}

          <label className={cx("subGroupTitle")}>
            {t("sidebar.container.subtitle")}
          </label>
          <ColorRow
            label={t("sidebar.container.text")}
            value={draftGrid.heading?.subtitleColor ?? "#999999"}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  subtitleColor: color
                } as GridSettings["heading"]
              }));
            }}
          />
          <RangeInput
            label={t("sidebar.container.size")}
            value={draftGrid.heading?.subtitleSize ?? 12}
            min={8}
            max={24}
            displayValue={`${draftGrid.heading?.subtitleSize ?? 12}px`}
            onChange={v => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  subtitleSize: v
                } as GridSettings["heading"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.container.hover")}
            value={draftGrid.heading?.subtitleHoverColor ?? "#000000"}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  subtitleHoverColor: color
                } as GridSettings["heading"]
              }));
            }}
          />

          <label className={cx("subGroupTitle")}>
            {t("sidebar.container.containerBox")}
          </label>
          <RangeInput
            label={t("sidebar.container.borderRadius")}
            value={draftGrid.heading?.borderRadius ?? 0}
            min={0}
            max={30}
            displayValue={`${draftGrid.heading?.borderRadius ?? 0}px`}
            onChange={v => {
              setDraftGrid(prev => ({
                ...prev,
                heading: {
                  ...prev.heading,
                  borderRadius: v
                } as GridSettings["heading"]
              }));
            }}
          />
        </>
      );
    }

    // === 외형 > 북마크 ===
    if (primaryTab === "appearance" && appearanceSub === "bookmark") {
      return (
        <>
          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftSettings.iconLayout === "horizontal"}
              onChange={e =>
                setDraftSettings(prev => ({
                  ...prev,
                  iconLayout: e.target.checked ? "horizontal" : "vertical"
                }))
              }
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.bookmark.horizontalIcon")}
            </span>
          </label>
          <RangeInput
            label={t("sidebar.bookmark.scale")}
            value={draftSize}
            min={10}
            max={50}
            displayValue={`${draftSize}px`}
            onChange={v => setDraftSize(v)}
          />
          {draftSettings.iconLayout !== "horizontal" && (
            <>
              <RangeInput
                label={t("sidebar.bookmark.horizontalSize")}
                value={draftGrid.icon?.width ?? 4}
                min={2}
                max={10}
                step={0.5}
                displayValue={`${draftGrid.icon?.width ?? 4}em`}
                onChange={v => {
                  setDraftGrid(prev => ({
                    ...prev,
                    icon: { ...prev.icon, width: v }
                  }));
                }}
              />
              <RangeInput
                label={t("sidebar.bookmark.verticalSize")}
                value={draftGrid.icon?.height ?? 4}
                min={2}
                max={10}
                step={0.5}
                displayValue={`${draftGrid.icon?.height ?? 4}em`}
                onChange={v => {
                  setDraftGrid(prev => ({
                    ...prev,
                    icon: { ...prev.icon, height: v }
                  }));
                }}
              />
            </>
          )}
          <RangeInput
            label={t("sidebar.bookmark.iconSize")}
            value={draftIconSize}
            min={16}
            max={32}
            displayValue={`${draftIconSize}px`}
            onChange={v => setDraftIconSize(v)}
          />
          <RangeInput
            label={t("sidebar.bookmark.borderRadius")}
            value={draftGrid.icon?.borderRadius ?? Math.round(draftSize * 0.3)}
            min={0}
            max={30}
            displayValue={`${draftGrid.icon?.borderRadius ?? Math.round(draftSize * 0.3)}px`}
            onChange={v => {
              setDraftGrid(prev => ({
                ...prev,
                icon: { ...prev.icon, borderRadius: v }
              }));
            }}
          />
          <RangeInput
            label={t("sidebar.bookmark.iconBorderRadius")}
            value={draftGrid.icon?.iconRadius ?? Math.round(draftSize * 0.4)}
            min={0}
            max={30}
            displayValue={`${draftGrid.icon?.iconRadius ?? Math.round(draftSize * 0.4)}px`}
            onChange={v => {
              setDraftGrid(prev => ({
                ...prev,
                icon: { ...prev.icon, iconRadius: v }
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.bookmark.boxColor")}
            value={iconColorValue}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                icon: { ...prev.icon, color }
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.bookmark.text")}
            value={draftTheme.text}
            showAlpha
            onChange={color => {
              setDraftTheme(prev => ({ ...prev, text: color }));
            }}
          />
          <ColorRow
            label={t("sidebar.bookmark.hoverBackground")}
            value={draftTheme.hoverBg}
            showAlpha
            onChange={color => {
              setDraftTheme(prev => ({ ...prev, hoverBg: color }));
            }}
          />
          <ColorRow
            label={t("sidebar.bookmark.hoverText")}
            value={draftTheme.hoverText}
            showAlpha
            onChange={color => {
              setDraftTheme(prev => ({ ...prev, hoverText: color }));
            }}
          />
        </>
      );
    }

    // === 외형 > 폴더 ===
    if (primaryTab === "appearance" && appearanceSub === "folder") {
      return (
        <>
          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftSettings.iconLayout === "horizontal"}
              onChange={e =>
                setDraftSettings(prev => ({
                  ...prev,
                  iconLayout: e.target.checked ? "horizontal" : "vertical"
                }))
              }
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.folder.horizontalIcon")}
            </span>
          </label>
          <ColorRow
            label={t("sidebar.folder.background")}
            value={draftGrid.folder?.color ?? draftTheme.surface}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                folder: { ...prev.folder, color } as GridSettings["folder"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.folder.iconBackground")}
            value={draftGrid.folder?.accent ?? draftTheme.accent}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                folder: {
                  ...prev.folder,
                  accent: color
                } as GridSettings["folder"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.folder.iconColor")}
            value={draftGrid.folder?.accentText ?? draftTheme.accentText}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                folder: {
                  ...prev.folder,
                  accentText: color
                } as GridSettings["folder"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.folder.text")}
            value={draftGrid.folder?.text ?? draftTheme.text}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                folder: {
                  ...prev.folder,
                  text: color
                } as GridSettings["folder"]
              }));
            }}
          />
          <ColorRow
            label={t("sidebar.folder.border")}
            value={draftGrid.folder?.border ?? draftTheme.border}
            showAlpha
            onChange={color => {
              setDraftGrid(prev => ({
                ...prev,
                folder: {
                  ...prev.folder,
                  border: color
                } as GridSettings["folder"]
              }));
            }}
          />
        </>
      );
    }

    // === 배치 ===
    if (primaryTab === "layout") {
      return (
        <>
          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftSettings.isExpandView}
              onChange={e =>
                setDraftSettings(prev => ({
                  ...prev,
                  isExpandView: e.target.checked
                }))
              }
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.layout.expandBookmarks")}
            </span>
          </label>
          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftSettings.iconLayout === "horizontal"}
              onChange={e =>
                setDraftSettings(prev => ({
                  ...prev,
                  iconLayout: e.target.checked ? "horizontal" : "vertical"
                }))
              }
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.layout.horizontalIcon")}
            </span>
          </label>

          <div className={cx("box")}>
            <span className={cx("boxTitle")}>
              {draftSettings.isExpandView
                ? t("sidebar.layout.expandLayout")
                : t("sidebar.layout.scrollLayout")}
            </span>
            {draftSettings.isExpandView ? (
              <>
                <RangeInput
                  label={t("sidebar.layout.cardColumns")}
                  value={draftGrid.masonryColumns ?? 2}
                  min={1}
                  max={5}
                  onChange={v => handleOnChange("masonry-columns", String(v))}
                />
                <RangeInput
                  label={
                    draftSettings.iconLayout === "horizontal"
                      ? t("sidebar.layout.horizontalSize")
                      : t("sidebar.layout.cardInnerColumns")
                  }
                  value={draftGrid.columns}
                  min={3}
                  max={10}
                  onChange={v => handleOnChange("columns", String(v))}
                />
                {draftSettings.iconLayout === "horizontal" && (
                  <RangeInput
                    label={t("sidebar.layout.horizontalColumnCount")}
                    value={draftGrid.horizontalColumns ?? 1}
                    min={1}
                    max={5}
                    onChange={v =>
                      setDraftGrid(prev => ({ ...prev, horizontalColumns: v }))
                    }
                  />
                )}
                <RangeInput
                  label={t("sidebar.layout.cardGap")}
                  value={parseFloat(String(draftGrid.cardGap)) || 1.5}
                  min={0}
                  max={5}
                  step={0.1}
                  displayValue={String(draftGrid.cardGap ?? "1.5em")}
                  onChange={v => handleOnChange("card-gap", `${v}em`)}
                />
                <RangeInput
                  label={t("sidebar.layout.bookmarkGap")}
                  value={parseFloat(String(draftGrid.gap)) || 1}
                  min={0}
                  max={3}
                  step={0.1}
                  displayValue={String(draftGrid.gap)}
                  onChange={v => handleOnChange("gap", `${v}em`)}
                />
              </>
            ) : (
              <>
                <RangeInput
                  label={
                    draftSettings.iconLayout === "horizontal"
                      ? t("sidebar.layout.count")
                      : t("sidebar.layout.columnCount")
                  }
                  value={draftGrid.columns}
                  min={3}
                  max={10}
                  onChange={v => handleOnChange("columns", String(v))}
                />
                {draftSettings.iconLayout === "horizontal" && (
                  <RangeInput
                    label={t("sidebar.layout.horizontalColumnCount")}
                    value={draftGrid.horizontalColumns ?? 1}
                    min={1}
                    max={5}
                    onChange={v =>
                      setDraftGrid(prev => ({ ...prev, horizontalColumns: v }))
                    }
                  />
                )}
                <RangeInput
                  label={t("sidebar.layout.rowCount")}
                  value={draftGrid.rows}
                  min={1}
                  max={5}
                  onChange={v => handleOnChange("rows", String(v))}
                />
                <RangeInput
                  label={t("sidebar.layout.gap")}
                  value={parseFloat(String(draftGrid.gap)) || 1}
                  min={0}
                  max={3}
                  step={0.1}
                  displayValue={String(draftGrid.gap)}
                  onChange={v => handleOnChange("gap", `${v}em`)}
                />
              </>
            )}
          </div>

          <label className={cx("subGroupTitle")}>
            {t("sidebar.layout.positionMargin")}
          </label>
          <PositionGrid
            value={draftGrid.position || "center-center"}
            options={POSITION_OPTIONS}
            onChange={pos => setDraftGrid(prev => ({ ...prev, position: pos }))}
            margin={
              draftGrid.margin ?? { top: 0, bottom: 0, left: 0, right: 0 }
            }
            onMarginChange={handleMarginChange}
          />
        </>
      );
    }

    // === CSS ===
    if (primaryTab === "css") {
      return (
        <>
          <label className={cx("subGroupTitle")}>
            {t("sidebar.css.title")}
          </label>
          <textarea
            className={cx("cssInput")}
            value={draftCSS}
            onChange={e => setDraftCSS(e.target.value)}
            placeholder={t("sidebar.css.placeholder")}
            spellCheck={false}
          />
        </>
      );
    }

    // === 그룹 관리 ===
    if (primaryTab === "groups") {
      return (
        <BookmarkTreeSelector
          bookmarks={orderedTree}
          rootPath={rootPath}
          groupPreferences={groupPreferences}
          onSelectRoot={onSelectRoot}
          onSiblingReorder={onSiblingReorder}
          onToggleVisibility={onToggleVisibility}
        />
      );
    }

    // === 일반 ===
    if (primaryTab === "general") {
      return (
        <>
          <label className={cx("subGroupTitle")}>
            {t("sidebar.general.language")}
          </label>
          <div className={cx("languageSelect")}>
            {(
              [
                ["en", "English"],
                ["ko", "한국어"],
                ["ja", "日本語"]
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                className={cx("languageButton", {
                  "languageButton-active": locale === code
                })}
                onClick={() => onLocaleChange(code)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className={cx("settingLabel")}>
            <input
              type="checkbox"
              checked={draftSettings.isOpenInNewTab}
              onChange={e =>
                setDraftSettings(prev => ({
                  ...prev,
                  isOpenInNewTab: e.target.checked
                }))
              }
              className={cx("checkboxInput")}
            />
            <span className={cx("checkboxLabel")}>
              {t("sidebar.general.openInNewTab")}
            </span>
          </label>

          <label className={cx("subGroupTitle")}>
            {t("sidebar.general.exportImport")}
          </label>
          <div className={cx("exportImportRow")}>
            <button
              className={cx("actionButton")}
              onClick={handleExportSettings}
            >
              {t("sidebar.general.export")}
            </button>
            <button
              className={cx("actionButton")}
              onClick={() => settingsFileRef.current?.click()}
            >
              {t("sidebar.general.import")}
            </button>
            <input
              ref={settingsFileRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleImportSettingsFile}
            />
          </div>

          <label className={cx("subGroupTitle")}>
            {t("sidebar.general.reset")}
          </label>
          <button
            className={cx("resetButton")}
            onClick={async () => {
              await onThemeReset();
              window.location.reload();
            }}
          >
            {t("sidebar.general.resetTheme")}
          </button>
          <button
            onClick={() => {
              const { ...options } = defaultOptionValue;
              storage.sync.set(options);
              window.location.reload();
            }}
            className={cx("resetButton")}
          >
            {t("sidebar.general.resetAll")}
          </button>

          <label className={cx("subGroupTitle")}>
            {t("sidebar.general.credits")}
          </label>
          <div className={cx("creditsList")}>
            <div className={cx("creditsItem")}>
              <a
                href="https://x.com/FlogLammer"
                target="_blank"
                rel="noopener noreferrer"
                className={cx("creditsName")}
              >
                @FlogLammer
              </a>
              <span className={cx("creditsRole")}>
                {t("sidebar.general.credits.dev")}
              </span>
            </div>
            <div className={cx("creditsItem")}>
              <a
                href="https://x.com/dn_blanked"
                target="_blank"
                rel="noopener noreferrer"
                className={cx("creditsName")}
              >
                @dn_blanked
              </a>
              <span className={cx("creditsRole")}>
                {t("sidebar.general.credits.planning")}
              </span>
            </div>
          </div>
          <div className={cx("creditsLinks")}>
            {/* TODO: GitHub URL 확정 후 교체 */}
            <a href="#" className={cx("creditsLink")}>
              {t("sidebar.general.credits.github")}
            </a>
            {/* TODO: README URL 확정 후 교체 */}
            <a href="#" className={cx("creditsLink")}>
              {t("sidebar.general.credits.readme")}
            </a>
            {/* TODO: Postype URL 확정 후 교체 */}
            <a href="#" className={cx("creditsLink")}>
              {t("sidebar.general.credits.postype")}
            </a>
            {/* TODO: GitHub Issues URL 확정 후 교체 */}
            <a href="#" className={cx("creditsLink")}>
              {t("sidebar.general.credits.bugReport")}
            </a>
            <a
              href="https://star-light.space"
              target="_blank"
              rel="noopener noreferrer"
              className={cx("creditsLink")}
            >
              {t("sidebar.general.credits.homepage")}
            </a>
            <a
              href="https://coff.ee/starlight.space"
              target="_blank"
              rel="noopener noreferrer"
              className={cx("creditsLink")}
            >
              {t("sidebar.general.credits.buyMeACoffee")}
            </a>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className={cx("overlay")} onClick={handleCancel}>
      <div className={cx("modal")} onClick={e => e.stopPropagation()}>
        <div className={cx("tab-bar-primary")}>
          {primaryTabs.map(tab => (
            <button
              key={tab.key}
              className={cx("tab-primary", {
                "tab-active": primaryTab === tab.key
              })}
              onClick={() => setPrimaryTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={cx("modal-body", { "has-sidebar": subTabs.length > 0 })}
        >
          {subTabs.length > 0 && (
            <div className={cx("tab-bar-secondary")}>
              {subTabs.map(tab => (
                <button
                  key={tab.key}
                  className={cx("tab-secondary", {
                    "tab-secondary-active": currentSub === tab.key
                  })}
                  onClick={() => setCurrentSub(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className={cx("tab-content")}>
            {renderMockup()}
            {renderContent()}
          </div>
        </div>

        <div className={cx("modal-footer")}>
          <button className={cx("cancel-button")} onClick={handleCancel}>
            {t("sidebar.cancel")}
          </button>
          <button
            className={cx("save-button")}
            disabled={!isDirty}
            onClick={handleSave}
          >
            {t("sidebar.save")}
          </button>
        </div>

        {showConfirm && (
          <div className={cx("confirm-overlay")}>
            <div className={cx("confirm-box")}>
              <p>{t("sidebar.confirm.unsavedChanges")}</p>
              <div className={cx("confirm-actions")}>
                <Button onClick={handleConfirmDiscard}>
                  {t("sidebar.confirm.yes")}
                </Button>
                <Button
                  variant={"primary"}
                  onClick={() => setShowConfirm(false)}
                >
                  {t("sidebar.confirm.no")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
