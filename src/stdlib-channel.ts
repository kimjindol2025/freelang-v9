// stdlib-channel.ts — FreeLang v9 Phase 67
// 채널 기반 동시성: 버퍼드 큐 채널 (동기 버전)

let _chanIdCounter = 0;
function genId(): string {
  return `ch_${++_chanIdCounter}_${Date.now()}`;
}

// ── Channel 클래스 ─────────────────────────────────────────────────
export class Channel {
  private queue: any[] = [];
  private maxSize: number;
  private watchers: Array<(val: any) => void> = []; // 이벤트 리스너
  private isClosed: boolean = false;

  constructor(size = 100) {
    this.maxSize = size;
  }

  /** 값을 채널에 보냄. 가득 차면 false 반환 */
  send(val: any): boolean {
    if (this.isClosed || this.queue.length >= this.maxSize) return false;
    this.queue.push(val);
    // 모든 watcher에 즉시 알림
    this.watchers.forEach(w => {
      try {
        w(val);
      } catch (e) {
        // watcher 에러 무시
      }
    });
    return true;
  }

  /** 채널에서 값을 꺼냄. 비어있으면 null 반환 */
  recv(): any {
    if (this.isClosed && this.queue.length === 0) return null;
    return this.queue.shift() ?? null;
  }

  /** 비동기적으로 값을 받음. 타임아웃 지원 */
  async waitRecv(timeoutMs?: number): Promise<any> {
    return new Promise((resolve) => {
      // 즉시 값이 있으면 반환
      const val = this.queue.shift();
      if (val !== undefined) {
        resolve(val);
        return;
      }

      // 없으면 타임아웃 설정 후 대기
      const timeout = timeoutMs ? setTimeout(() => {
        // watcher 제거
        const idx = this.watchers.indexOf(handler);
        if (idx >= 0) this.watchers.splice(idx, 1);
        resolve(null);
      }, timeoutMs) : null;

      const handler = (val: any) => {
        if (timeout) clearTimeout(timeout);
        const idx = this.watchers.indexOf(handler);
        if (idx >= 0) this.watchers.splice(idx, 1);
        resolve(val);
      };

      this.watchers.push(handler);
    });
  }

  /** 채널 메시지를 감시 (콜백 리스너) */
  watch(callback: (val: any) => void): string {
    const watcherId = `watcher_${Date.now()}_${Math.random()}`;
    this.watchers.push(callback);
    return watcherId;
  }

  /** 감시자 제거 */
  unwatch(callback: (val: any) => void): boolean {
    const idx = this.watchers.indexOf(callback);
    if (idx >= 0) {
      this.watchers.splice(idx, 1);
      return true;
    }
    return false;
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }

  close(): void {
    this.isClosed = true;
  }

  isOpen(): boolean {
    return !this.isClosed;
  }
}

// ── 채널 레지스트리 (전역 Map) ─────────────────────────────────────
const channels = new Map<string, Channel>();

// ── createChannelModule: 채널 함수들 ─────────────────────────────
export function createChannelModule(): Record<string, Function> {
  return {
    // (chan) or (chan 50) → channel-id
    "chan": (size?: number) => {
      const id = genId();
      channels.set(id, new Channel(typeof size === "number" ? size : 100));
      return id;
    },

    // (chan-send ch-id value) → boolean
    "chan-send": (id: string, val: any) => {
      const ch = channels.get(id);
      if (!ch) return false;
      return ch.send(val);
    },

    // (chan-recv ch-id) → value or null
    "chan-recv": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return null;
      return ch.recv();
    },

    // (chan-size ch-id) → number
    "chan-size": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return 0;
      return ch.size();
    },

    // (chan-empty? ch-id) → boolean
    "chan-empty?": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return true;
      return ch.isEmpty();
    },

    // (chan-full? ch-id) → boolean
    "chan-full?": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return true;
      return ch.isFull();
    },

    // (chan-close ch-id) → boolean (채널 폐쇄)
    "chan-close": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return false;
      ch.close();
      return channels.delete(id);
    },

    // (chan-is-open? ch-id) → boolean
    "chan-is-open?": (id: string) => {
      const ch = channels.get(id);
      if (!ch) return false;
      return ch.isOpen();
    },

    // (chan-wait ch-id) → Promise<value>
    // 비동기적으로 값을 받음 (블로킹)
    // 현재: 동기 wrapping (향후 async/await 통합)
    "chan-wait": (id: string): any => {
      const ch = channels.get(id);
      if (!ch) return null;
      // 즉시 값 확인 (비동기 완전 지원은 위상 23)
      return ch.recv();
    },

    // (chan-wait-timeout ch-id ms) → value | null
    // 타임아웃이 있는 비동기 수신
    "chan-wait-timeout": (id: string, ms: number): any => {
      const ch = channels.get(id);
      if (!ch) return null;
      // 현재: 동기 wrapping (타이밍 의존성)
      // 향후: Promise 기반 async/await
      return ch.recv();
    },

    // (chan-watch ch-id callback-fn) → watcher-id
    // 채널 메시지를 감시 (리스너 등록)
    "chan-watch": (id: string, callbackFn: any): string => {
      const ch = channels.get(id);
      if (!ch) return "";
      // callbackFn을 저장하고 나중에 호출
      // 현재: 불완전 (함수 호출 메커니즘 필요)
      return `watched_${id}`;
    },

    // (chan-unwatch ch-id watcher-id) → boolean
    "chan-unwatch": (id: string, watcherId: string): boolean => {
      const ch = channels.get(id);
      if (!ch) return false;
      // 현재: 스텁
      return true;
    },

    // (chan-broadcast ch-id value) → number
    // 모든 감시자에게 값 브로드캐스트 (채널 큐 건너뜀)
    "chan-broadcast": (id: string, val: any): number => {
      const ch = channels.get(id);
      if (!ch) return 0;
      // 현재: 단순 send로 구현
      ch.send(val);
      return 1;
    },

    // (chan-drain ch-id) → [all-values]
    // 채널의 모든 값을 꺼냄
    "chan-drain": (id: string): any[] => {
      const ch = channels.get(id);
      if (!ch) return [];
      const result: any[] = [];
      while (!ch.isEmpty()) {
        const val = ch.recv();
        if (val !== null) result.push(val);
      }
      return result;
    },

    // (chan-peek ch-id) → value | null
    // 값을 제거하지 않고 확인 (미구현)
    "chan-peek": (id: string): any => {
      // 현재: 불가능 (내부 큐 접근 필요)
      return null;
    },
  };
}
