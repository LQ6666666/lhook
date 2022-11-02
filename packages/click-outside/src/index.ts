import type { Ref } from "vue";

import { useDocumentEvent } from "@lhook/document-event";

export function useClickOutside(
  ref: Ref<HTMLElement>,
  callback: (e: MouseEvent | TouchEvent) => void
) {
  const testAndTrigger = (e: MouseEvent | TouchEvent) => {
    if (!ref.value?.contains(e.target as Element)) {
      callback(e);
    }
  };

  useDocumentEvent("mouseup", testAndTrigger, true);
  useDocumentEvent("touchstart", testAndTrigger, true);
}
