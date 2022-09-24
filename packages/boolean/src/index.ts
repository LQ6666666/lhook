import { ref } from 'vue';

export function useBoolean(initialValue: boolean = false) {
  const value = ref(initialValue);

  const on = () => value.value = true;

  const off = () => value.value = false;

  const toggle = () => value.value = !value.value;

  return [value, { on, off, toggle }] as const;
}

export function useSwitch(initialValue: boolean = false) {
  const [value, { on, off, toggle }] = useBoolean(initialValue);
    return [value, on, off, toggle] as const;
}

export function useToggle(initialValue: boolean = false) {
    const [value, {toggle}] = useBoolean(initialValue);
    return [value, toggle] as const;
}
