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

const structuredLogModule = {
  // Step 54: 로깅 초기화
  "log-init": (config: any): boolean => {
    try {
      logConfig = {
        level: config.level || 'info',
        file: config.file || 'logs/app.log',
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
          // 로테이션: app.log → app.log.1, app.log.1 → app.log.2, ...
          const dir = path.dirname(logConfig.file);
          const base = path.basename(logConfig.file);

          for (let i = (logConfig.maxFiles || 5) - 1; i >= 1; i--) {
            const oldFile = path.join(dir, `${base}.${i}`);
            const newFile = path.join(dir, `${base}.${i + 1}`);
            if (fs.existsSync(oldFile) && i === (logConfig.maxFiles || 5) - 1) {
              fs.unlinkSync(oldFile);
            } else if (fs.existsSync(oldFile)) {
              fs.renameSync(oldFile, newFile);
            }
          }

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
};

export function createStructuredLogModule(): Record<string, any> {
  return structuredLogModule;
}
