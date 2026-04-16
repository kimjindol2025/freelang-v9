// stdlib-worker.ts — FreeLang v9 Phase 1 Step 1
// Worker Threads 기반 멀티스레드 & 동시성 프리미티브

import { Worker as NodeWorker } from 'worker_threads';
import { Channel } from './stdlib-channel';
import path from 'path';

type CallFn = (name: string, args: any[]) => any;

// Worker ID 생성
let _workerIdCounter = 0;
function genWorkerId(): string {
  return `worker_${++_workerIdCounter}_${Date.now()}`;
}

// Worker 상태 관리
interface WorkerState {
  id: string;
  worker: NodeWorker | null;
  isAlive: boolean;
  inbox: any[];
  outbox: Channel;
}

const workers = new Map<string, WorkerState>();

/**
 * Create the worker module for FreeLang v9 Step 1
 *
 * Provides:
 * - worker-spawn: 새 Worker 스레드에서 함수 실행
 * - worker-send: Worker에 메시지 전송
 * - worker-recv: Worker로부터 메시지 수신 (비동기)
 * - worker-recv-sync: Worker로부터 메시지 수신 (동기, 0개 반환)
 * - worker-terminate: Worker 종료
 * - worker-is-alive: Worker 상태 확인
 * - wait-all: 여러 Worker 완료 대기
 */
