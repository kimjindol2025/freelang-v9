// stdlib-mutex.ts — FreeLang v9 Phase 1 Step 3
// MUTEX & Semaphore: 공유 상태 보호 및 동기화

type CallFn = (name: string, args: any[]) => any;

// ─────────────────────────────────────────────────────────────────────

/**
 * SimpleMutex: 스핀락 기반 단순 뮤텍스
 *
 * 사용:
 * 1. (define m (mutex-create))
 * 2. (mutex-lock m (fn [] (critical-section)))
 * 3. (mutex-unlock m)
 */
export class SimpleMutex {
  private locked: boolean = false;
  private queue: Array<() => void> = [];

  /**
   * 뮤텍스 획득 시도 (논블로킹)
   * @returns true 획득 성공, false 이미 잠금
   */
  tryLock(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  /**
   * 뮤텍스 해제
   */
  unlock(): void {
    if (!this.locked) {
      console.warn("mutex-unlock: 잠금 해제되지 않은 뮤텍스");
      return;
    }

    // 대기 중인 함수 하나 실행
    const next = this.queue.shift();
    if (next) {
      // 다음 콜러가 lock을 유지하면서 실행
      try {
        next();
      } finally {
        this.locked = false;
      }
    } else {
      this.locked = false;
    }
  }

  /**
   * 뮤텍스를 획득하고 함수 실행
   * (동기 버전)
   */
  lock(fn: () => any): any {
    // 스핀락: 획득할 때까지 대기
    let maxRetries = 10000;
    while (!this.tryLock() && maxRetries-- > 0) {
      // 바쁜 대기 (busy wait)
      // 실제 구현: yield/sleep 필요
    }

    if (!this.locked) {
      throw new Error("mutex-lock: 뮤텍스 획득 타임아웃");
    }

    try {
      return fn();
    } finally {
      this.unlock();
    }
  }

  /**
   * 뮤텍스 상태 확인
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * 대기 중인 호출자 개수
   */
  waitingCount(): number {
    return this.queue.length;
  }
}

// ─────────────────────────────────────────────────────────────────────

/**
 * Semaphore: 카운터 기반 세마포어
 *
 * 사용:
 * 1. (define s (semaphore-create 3))  ; 3개 슬롯
 * 2. (semaphore-acquire s)
 * 3. (semaphore-release s)
 */
export class Semaphore {
  private count: number;
  private maxCount: number;
  private queue: Array<() => void> = [];

  constructor(initialCount: number = 1) {
    this.count = Math.max(0, initialCount);
    this.maxCount = initialCount;
  }

  /**
   * 세마포어 획득 (카운트 감소)
   * @returns true 획득 성공, false 재시도 필요
   */
  tryAcquire(): boolean {
    if (this.count > 0) {
      this.count--;
      return true;
    }
    return false;
  }

  /**
   * 세마포어 해제 (카운트 증가)
   */
  release(): boolean {
    if (this.count < this.maxCount) {
      this.count++;
      // 대기 중인 호출자 깨우기
      const next = this.queue.shift();
      if (next) {
        setImmediate(next);
      }
      return true;
    }
    return false;
  }

  /**
   * 현재 가용 슬롯 개수
   */
  available(): number {
    return this.count;
  }

  /**
   * 최대 슬롯 개수
   */
  capacity(): number {
    return this.maxCount;
  }

  /**
   * 대기 중인 호출자 개수
   */
  waitingCount(): number {
    return this.queue.length;
  }

  /**
   * 사용률 (0.0 ~ 1.0)
   */
  utilization(): number {
    return (this.maxCount - this.count) / this.maxCount;
  }
}

// ─────────────────────────────────────────────────────────────────────

/**
 * ReadWriteMutex: 읽기/쓰기 뮤텍스
 *
 * 여러 읽기 동시 진행, 쓰기는 배타적
 */
export class ReadWriteMutex {
  private readCount: number = 0;
  private writeCount: number = 0;
  private isWriting: boolean = false;
  private readWaiters: Array<() => void> = [];
  private writeWaiters: Array<() => void> = [];

  /**
   * 읽기 잠금 획득
   */
  tryLockRead(): boolean {
    if (this.isWriting || this.writeWaiters.length > 0) {
      return false;
    }
    this.readCount++;
    return true;
  }

