// stdlib-structured-log.ts — FreeLang v9 Step 54: 구조화 로깅 (JSONL + 로테이션)

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file: string;
  maxSizeBytes?: number;
  maxFiles?: number;
}

let logConfig: LogConfig | null = null;
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// ✅ Step 7: 경로 검증 (경로 트래버설 방지)
function validateLogPath(p: string): string {
  const resolved = path.resolve(p);
  const cwd = process.cwd();
  const home = os.homedir();
  const safe = [path.resolve('logs'), cwd, home];

  if (!safe.some(b => resolved.startsWith(b))) {
    throw new Error(`Invalid log path: ${p}`);
  }
  return resolved;
}

// ✅ v10.1 Phase 1.3: 비동기 로그 버퍼링
let logBuffer: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

async function flushLogBuffer(): Promise<void> {
  if (!logConfig || logBuffer.length === 0) return;

  try {
    const lines = logBuffer.join('\n') + '\n';
    await fs.promises.appendFile(logConfig.file, lines, 'utf-8');
    logBuffer = [];
  } catch (err) {
    console.error('Log buffer flush error:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushLogBuffer();
  }, 100);
}

const structuredLogModule = {
  // Step 54: 로깅 초기화
  "log-init": (config: any): boolean => {
    try {
      // ✅ Step 7: 경로 검증
      const filePath = validateLogPath(config.file || 'logs/app.log');

      logConfig = {
        level: config.level || 'info',
        file: filePath,
        maxSizeBytes: config.maxSizeBytes || 100 * 1024 * 1024, // 100MB
        maxFiles: config.maxFiles || 5,
      };

      // 로그 디렉토리 생성
      const logDir = path.dirname(logConfig.file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 54: 로그 쓰기 (내부 헬퍼)
  "_writeLog": (level: string, message: string, context: any = {}): void => {
    if (!logConfig) return;

    const levelNum = LOG_LEVELS[level as keyof typeof LOG_LEVELS] || 1;
    const configLevelNum = LOG_LEVELS[logConfig.level] || 1;

    // 레벨 필터링
    if (levelNum < configLevelNum) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid,
    };

    try {
      // 파일 크기 확인 및 로테이션
      if (fs.existsSync(logConfig.file)) {
        const stat = fs.statSync(logConfig.file);
        if (stat.size > (logConfig.maxSizeBytes || 100 * 1024 * 1024)) {
          // ✅ Step 7: 로테이션 로직 단순화 및 버그 수정
          const dir = path.dirname(logConfig.file);
          const base = path.basename(logConfig.file);
          const maxFiles = logConfig.maxFiles || 5;

          // 역순으로 순회하며 파일 이동 (i+1 파일이 먼저 삭제되도록)
          for (let i = maxFiles - 1; i >= 1; i--) {
            const src = path.join(dir, `${base}.${i}`);
            const dst = path.join(dir, `${base}.${i + 1}`);

            if (fs.existsSync(dst)) {
              fs.unlinkSync(dst); // 목표 파일 먼저 삭제
            }
            if (fs.existsSync(src)) {
              fs.renameSync(src, dst);
            }
          }

          // 현재 파일을 .1로 이동
          const rotatedFile = path.join(dir, `${base}.1`);
          fs.renameSync(logConfig.file, rotatedFile);
        }
      }

      // JSONL로 append
      const jsonLine = JSON.stringify(logEntry);
      fs.appendFileSync(logConfig.file, jsonLine + '\n', 'utf-8');
    } catch (err) {
      console.error('Log write error:', err);
    }
  },

  // Step 54: 로그 레벨별 함수
  "log-debug": (message: string, context: any = {}): void => {
    structuredLogModule._writeLog('debug', message, context);
  },

  "log-info": (message: string, context: any = {}): void => {
    structuredLogModule._writeLog('info', message, context);
  },

  "log-warn": (message: string, context: any = {}): void => {
    structuredLogModule._writeLog('warn', message, context);
  },

  "log-error": (message: string, context: any = {}): void => {
    structuredLogModule._writeLog('error', message, context);
  },

  // Step 54: 구조화 로그 (직접 호출)
  "log-structured": (level: string, message: string, context: any = {}): void => {
    structuredLogModule._writeLog(level, message, context);
  },

  // Step 54: 로그 파일 읽기
  "log-read": (lines: number = 100): any[] => {
    if (!logConfig) return [];

    try {
      if (!fs.existsSync(logConfig.file)) return [];

      const content = fs.readFileSync(logConfig.file, 'utf-8');
      const allLines = content.trim().split('\n');
      const lastN = allLines.slice(-lines);

      return lastN.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
    } catch (err) {
      return [];
    }
  },

  // Step 54: 로그 필터링
  "log-filter": (level: string, limit: number = 100): any[] => {
    if (!logConfig) return [];

    try {
      if (!fs.existsSync(logConfig.file)) return [];

      const content = fs.readFileSync(logConfig.file, 'utf-8');
      const allLines = content.trim().split('\n');

      return allLines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry: any) => entry && entry.level === level)
        .slice(-limit);
    } catch (err) {
      return [];
    }
  },

  // Step 54: 로그 파일 크기
  "log-size": (): any => {
    if (!logConfig) return { error: 'Not initialized' };

    try {
      if (!fs.existsSync(logConfig.file)) {
        return { sizeBytes: 0, sizeMB: '0.00' };
      }

      const stat = fs.statSync(logConfig.file);
      return {
        file: logConfig.file,
        sizeBytes: stat.size,
        sizeMB: (stat.size / 1024 / 1024).toFixed(2),
        mtime: stat.mtime.toISOString(),
      };
    } catch (err) {
      return { error: String(err) };
    }
  },

  // Step 54: 로그 파일 삭제
  "log-clear": (): boolean => {
    if (!logConfig) return false;

    try {
      if (fs.existsSync(logConfig.file)) {
        fs.unlinkSync(logConfig.file);
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // ✅ v10.1 Phase 1.3: Async 버전 (버퍼링)
  "_writeLogAsync": async (level: string, message: string, context: any = {}): Promise<void> => {
    if (!logConfig) return;

    const levelNum = LOG_LEVELS[level as keyof typeof LOG_LEVELS] || 1;
    const configLevelNum = LOG_LEVELS[logConfig.level] || 1;

    if (levelNum < configLevelNum) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      pid: process.pid,
    };

    try {
      // 파일 크기 확인 및 로테이션 (동기로 유지 — 메타 정보만)
      if (fs.existsSync(logConfig.file)) {
        const stat = fs.statSync(logConfig.file);
        if (stat.size > (logConfig.maxSizeBytes || 100 * 1024 * 1024)) {
          const dir = path.dirname(logConfig.file);
          const base = path.basename(logConfig.file);
          const maxFiles = logConfig.maxFiles || 5;

          for (let i = maxFiles - 1; i >= 1; i--) {
            const src = path.join(dir, `${base}.${i}`);
            const dst = path.join(dir, `${base}.${i + 1}`);

            if (fs.existsSync(dst)) {
              fs.unlinkSync(dst);
            }
            if (fs.existsSync(src)) {
              fs.renameSync(src, dst);
            }
          }

          const rotatedFile = path.join(dir, `${base}.1`);
          fs.renameSync(logConfig.file, rotatedFile);
        }
      }

      // 버퍼에 추가
      logBuffer.push(JSON.stringify(logEntry));

      // 10개 이상이면 즉시 flush
      if (logBuffer.length >= 10) {
        await flushLogBuffer();
      } else {
        scheduleFlush();
      }
    } catch (err) {
      console.error('Async log write error:', err);
    }
  },

  "log-debug-async": async (message: string, context: any = {}): Promise<void> => {
    await structuredLogModule._writeLogAsync('debug', message, context);
  },

  "log-info-async": async (message: string, context: any = {}): Promise<void> => {
    await structuredLogModule._writeLogAsync('info', message, context);
  },

  "log-warn-async": async (message: string, context: any = {}): Promise<void> => {
    await structuredLogModule._writeLogAsync('warn', message, context);
  },

  "log-error-async": async (message: string, context: any = {}): Promise<void> => {
    await structuredLogModule._writeLogAsync('error', message, context);
  },

  "log-structured-async": async (level: string, message: string, context: any = {}): Promise<void> => {
    await structuredLogModule._writeLogAsync(level, message, context);
  },

  "log-read-async": async (lines: number = 100): Promise<any[]> => {
    if (!logConfig) return [];

    try {
      if (!fs.existsSync(logConfig.file)) return [];

      const content = await fs.promises.readFile(logConfig.file, 'utf-8');
      const allLines = content.trim().split('\n');
      const lastN = allLines.slice(-lines);

      return lastN.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });
    } catch (err) {
      return [];
    }
  },

  "log-filter-async": async (level: string, limit: number = 100): Promise<any[]> => {
    if (!logConfig) return [];

    try {
      if (!fs.existsSync(logConfig.file)) return [];

      const content = await fs.promises.readFile(logConfig.file, 'utf-8');
      const allLines = content.trim().split('\n');

      return allLines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((entry: any) => entry && entry.level === level)
        .slice(-limit);
    } catch (err) {
      return [];
    }
  },

  "log-size-async": async (): Promise<any> => {
    if (!logConfig) return { error: 'Not initialized' };

    try {
      if (!fs.existsSync(logConfig.file)) {
        return { sizeBytes: 0, sizeMB: '0.00' };
      }

      const stat = await fs.promises.stat(logConfig.file);
      return {
        file: logConfig.file,
        sizeBytes: stat.size,
        sizeMB: (stat.size / 1024 / 1024).toFixed(2),
        mtime: stat.mtime.toISOString(),
      };
    } catch (err) {
      return { error: String(err) };
    }
  },

  "log-clear-async": async (): Promise<boolean> => {
    if (!logConfig) return false;

    try {
      // 버퍼 먼저 flush
      await flushLogBuffer();

      if (fs.existsSync(logConfig.file)) {
        await fs.promises.unlink(logConfig.file);
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  "log-flush": async (): Promise<void> => {
    await flushLogBuffer();
  },
};

// ✅ Step 8: callFn 콜백 주입
export function createStructuredLogModule(callFn?: any, callVal?: any): Record<string, any> {
  return structuredLogModule;
}

// ✅ v10.1 Phase 1.3: Graceful shutdown
process.on('SIGTERM', async () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  await flushLogBuffer();
});

process.on('SIGINT', async () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  await flushLogBuffer();
});
