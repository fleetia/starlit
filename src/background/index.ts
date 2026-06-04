import storage from "@/utils/storage";
import { defaultOptionValue } from "@/newtab/defaultOptionValue";

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    storage.sync.set(defaultOptionValue);
  }
});