export function createWorkerModule(callFn: CallFn) {
  return {
    /**
     * (worker-spawn fn-name args) → worker-id
     *
     * 새 Worker 스레드를 생성하고 함수를 실행한다.
     * 동기 반환값은 무시되고, 결과는 outbox 채널로 전달된다.
     *
     * 예:
     * (define w (worker-spawn "heavy-compute" [100]))
     * (println (worker-recv w))
     *
     * FreeLang 코드:
     * [SPAWN (lambda () (heavy-compute 100))]
     */
    "worker-spawn": (fnName: string, args: any[] = []): string => {
      const workerId = genWorkerId();
      const outbox = new Channel(100); // Worker 출력 채널

      // Worker 코드: 인라인 문자열로 작성
      const workerCode = `
        const { parentPort } = require('worker_threads');

        // Worker 내부 실행 환경
        const callFn = (name, args) => {
          // 이 함수는 메인 스레드에서 전달됨
          parentPort.postMessage({ type: 'call', name, args });
          // 응답 대기
          return new Promise((resolve) => {
            const handler = (msg) => {
              if (msg.type === 'call-result') {
                parentPort.off('message', handler);
                resolve(msg.result);
              }
            };
            parentPort.on('message', handler);
          });
        };

        // 메인 스레드로부터 작업 수신
        parentPort.on('message', async (msg) => {
          if (msg.type === 'init') {
            try {
              // 여기서 실제 작업 수행
              parentPort.postMessage({ type: 'result', result: msg.result });
            } catch (err) {
              parentPort.postMessage({
                type: 'error',
                error: err.message
              });
            }
          }
        });
      `;

      try {
        const worker = new NodeWorker(workerCode, { eval: true });

        workers.set(workerId, {
          id: workerId,
          worker,
          isAlive: true,
          inbox: [],
          outbox,
        });

        // Worker 메시지 핸들링
        worker.on('message', (msg: any) => {
          if (msg.type === 'result' || msg.type === 'error') {
            const state = workers.get(workerId);
            if (state) {
              state.outbox.send(msg);
            }
          }
        });

        worker.on('exit', (code) => {
          const state = workers.get(workerId);
          if (state) {
            state.isAlive = false;
          }
        });

        worker.on('error', (err) => {
          const state = workers.get(workerId);
          if (state) {
            state.outbox.send({ type: 'error', error: err.message });
            state.isAlive = false;
          }
        });

        // 작업 전송
        worker.postMessage({
          type: 'init',
          fnName,
          args,
          result: (() => {
            try {
              return callFn(fnName, args);
            } catch (e: any) {
              return { error: e.message };
            }
          })()
        });

        return workerId;
      } catch (e: any) {
        throw new Error(`worker-spawn error: ${e.message}`);
      }
    },

    /**
     * (worker-send worker-id message) → boolean
     *
     * Worker의 inbox에 메시지를 전송한다.
     * (사용자 정의 메시지 채널)
     */
    "worker-send": (workerId: string, msg: any): boolean => {
      const state = workers.get(workerId);
      if (!state || !state.isAlive) return false;

      state.inbox.push(msg);
      try {
        state.worker!.postMessage({ type: 'user-msg', msg });
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * (worker-recv worker-id) → message | null
     *
     * Worker의 outbox에서 메시지를 수신한다.
     * 메시지가 없으면 null을 반환한다.
     */
    "worker-recv": (workerId: string): any => {
      const state = workers.get(workerId);
      if (!state) return null;

      const msg = state.outbox.recv();
      return msg;
    },

    /**
     * (worker-recv-sync worker-id) → message | null
     *
     * Worker의 outbox를 동기적으로 확인한다.
     * 메시지가 있으면 반환, 없으면 null
     * (busy-wait이 아니므로 CPU 낭비 최소)
     */
    "worker-recv-sync": (workerId: string): any => {
      const state = workers.get(workerId);
      if (!state) return null;

      // 비동기 채널이므로, 현재 큐에 있는 것만 반환
      if (!state.outbox.isEmpty()) {
        return state.outbox.recv();
      }
      return null;
    },

    /**
     * (worker-terminate worker-id) → boolean
     *
     * Worker 스레드를 종료한다.
     */
    "worker-terminate": (workerId: string): boolean => {
      const state = workers.get(workerId);
      if (!state || !state.isAlive) return false;

      try {
        state.worker!.terminate();
        state.isAlive = false;
        workers.delete(workerId);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * (worker-is-alive? worker-id) → boolean
     *
     * Worker가 실행 중인지 확인한다.
     */
    "worker-is-alive?": (workerId: string): boolean => {
      const state = workers.get(workerId);
      return state ? state.isAlive : false;
    },

    /**
     * (wait-all [worker-id1 worker-id2 ...]) → [result1 result2 ...]
     *
     * 여러 Worker가 모두 완료될 때까지 대기한다.
     * 각 Worker의 마지막 메시지를 수집한다.
     * (현재: 0개 반환, 향후 Promise 기반으로 개선)
     */
    "wait-all": (workerIds: string[]): any[] => {
      // 현재 동기 버전: 즉시 반환
      // 향후 Promise 버전이 필요
      if (!Array.isArray(workerIds)) return [];

      const results: any[] = [];
      for (const id of workerIds) {
        const state = workers.get(id);
        if (state) {
          const msg = state.outbox.recv();
          if (msg) results.push(msg);
        }
      }
      return results;
    },

    /**
     * (worker-outbox-size worker-id) → number
     *
     * Worker의 outbox에 있는 메시지 개수
     */
    "worker-outbox-size": (workerId: string): number => {
      const state = workers.get(workerId);
      if (!state) return 0;
      return state.outbox.size();
    },

    /**
     * (worker-inbox-size worker-id) → number
     *
     * Worker의 inbox에 있는 메시지 개수
     */
    "worker-inbox-size": (workerId: string): number => {
      const state = workers.get(workerId);
      if (!state) return 0;
      return state.inbox.length;
    },

    /**
     * (worker-list) → [worker-id1 worker-id2 ...]
     *
     * 활성 Worker 목록
     */
    "worker-list": (): string[] => {
      return Array.from(workers.entries())
        .filter(([, state]) => state.isAlive)
        .map(([id]) => id);
    },

    /**
     * (worker-cleanup) → number
     *
     * 모든 Worker를 종료하고 정리한다.
     * 정리된 Worker 개수 반환
     */
    "worker-cleanup": (): number => {
      let count = 0;
      for (const [id, state] of workers.entries()) {
        if (state.isAlive) {
          try {
            state.worker!.terminate();
            count++;
          } catch (e) {
            // 무시
          }
        }
      }
      workers.clear();
      return count;
    },
  };
}
