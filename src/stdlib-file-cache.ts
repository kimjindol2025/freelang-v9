// stdlib-file-cache.ts — FreeLang v9 Step 53: 파일 기반 캐시 (TTL)

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

const CACHE_DIR = path.join(os.homedir(), '.freelang-cache');

// ✅ Step 5: 지연 초기화 (모듈 로드 시 fs 조작 제거)
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// ✅ Step 5: 자동 TTL 정리 (5분마다)
const gcInterval = setInterval(() => {
  try {
    ensureCacheDir();
    const now = Date.now();
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      try {
        const filePath = path.join(CACHE_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const entry = JSON.parse(content);
        if (entry.expiresAt < now) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  } catch {}
}, 5 * 60_000);
gcInterval.unref(); // 백그라운드 타이머

const fileCacheModule = {
  // Step 53: 캐시 설정
  "fcache-set": (key: string, data: any, ttlSeconds: number = 3600): boolean => {
    try {
      ensureCacheDir(); // ✅ Step 5: 지연 초기화

      // 키 해시 (SHA256)로 파일명 생성
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      const cacheEntry = {
        key,
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
      };

      fs.writeFileSync(filePath, JSON.stringify(cacheEntry), 'utf-8');
      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 53: 캐시 조회
  "fcache-get": (key: string): any => {
    try {
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      // ✅ Step 5: TOCTOU 제거 - try-catch로 직접 읽기
      const content = fs.readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(content);

      // TTL 확인
      if (entry.expiresAt < Date.now()) {
        try { fs.unlinkSync(filePath); } catch {}
        return null;
      }

      return entry.data;
    } catch (err) {
      // ENOENT, JSON parse error 모두 null 반환
      return null;
    }
  },

  // Step 53: 캐시 삭제
  "fcache-del": (key: string): boolean => {
    try {
      ensureCacheDir();
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 53: 패턴 무효화 (예: "user:*" → user:로 시작하는 모든 캐시 삭제)
  "fcache-invalidate": (pattern: string): number => {
    try {
      ensureCacheDir();
      let count = 0;
      const files = fs.readdirSync(CACHE_DIR);

      for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content);

          // 간단한 패턴 매칭: "user:*" → "user:" prefix 확인
          const patternPrefix = pattern.replace(/\*$/, '');
          if (entry.key.startsWith(patternPrefix)) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch {}
      }

      return count;
    } catch (err) {
      return 0;
    }
  },

  // Step 53: 만료된 캐시 정리
  "fcache-cleanup": (): number => {
    try {
      ensureCacheDir();
      let count = 0;
      const now = Date.now();
      const files = fs.readdirSync(CACHE_DIR);

      for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content);

          if (entry.expiresAt < now) {
            fs.unlinkSync(filePath);
            count++;
          }
        } catch {}
      }

      return count;
    } catch (err) {
      return 0;
    }
  },

  // Step 53: 캐시 통계
  "fcache-stats": (): any => {
    try {
      ensureCacheDir();
      const files = fs.readdirSync(CACHE_DIR);
      let totalSize = 0;
      let validCount = 0;
      let expiredCount = 0;
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        try {
          const stat = fs.statSync(filePath);
          totalSize += stat.size;

          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = JSON.parse(content);

          if (entry.expiresAt > now) {
            validCount++;
          } else {
            expiredCount++;
          }
        } catch {}
      }

      return {
        cacheDir: CACHE_DIR,
        totalFiles: files.length,
        validCount,
        expiredCount,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Step 53: 캐시 전체 삭제
  "fcache-clear": (): boolean => {
    try {
      ensureCacheDir();
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // ✅ v10.1 Phase 1.2: Async 버전 (논블로킹)
  "fcache-set-async": async (key: string, data: any, ttlSeconds: number = 3600): Promise<boolean> => {
    try {
      ensureCacheDir();

      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      const cacheEntry = {
        key,
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
      };

      await fs.promises.writeFile(filePath, JSON.stringify(cacheEntry), 'utf-8');
      return true;
    } catch (err) {
      return false;
    }
  },

  "fcache-get-async": async (key: string): Promise<any> => {
    try {
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const entry = JSON.parse(content);

      if (entry.expiresAt < Date.now()) {
        try { await fs.promises.unlink(filePath); } catch {}
        return null;
      }

      return entry.data;
    } catch (err) {
      return null;
    }
  },

  "fcache-del-async": async (key: string): Promise<boolean> => {
    try {
      ensureCacheDir();
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      const filePath = path.join(CACHE_DIR, hash);

      try {
        await fs.promises.unlink(filePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  "fcache-invalidate-async": async (pattern: string): Promise<number> => {
    try {
      ensureCacheDir();
      let count = 0;
      const files = await fs.promises.readdir(CACHE_DIR);

      const patternPrefix = pattern.replace(/\*$/, '');

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(CACHE_DIR, file);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content);

            if (entry.key.startsWith(patternPrefix)) {
              await fs.promises.unlink(filePath);
              count++;
            }
          } catch {}
        })
      );

      return count;
    } catch (err) {
      return 0;
    }
  },

  "fcache-cleanup-async": async (): Promise<number> => {
    try {
      ensureCacheDir();
      let count = 0;
      const now = Date.now();
      const files = await fs.promises.readdir(CACHE_DIR);

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(CACHE_DIR, file);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content);

            if (entry.expiresAt < now) {
              await fs.promises.unlink(filePath);
              count++;
            }
          } catch {}
        })
      );

      return count;
    } catch (err) {
      return 0;
    }
  },

  "fcache-stats-async": async (): Promise<any> => {
    try {
      ensureCacheDir();
      const files = await fs.promises.readdir(CACHE_DIR);
      let totalSize = 0;
      let validCount = 0;
      let expiredCount = 0;
      const now = Date.now();

      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(CACHE_DIR, file);
          try {
            const stat = await fs.promises.stat(filePath);
            totalSize += stat.size;

            const content = await fs.promises.readFile(filePath, 'utf-8');
            const entry = JSON.parse(content);

            if (entry.expiresAt > now) {
              validCount++;
            } else {
              expiredCount++;
            }
          } catch {}
        })
      );

      return {
        cacheDir: CACHE_DIR,
        totalFiles: files.length,
        validCount,
        expiredCount,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      };
    } catch (err) {
      return { error: String(err) };
    }
  },

  "fcache-clear-async": async (): Promise<boolean> => {
    try {
      ensureCacheDir();
      const files = await fs.promises.readdir(CACHE_DIR);
      await Promise.all(
        files.map((file) => fs.promises.unlink(path.join(CACHE_DIR, file)))
      );
      return true;
    } catch (err) {
      return false;
    }
  },
};

// ✅ Step 8: callFn 콜백 주입
export function createFileCacheModule(callFn?: any, callVal?: any): Record<string, any> {
  return fileCacheModule;
}
