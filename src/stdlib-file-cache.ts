// stdlib-file-cache.ts — FreeLang v9 Step 53: 파일 기반 캐시 (TTL)

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

const CACHE_DIR = path.join(os.homedir(), '.freelang-cache');

// 캐시 디렉토리 초기화
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const fileCacheModule = {
  // Step 53: 캐시 설정
  "fcache-set": (key: string, data: any, ttlSeconds: number = 3600): boolean => {
    try {
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

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(content);

      // TTL 확인
      if (entry.expiresAt < Date.now()) {
        fs.unlinkSync(filePath);
        return null;
      }

      return entry.data;
    } catch (err) {
      return null;
    }
  },

  // Step 53: 캐시 삭제
  "fcache-del": (key: string): boolean => {
    try {
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
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
      return true;
    } catch (err) {
      return false;
    }
  },
};

export function createFileCacheModule(): Record<string, any> {
  return fileCacheModule;
}
