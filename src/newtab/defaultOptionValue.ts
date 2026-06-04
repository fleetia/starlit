import { OptionsType } from "./types";

export const defaultOptionValue: OptionsType = {
  bookmarks: [
    {
      title: "default",
      description: "default list",
      list: [
        {
          id: "000",
          title: "Buy me a coffee",
          url: "https://coff.ee/starlight.space",
          favicon:
            "https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://buymeacoffee.com&size=32"
        }
      ]
    }
  ],
  gridSettings: {
    columns: 5,
    horizontalColumns: 1,
    rows: 3,
    gap: "1em",
    position: "center-center",
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    background: {
      color: "rgba(255, 255, 255, 0.8)",
      border: "1px solid black",
      text: "black",
      gridImage: undefined
    },
    icon: {
      color: "white",
      border: "1px solid black",
      text: "black"
    },
    heading: {
      titleColor: "#000000",
      subtitleColor: "#999999",
      borderEnabled: false,
      borderWidth: 1,
      borderColor: "#000000",
      subtitleHoverColor: "#000000"
    }
  },
  settings: {
    isFolderEnabled: true,
    isVisibleOnce: false,
    isOpenInNewTab: false,
    isExpandView: false
  },
  colorTheme: {
    accent: "#000000",
    accentText: "#ffffff",
    surface: "#ffffff",
    text: "#000000",
    border: "#000000",
    hoverBg: "#000000",
    hoverText: "#ffffff",
    muted: "#999999"
  },
  backgroundImage: "",
  displaySize: 16
};
