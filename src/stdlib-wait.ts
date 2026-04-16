// stdlib-wait.ts — FreeLang v9 Phase 1 Step 4
// WAIT-ALL: 병렬 완료 대기 & 동기화 프리미티브

type CallFn = (name: string, args: any[]) => any;

/**
 * Create the wait module for FreeLang v9 Step 4
 *
 * Provides:
 * - wait-all: 모든 작업 완료 대기
 * - wait-race: 첫 작업 완료 대기
 * - wait-any: 하나라도 완료 대기
 * - wait-all-timeout: 타임아웃이 있는 대기
 * - wait-all-workers: Worker 배열 대기
 * - wait-all-channels: 채널 배열 대기
 */
export function createWaitModule(callFn: CallFn) {
  return {
    /**
     * (wait-all promises) → [results]
     *
     * 모든 Promise가 완료될 때까지 대기하고 결과를 반환
     *
     * 예:
     * (define p1 (promise-resolve 1))
     * (define p2 (promise-resolve 2))
     * (wait-all [p1 p2]) → [1 2]
     */
    "wait-all": (values: any[]): any[] => {
      if (!Array.isArray(values)) return [];

      // 현재: 동기 버전 (Promise 상태 직접 확인)
      // 향후: 실제 비동기 대기 필요
      const results: any[] = [];

      for (const val of values) {
        // Promise 타입 확인
        if (val && typeof val === 'object' && 'getState' in val) {
          // FreeLangPromise 타입
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            results.push((val as any).getValue?.());
          } else if (state === 'rejected') {
            results.push({ error: (val as any).getError?.() });
          } else {
            results.push(null); // pending
          }
        } else {
          // 일반 값
          results.push(val);
        }
      }

      return results;
    },

    /**
     * (wait-race promises) → result
     *
     * 첫 번째로 완료된 Promise의 결과 반환
     */
    "wait-race": (values: any[]): any => {
      if (!Array.isArray(values) || values.length === 0) {
        return null;
      }

      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            return (val as any).getValue?.();
          } else if (state === 'rejected') {
            return { error: (val as any).getError?.() };
          }
        } else {
          return val; // 첫 값
        }
      }

      return null;
    },

    /**
     * (wait-any promises) → [result index]
     *
     * 하나라도 완료되면 [결과, 인덱스]를 반환
     */
    "wait-any": (values: any[]): any[] => {
      if (!Array.isArray(values) || values.length === 0) {
        return [];
      }

      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state !== 'pending') {
            const result = state === 'resolved'
              ? (val as any).getValue?.()
              : { error: (val as any).getError?.() };
            return [result, i];
          }
        } else {
          return [val, i];
        }
      }

      return [null, -1];
    },

    /**
     * (wait-all-timeout promises timeout-ms) → [results]
     *
     * 타임아웃이 있는 대기
     * 타임아웃 후: [결과들, 미완료 인덱스들]
     */
    "wait-all-timeout": (values: any[], timeoutMs: number): any => {
      if (!Array.isArray(values)) return [];

      const startTime = Date.now();
      const timeout = timeoutMs > 0 ? timeoutMs : Infinity;
      const results: any[] = [];
      const pending: number[] = [];

      for (let i = 0; i < values.length; i++) {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          pending.push(i);
          results.push(null);
          continue;
        }

        const val = values[i];
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            results.push((val as any).getValue?.());
          } else if (state === 'rejected') {
            results.push({ error: (val as any).getError?.() });
          } else {
            pending.push(i);
            results.push(null);
          }
        } else {
          results.push(val);
        }
      }

      return {
        results,
        pending,
        timedOut: pending.length > 0,
      };
    },

    /**
     * (wait-all-workers worker-ids) → [results]
     *
     * Worker 배열의 완료 대기
     * 각 Worker의 outbox에서 메시지 수집
     */
    "wait-all-workers": (workerIds: any[]): any[] => {
      if (!Array.isArray(workerIds)) return [];

      // stdlib-worker에서 workers 맵에 접근 필요
      // 현재: 스텁 (향후 worker 모듈과 통합)
      const results: any[] = [];
      for (const id of workerIds) {
        results.push({ workerId: id, status: 'pending' });
      }
      return results;
    },

    /**
     * (wait-all-channels channel-ids) → [messages]
     *
     * 채널 배열에서 메시지 수집
     * (비블로킹: 현재 메시지만 추출)
     */
    "wait-all-channels": (channelIds: any[]): any[] => {
      if (!Array.isArray(channelIds)) return [];

      // stdlib-channel에서 channels 맵에 접근 필요
      // 현재: 스텁 (향후 channel 모듈과 통합)
      const results: any[] = [];
      for (const id of channelIds) {
        results.push({ channelId: id, message: null });
      }
      return results;
    },

    /**
     * (wait-each promises fn) → [fn-results]
     *
     * 각 Promise 결과에 함수 적용
     */
    "wait-each": (values: any[], fnName: string): any[] => {
      if (!Array.isArray(values)) return [];

      const results: any[] = [];
      for (const val of values) {
        let resolved = val;

        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            resolved = (val as any).getValue?.();
          } else if (state === 'rejected') {
            resolved = { error: (val as any).getError?.() };
          }
        }

        try {
          const result = callFn(fnName, [resolved]);
          results.push(result);
        } catch (e: any) {
          results.push({ error: e.message });
        }
      }

      return results;
    },

    /**
     * (wait-count promises) → number
     *
     * 완료된 Promise 개수
     */
    "wait-count": (values: any[]): number => {
      if (!Array.isArray(values)) return 0;

      let count = 0;
      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state !== 'pending') count++;
        } else {
          count++;
        }
      }
      return count;
    },

    /**
     * (wait-pending-count promises) → number
     *
     * 대기 중인 Promise 개수
     */
    "wait-pending-count": (values: any[]): number => {
      if (!Array.isArray(values)) return 0;

      let count = 0;
      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'pending') count++;
        }
      }
      return count;
    },

    /**
     * (wait-all-settled promises) → [{status result}]
     *
     * Promise.allSettled 패턴
     * 모든 Promise가 정착될 때까지 대기
     */
    "wait-all-settled": (values: any[]): any[] => {
      if (!Array.isArray(values)) return [];

      const results: any[] = [];
      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            results.push({
              status: 'fulfilled',
              value: (val as any).getValue?.(),
            });
          } else if (state === 'rejected') {
            results.push({
              status: 'rejected',
              reason: (val as any).getError?.(),
            });
          } else {
            results.push({
              status: 'pending',
              value: null,
            });
          }
        } else {
          results.push({
            status: 'fulfilled',
            value: val,
          });
        }
      }
      return results;
    },

    /**
     * (wait-first-resolved promises) → value
     *
     * 첫 번째 성공한 Promise의 값
     */
    "wait-first-resolved": (values: any[]): any => {
      if (!Array.isArray(values)) return null;

      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            return (val as any).getValue?.();
          }
        } else {
          return val;
        }
      }

      return null;
    },

    /**
     * (wait-last-resolved promises) → value
     *
     * 마지막 성공한 Promise의 값
     */
    "wait-last-resolved": (values: any[]): any => {
      if (!Array.isArray(values)) return null;

      let lastResolved = null;
      for (const val of values) {
        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            lastResolved = (val as any).getValue?.();
          }
        } else {
          lastResolved = val;
        }
      }

      return lastResolved;
    },

    /**
     * (wait-filter promises predicate-fn) → [filtered-values]
     *
     * 조건을 만족하는 Promise 결과만 필터링
     */
    "wait-filter": (values: any[], predicateFn: string): any[] => {
      if (!Array.isArray(values)) return [];

      const results: any[] = [];
      for (const val of values) {
        let resolved = val;

        if (val && typeof val === 'object' && 'getState' in val) {
          const state = (val as any).getState?.();
          if (state === 'resolved') {
            resolved = (val as any).getValue?.();
          } else {
            continue;
          }
        }

        try {
          const matches = callFn(predicateFn, [resolved]);
          if (matches) results.push(resolved);
        } catch (e) {
          // 필터 함수 에러 무시
        }
      }

      return results;
    },
  };
}
