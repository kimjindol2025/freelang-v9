// stdlib-timeout.ts — v10.1 Phase 2.3: Timeout 정책 (Promise.race)

/**
 * Promise에 타임아웃 적용
 * @param promise 실행할 Promise
 * @param timeoutMs 타임아웃 밀리초
 * @param timeoutError 타임아웃 메시지
 * @returns timeout이 적용된 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    ),
  ]);
}

/**
 * 비동기 함수에 타임아웃 적용
 * @param fn 실행할 비동기 함수
 * @param timeoutMs 타임아웃 밀리초
 * @param timeoutError 타임아웃 메시지
 * @returns timeout이 적용된 결과
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError: string = `Operation timed out after ${timeoutMs}ms`
): Promise<T> {
  return withTimeout(fn(), timeoutMs, timeoutError);
}

// 표준 타임아웃 상수
export const DEFAULT_TIMEOUTS = {
  SQLITE: 5000,      // 5초
  HTTP: 30000,       // 30초
  STREAM_AI: 60000,  // 60초
  FILE_IO: 10000,    // 10초
};

class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export { TimeoutError };
