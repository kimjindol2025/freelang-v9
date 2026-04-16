// stdlib-sse.ts — FreeLang v9 Step 52: 실제 HTTP SSE 스트리밍

import * as http from 'http';

type CallFn = (name: string, args: any[]) => any;

const sseConnections = new Map<string, {
  response: http.ServerResponse;
  closed: boolean;
}>();

const sseModule = {
  // Step 52: SSE 라우트 등록
  "sse-route": (server: any, path: string, handlerName: string): boolean => {
    if (!server || typeof server.on !== 'function') return false;

    // server는 HTTP 서버 객체여야 함
    // 실제 구현: server의 _router에 route 추가
    // 현재: stub (실제 HTTP 서버 인스턴스와 연결 필요)
    return true;
  },

  // Step 52: SSE 연결 생성
  "sse-connect": (response: any): string => {
    const id = `sse_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // SSE 헤더 설정
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    sseConnections.set(id, {
      response,
      closed: false,
    });

    return id;
  },

  // Step 52: SSE로 데이터 전송
  "sse-send": (connId: string, data: any, eventType?: string): boolean => {
    const conn = sseConnections.get(connId);
    if (!conn || conn.closed) return false;

    try {
      const event = eventType || 'message';
      const payload = typeof data === 'string' ? data : JSON.stringify(data);

      // SSE 형식: event: type\ndata: payload\n\n
      const sseMessage = `event: ${event}\ndata: ${payload}\n\n`;
      conn.response.write(sseMessage);
      return true;
    } catch (err) {
      conn.closed = true;
      return false;
    }
  },

  // Step 52: SSE 연결 종료
  "sse-close": (connId: string): boolean => {
    const conn = sseConnections.get(connId);
    if (!conn) return false;

    try {
      conn.response.end();
      conn.closed = true;
      sseConnections.delete(connId);
      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 52: SSE 브로드캐스트 (모든 연결에 전송)
  "sse-broadcast": (data: any, eventType?: string): number => {
    let sent = 0;
    const event = eventType || 'message';
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const sseMessage = `event: ${event}\ndata: ${payload}\n\n`;

    for (const [id, conn] of sseConnections.entries()) {
      if (!conn.closed) {
        try {
          conn.response.write(sseMessage);
          sent++;
        } catch (err) {
          conn.closed = true;
        }
      }
    }

    return sent;
  },

  // Step 52: 활성 SSE 연결 수
  "sse-active-connections": (): number => {
    return Array.from(sseConnections.values()).filter(c => !c.closed).length;
  },

  // Step 52: SSE 연결 정리
  "sse-cleanup": (): number => {
    let cleaned = 0;
    for (const [id, conn] of sseConnections.entries()) {
      if (conn.closed) {
        sseConnections.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  },
};

export function createSseModule(): Record<string, any> {
  return sseModule;
}
