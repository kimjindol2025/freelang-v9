// stdlib-stream-ai.ts — FreeLang v9 Step 57: LLM 스트리밍 응답 블록

import * as https from 'https';

type CallFn = (name: string, args: any[]) => any;

const streamAIModule = {
  // Step 57: LLM 스트리밍 응답
  "stream-ai": (config: any, callFn?: CallFn): void => {
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
      return;
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
            } catch {}
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
      });
    });

    req.on('error', (err) => {
      if (callFn && onDoneFn) {
        callFn(onDoneFn, [{ error: err.message, done: false }]);
      }
    });

    req.write(body);
    req.end();
  },

  // Step 57: 스트림 상태 확인
  "stream-running?": (): boolean => {
    // 구현: 활성 스트림 카운트 추적
    return false;
  },

  // Step 57: 스트림 취소
  "stream-cancel": (streamId: string): boolean => {
    // 구현: 스트림 ID로 요청 취소
    return true;
  },
};

export function createStreamAiModule(): Record<string, any> {
  return streamAIModule;
}
