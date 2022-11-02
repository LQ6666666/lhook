import { UnwrapRef, WatchSource, Ref } from "vue";
import { reactive, onMounted, toRefs, watch } from "vue";

type Request<D, P extends any[]> = (...args: P) => Promise<D>;

interface RequestOptions<D, P extends any[]> {
  /** 是否手动发起请求 */
  manual?: boolean;

  /** 当 manual 为 false 时，自动执行的默认参数 */
  params?: P;

  /** 依赖项更新 */
  refreshDeps?: WatchSource<any>[];

  // 成功回调
  onSuccess?: (response: D, params: P) => void;

  // 失败回调
  onError?: (err: Error, params: P) => void;
}

interface RequestResult<D> {
  data: D | undefined;
  loading: boolean;
  error?: Error;
}

interface Error {
  name: string;
  message: string;
  stack?: string | undefined;
  cause?: unknown;
}

type RequestReturnType<D, P extends any[]> = {
  readonly data: Ref<UnwrapRef<D> | undefined>;
  readonly loading: Ref<boolean>;
  readonly error?: Ref<Error | undefined>;
  readonly run: (...args: P) => Promise<D>;
};

export function useRequest<D, P extends any[]>(
  requestFn: Request<D, P>,
  options: RequestOptions<D, P> = {}
): RequestReturnType<D, P> {
  const { manual = false, params = [] as unknown as P, refreshDeps } = options;

  const state = reactive<RequestResult<D>>({
    data: undefined,
    loading: false,
    error: undefined
  });

  const run = (...args: P) => {
    state.loading = true;

    const resultPromise = requestFn(...args);

    resultPromise
      .then(resultData => {
        state.data = resultData as UnwrapRef<D>;

        options.onSuccess?.(resultData, args);
      })
      .catch((error: Error) => {
        state.error = error;

        options.onError?.(error, args);
      })
      .finally(() => {
        state.loading = false;
      });

    return resultPromise;
  };

  onMounted(() => {
    if (!manual) {
      run(...params);
    }
  });

  // 依赖更新
  if (refreshDeps) {
    watch(
      refreshDeps,
      () => {
        run(...params);
      },
      { deep: true }
    );
  }

  return { run, ...toRefs(state) } as const;
}
