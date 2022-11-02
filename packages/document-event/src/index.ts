import { onMounted, onUnmounted } from "vue";

type EventNames = keyof DocumentEventMap;

type DocumentEventHandler<K extends EventNames> = (e: DocumentEventMap[K]) => any;

function useDocumentEvent<K extends EventNames>(
  eventName: K,
  fn: DocumentEventHandler<K>,
  options?: boolean | AddEventListenerOptions
) {
  onMounted(() => {
    document.addEventListener(eventName, fn, options);
  });

  onUnmounted(() => {
    document.removeEventListener(eventName, fn, options);
  });
}

export { useDocumentEvent };
