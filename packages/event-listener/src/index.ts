import { onMounted, onUnmounted } from "vue";

export type Target = HTMLElement | Element | Window | Document;
type noop = (...p: any) => void;

interface Options<T extends Target = Target> extends AddEventListenerOptions {
  target?: T;
}

function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: Options<HTMLElement>
): void;
function useEventListener<K extends keyof ElementEventMap>(
  eventName: K,
  handler: (ev: ElementEventMap[K]) => void,
  options?: Options<Element>
): void;
function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (ev: DocumentEventMap[K]) => void,
  options?: Options<Document>
): void;
function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (ev: WindowEventMap[K]) => void,
  options?: Options<Window>
): void;
function useEventListener(eventName: string, handler: noop, options: Options): void;

function useEventListener(eventName: string, handler: noop, options: Options = {}) {
  const { target = window } = options;

  onMounted(() => {
    target.addEventListener(eventName, handler, options);
  });

  onUnmounted(() => {
    target.removeEventListener(eventName, handler, options);
  });
}

export { useEventListener };
