// stdlib-stream-ai.ts — FreeLang v9 Step 57: LLM 스트리밍 응답 블록

import * as https from 'https';
import type { ClientRequest } from 'http';

type CallFn = (name: string, args: any[]) => any;

// ✅ Step 6: 활성 스트림 추적 (cancel 구현용)
const activeStreams = new Map<string, { req: ClientRequest }>();

const streamAIModule = {
  // Step 57: LLM 스트리밍 응답
  "stream-ai": (config: any, callFn?: CallFn): string => {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const {
      model = 'claude-3-5-sonnet-20241022',
      prompt,
      system = '',
      'on-token': onTokenFn,
      'on-done': onDoneFn,
    } = config;

    // Anthropic API 키 (환경변수)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      if (callFn && onDoneFn) {
        callFn(onDoneFn, [{ error: 'ANTHROPIC_API_KEY not set' }]);
      }
      return streamId;
    }

    const messages = [
      { role: 'user', content: prompt },
    ];

    if (system) {
      messages.unshift({ role: 'user', content: system });
    }

    const body = JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system: system || undefined,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, (res) => {
      let fullText = '';

      // ✅ Step 6: HTTP 상태 코드 확인
      if (res.statusCode !== 200) {
        let errorBody = '';
        res.on('data', (chunk) => {
          errorBody += chunk.toString();
        });
        res.on('end', () => {
          const err = new Error(`API ${res.statusCode}: ${errorBody}`);
          if (callFn && onDoneFn) {
            callFn(onDoneFn, [{ error: err.message, done: false }]);
          }
          activeStreams.delete(streamId);
        });
        return;
      }

      res.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (
                parsed.type === 'content_block_delta' &&
                parsed.delta.type === 'text_delta'
              ) {
                const token = parsed.delta.text;
                fullText += token;

                // on-token 콜백 실행
                if (callFn && onTokenFn) {
                  try {
                    callFn(onTokenFn, [token]);
                  } catch (err) {
                    console.error('on-token error:', err);
                  }
                }
              }
            } catch (err) {
              // ✅ Step 6: JSON 파싱 에러 전파
              if (callFn && onDoneFn) {
                callFn(onDoneFn, [{ error: `Parse error: ${data}`, done: false }]);
              }
            }
          }
        }
      });

      res.on('end', () => {
        // on-done 콜백 실행
        if (callFn && onDoneFn) {
          try {
            callFn(onDoneFn, [{ text: fullText, done: true }]);
          } catch (err) {
            console.error('on-done error:', err);
          }
        }
        activeStreams.delete(streamId);
      });
    });

    req.on('error', (err) => {
      if (callFn && onDoneFn) {
        callFn(onDoneFn, [{ error: err.message, done: false }]);
      }
      activeStreams.delete(streamId);
    });

    // ✅ Step 6: 스트림 추적
    activeStreams.set(streamId, { req });

    req.write(body);
    req.end();

    return streamId;
  },

  // Step 57: 스트림 상태 확인
  "stream-running?": (): boolean => {
    return activeStreams.size > 0;
  },

  // Step 57: 스트림 취소
  "stream-cancel": (streamId: string): boolean => {
    // ✅ Step 6: cancel 실제 구현
    const stream = activeStreams.get(streamId);
    if (!stream) return false;

    try {
      stream.req.destroy();
      activeStreams.delete(streamId);
      return true;
    } catch (err) {
      return false;
    }
  },
};

// ✅ Step 8: callFn 콜백 주입
export function createStreamAiModule(callFn?: CallFn, callVal?: CallFn): Record<string, any> {
  return streamAIModule;
}