  /**
   * 읽기 잠금 해제
   */
  unlockRead(): void {
    this.readCount--;
    if (this.readCount === 0 && this.writeWaiters.length > 0) {
      // 쓰기 대기자 깨우기
      const next = this.writeWaiters.shift();
      if (next) setImmediate(next);
    }
  }

  /**
   * 쓰기 잠금 획득
   */
  tryLockWrite(): boolean {
    if (this.isWriting || this.readCount > 0) {
      return false;
    }
    this.isWriting = true;
    this.writeCount++;
    return true;
  }

  /**
   * 쓰기 잠금 해제
   */
  unlockWrite(): void {
    this.isWriting = false;
    this.writeCount--;

    // 다른 읽기자들 깨우기
    while (this.readWaiters.length > 0) {
      const next = this.readWaiters.shift();
      if (next) setImmediate(next);
    }
  }

  /**
   * 상태 조회
   */
  status(): Record<string, number | boolean> {
    return {
      readCount: this.readCount,
      writeCount: this.writeCount,
      isWriting: this.isWriting,
      readWaiters: this.readWaiters.length,
      writeWaiters: this.writeWaiters.length,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────

// 전역 뮤텍스 레지스트리
let _mutexIdCounter = 0;
function genMutexId(): string {
  return `mutex_${++_mutexIdCounter}_${Date.now()}`;
}

const mutexes = new Map<string, SimpleMutex>();
const semaphores = new Map<string, Semaphore>();
const rwmutexes = new Map<string, ReadWriteMutex>();

// ─────────────────────────────────────────────────────────────────────

/**
 * Create the mutex module for FreeLang v9 Step 3
 *
 * Provides:
 * - mutex-create: 뮤텍스 생성
 * - mutex-lock: 뮤텍스 획득 후 함수 실행
 * - mutex-try-lock: 뮤텍스 획득 시도
 * - mutex-unlock: 뮤텍스 해제
 * - semaphore-create: 세마포어 생성
 * - semaphore-acquire: 세마포어 획득
 * - semaphore-release: 세마포어 해제
 * - rwmutex-create: 읽기/쓰기 뮤텍스 생성
 * - rwmutex-lock-read: 읽기 잠금
 * - rwmutex-lock-write: 쓰기 잠금
 */
export function createMutexModule(callFn: CallFn) {
  return {
    /**
     * (mutex-create) → mutex-id
     *
     * 새 뮤텍스 생성
     */
    "mutex-create": (): string => {
      const id = genMutexId();
      mutexes.set(id, new SimpleMutex());
      return id;
    },

    /**
     * (mutex-lock mutex-id fn-name args) → result
     *
     * 뮤텍스를 획득하고 함수 실행
     * (단순화: 콜백 함수명 기반)
     */
    "mutex-lock": (mutexId: string, fnName: string, args: any[] = []): any => {
      const mutex = mutexes.get(mutexId);
      if (!mutex) {
        throw new Error(`mutex-lock: 존재하지 않는 뮤텍스 ${mutexId}`);
      }

      try {
        return mutex.lock(() => callFn(fnName, args));
      } catch (e: any) {
        throw new Error(`mutex-lock: ${e.message}`);
      }
    },

    /**
     * (mutex-try-lock mutex-id) → boolean
     *
     * 뮤텍스 획득 시도 (블로킹 없음)
     */
    "mutex-try-lock": (mutexId: string): boolean => {
      const mutex = mutexes.get(mutexId);
      if (!mutex) return false;
      return mutex.tryLock();
    },

    /**
     * (mutex-unlock mutex-id) → void
     *
     * 뮤텍스 해제
     */
    "mutex-unlock": (mutexId: string): void => {
      const mutex = mutexes.get(mutexId);
      if (mutex) {
        mutex.unlock();
      }
    },

    /**
     * (mutex-is-locked? mutex-id) → boolean
     */
    "mutex-is-locked?": (mutexId: string): boolean => {
      const mutex = mutexes.get(mutexId);
      if (!mutex) return false;
      return mutex.isLocked();
    },

    /**
     * (mutex-waiting-count mutex-id) → number
     *
     * 대기 중인 호출자 개수
     */
    "mutex-waiting-count": (mutexId: string): number => {
      const mutex = mutexes.get(mutexId);
      if (!mutex) return 0;
      return mutex.waitingCount();
    },

    /**
     * (mutex-delete mutex-id) → boolean
     */
    "mutex-delete": (mutexId: string): boolean => {
      return mutexes.delete(mutexId);
    },

    // ─────────────────────────────────────────────────────────────────

    /**
     * (semaphore-create count) → semaphore-id
     *
     * 세마포어 생성 (초기 카운트)
     */
    "semaphore-create": (count: number = 1): string => {
      const id = genMutexId(); // 같은 ID 체계 사용
      semaphores.set(id, new Semaphore(Math.max(0, count)));
      return id;
    },

    /**
     * (semaphore-acquire sem-id) → boolean
     *
     * 세마포어 획득 (카운트 감소)
     */
    "semaphore-acquire": (semId: string): boolean => {
      const sem = semaphores.get(semId);
      if (!sem) return false;
      return sem.tryAcquire();
    },

    /**
     * (semaphore-release sem-id) → boolean
     *
     * 세마포어 해제 (카운트 증가)
     */
    "semaphore-release": (semId: string): boolean => {
      const sem = semaphores.get(semId);
      if (!sem) return false;
      return sem.release();
    },

    /**
     * (semaphore-available sem-id) → number
     *
     * 현재 가용 슬롯 개수
     */
    "semaphore-available": (semId: string): number => {
      const sem = semaphores.get(semId);
      if (!sem) return 0;
      return sem.available();
    },

    /**
     * (semaphore-capacity sem-id) → number
     *
     * 최대 슬롯 개수
     */
    "semaphore-capacity": (semId: string): number => {
      const sem = semaphores.get(semId);
      if (!sem) return 0;
      return sem.capacity();
    },

    /**
     * (semaphore-utilization sem-id) → number (0.0 ~ 1.0)
     */
    "semaphore-utilization": (semId: string): number => {
      const sem = semaphores.get(semId);
      if (!sem) return 0;
      return sem.utilization();
    },

    /**
     * (semaphore-delete sem-id) → boolean
     */
    "semaphore-delete": (semId: string): boolean => {
      return semaphores.delete(semId);
    },

    // ─────────────────────────────────────────────────────────────────

    /**
     * (rwmutex-create) → rwmutex-id
     *
     * 읽기/쓰기 뮤텍스 생성
     */
    "rwmutex-create": (): string => {
      const id = genMutexId();
      rwmutexes.set(id, new ReadWriteMutex());
      return id;
    },

    /**
     * (rwmutex-lock-read rwmutex-id) → boolean
     */
    "rwmutex-lock-read": (rwmId: string): boolean => {
      const rwm = rwmutexes.get(rwmId);
      if (!rwm) return false;
      return rwm.tryLockRead();
    },

    /**
     * (rwmutex-unlock-read rwmutex-id) → void
     */
    "rwmutex-unlock-read": (rwmId: string): void => {
      const rwm = rwmutexes.get(rwmId);
      if (rwm) rwm.unlockRead();
    },

    /**
     * (rwmutex-lock-write rwmutex-id) → boolean
     */
    "rwmutex-lock-write": (rwmId: string): boolean => {
      const rwm = rwmutexes.get(rwmId);
      if (!rwm) return false;
      return rwm.tryLockWrite();
    },

    /**
     * (rwmutex-unlock-write rwmutex-id) → void
     */
    "rwmutex-unlock-write": (rwmId: string): void => {
      const rwm = rwmutexes.get(rwmId);
      if (rwm) rwm.unlockWrite();
    },

    /**
     * (rwmutex-status rwmutex-id) → {map}
     */
    "rwmutex-status": (rwmId: string): Record<string, any> => {
      const rwm = rwmutexes.get(rwmId);
      if (!rwm) return {};
      return rwm.status();
    },

    /**
     * (rwmutex-delete rwmutex-id) → boolean
     */
    "rwmutex-delete": (rwmId: string): boolean => {
      return rwmutexes.delete(rwmId);
    },

    // ─────────────────────────────────────────────────────────────────

    /**
     * (mutex-cleanup) → number
     *
     * 모든 뮤텍스/세마포어 정리
     */
    "mutex-cleanup": (): number => {
      let count = mutexes.size + semaphores.size + rwmutexes.size;
      mutexes.clear();
      semaphores.clear();
      rwmutexes.clear();
      return count;
    },
  };
}
