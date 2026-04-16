// stdlib-memory-monitor.ts — v10.1 Phase 2.2: 메모리 모니터링

type MemoryAlert = {
  timestamp: Date;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  alertType: 'warning' | 'critical';
  message: string;
};

class MemoryMonitor {
  private alerts: MemoryAlert[] = [];
  private warningThresholdMB: number = 200; // 200MB
  private criticalThresholdMB: number = 500; // 500MB
  private maxAlertsHistory: number = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(warningMB: number = 200, criticalMB: number = 500) {
    this.warningThresholdMB = warningMB;
    this.criticalThresholdMB = criticalMB;
  }

  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const externalMB = memUsage.external / 1024 / 1024;

      if (heapUsedMB > this.criticalThresholdMB) {
        this.recordAlert({
          timestamp: new Date(),
          heapUsedMB,
          heapTotalMB,
          externalMB,
          alertType: 'critical',
          message: `Critical: Heap usage ${heapUsedMB.toFixed(2)}MB > ${this.criticalThresholdMB}MB`,
        });

        // 강제 GC 시도 (가능한 경우)
        if (global.gc) {
          global.gc();
        }
      } else if (heapUsedMB > this.warningThresholdMB) {
        this.recordAlert({
          timestamp: new Date(),
          heapUsedMB,
          heapTotalMB,
          externalMB,
          alertType: 'warning',
          message: `Warning: Heap usage ${heapUsedMB.toFixed(2)}MB > ${this.warningThresholdMB}MB`,
        });
      }
    }, intervalMs);

    this.monitoringInterval.unref();
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private recordAlert(alert: MemoryAlert): void {
    this.alerts.push(alert);

    // 히스토리 크기 제한
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }
  }

  getCurrentUsage(): any {
    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
      externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
      rssModeMB: (memUsage.rss / 1024 / 1024).toFixed(2),
      arrayBuffersMB: (memUsage.arrayBuffers / 1024 / 1024).toFixed(2),
    };
  }

  getAlerts(limit: number = 10): MemoryAlert[] {
    return this.alerts.slice(-limit);
  }

  getCriticalAlerts(): MemoryAlert[] {
    return this.alerts.filter((a) => a.alertType === 'critical');
  }

  getWarnings(): MemoryAlert[] {
    return this.alerts.filter((a) => a.alertType === 'warning');
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getStats(): any {
    return {
      totalAlerts: this.alerts.length,
      criticalCount: this.getCriticalAlerts().length,
      warningCount: this.getWarnings().length,
      thresholds: {
        warningMB: this.warningThresholdMB,
        criticalMB: this.criticalThresholdMB,
      },
    };
  }
}

// 글로벌 모니터 인스턴스
const globalMonitor = new MemoryMonitor();

const memoryMonitorModule = {
  // 모니터링 시작
  'mem-monitor-start': (warningMB?: number, criticalMB?: number): void => {
    if (warningMB !== undefined || criticalMB !== undefined) {
      const newMonitor = new MemoryMonitor(warningMB || 200, criticalMB || 500);
      newMonitor.startMonitoring();
    } else {
      globalMonitor.startMonitoring();
    }
  },

  // 모니터링 중지
  'mem-monitor-stop': (): void => {
    globalMonitor.stopMonitoring();
  },

  // 현재 메모리 사용량 조회
  'mem-current': (): any => {
    return globalMonitor.getCurrentUsage();
  },

  // 메모리 알림 조회
  'mem-alerts': (limit?: number): MemoryAlert[] => {
    return globalMonitor.getAlerts(limit);
  },

  // 심각한 알림만 조회
  'mem-critical-alerts': (): MemoryAlert[] => {
    return globalMonitor.getCriticalAlerts();
  },

  // 경고 알림만 조회
  'mem-warnings': (): MemoryAlert[] => {
    return globalMonitor.getWarnings();
  },

  // 알림 정리
  'mem-clear-alerts': (): void => {
    globalMonitor.clearAlerts();
  },

  // 메모리 통계
  'mem-stats': (): any => {
    return globalMonitor.getStats();
  },

  // 강제 GC 실행 (가능한 경우)
  'mem-gc': (): boolean => {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  },
};

export function createMemoryMonitorModule(): Record<string, any> {
  return memoryMonitorModule;
}
