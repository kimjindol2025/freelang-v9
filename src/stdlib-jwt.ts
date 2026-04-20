/**
 * FreeLang v9 - JWT Native Library
 * HMAC-SHA256 토큰 생성/검증 (Node.js crypto 기반)
 */

import crypto from 'crypto';

interface JWTPayload {
  [key: string]: any;
  iat?: number;
  exp?: number;
}

interface JWTResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Base64 URL 인코딩
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL 디코딩
 */
function base64urlDecode(str: string): Buffer {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );
}

/**
 * JWT 토큰 서명 생성 (HS256)
 */
export function jwtSign(
  payload: JWTPayload,
  secret: string,
  expirySeconds: number = 3600
): string {
  // 헤더
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // 페이로드 (클레임 추가)
  const now = Math.floor(Date.now() / 1000);
  const payloadWithClaims: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds
  };

  // Base64 URL 인코딩
  const headerEncoded = base64urlEncode(
    Buffer.from(JSON.stringify(header))
  );
  const payloadEncoded = base64urlEncode(
    Buffer.from(JSON.stringify(payloadWithClaims))
  );

  // 서명
  const message = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest();
  const signatureEncoded = base64urlEncode(signature);

  // 최종 토큰
  return `${message}.${signatureEncoded}`;
}

/**
 * JWT 토큰 검증
 */
export function jwtVerify(token: string, secret: string): JWTResult {
  try {
    const parts = token.split('.');

    // 포맷 검증
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // 서명 검증
    const message = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest();
    const expectedSignatureEncoded = base64urlEncode(expectedSignature);

    if (signatureEncoded !== expectedSignatureEncoded) {
      return {
        valid: false,
        error: 'Invalid signature'
      };
    }

    // 페이로드 디코딩
    const payloadBuffer = base64urlDecode(payloadEncoded);
    const payload = JSON.parse(payloadBuffer.toString());

    // 만료 시간 검증
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        valid: false,
        error: 'Token expired'
      };
    }

    return {
      valid: true,
      payload
    };
  } catch (error) {
    return {
      valid: false,
      error: `Token verification failed: ${error}`
    };
  }
}

/**
 * JWT 토큰 디코딩 (검증 없음)
 */
export function jwtDecode(token: string): JWTResult {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid token format'
      };
    }

    const payloadBuffer = base64urlDecode(parts[1]);
    const payload = JSON.parse(payloadBuffer.toString());

    return {
      valid: true,
      payload
    };
  } catch (error) {
    return {
      valid: false,
      error: `Token decode failed: ${error}`
    };
  }
}

/**
 * v9 인터프리터용 바인딩
 */
export const jwtNativeBindings = {
  'jwt:sign': (payload: any, secret: string, expiry?: number) => {
    return jwtSign(payload, secret, expiry || 3600);
  },

  'jwt:verify': (token: string, secret: string) => {
    const result = jwtVerify(token, secret);
    return result.valid
      ? result.payload
      : {
          valid: false,
          error: result.error
        };
  },

  'jwt:decode': (token: string) => {
    const result = jwtDecode(token);
    return result.valid
      ? result.payload
      : {
          valid: false,
          error: result.error
        };
  }
};

// 테스트
if (require.main === module) {
  console.log('=== JWT Native Tests ===\n');

  const secret = 'test-secret-key';
  const payload = {
    user_id: '123',
    name: 'Alice',
    role: 'user'
  };

  // 1. 토큰 생성
  console.log('1. JWT Sign');
  const token = jwtSign(payload, secret, 3600);
  console.log(`Token: ${token}\n`);

  // 2. 토큰 검증
  console.log('2. JWT Verify');
  const verified = jwtVerify(token, secret);
  console.log(`Valid: ${verified.valid}`);
  console.log(`Payload:`, verified.payload);
  console.log();

  // 3. 토큰 디코딩
  console.log('3. JWT Decode');
  const decoded = jwtDecode(token);
  console.log(`Payload:`, decoded.payload);
  console.log();

  // 4. 잘못된 시크릿 테스트
  console.log('4. Wrong Secret');
  const wrongSecret = jwtVerify(token, 'wrong-secret');
  console.log(`Valid: ${wrongSecret.valid}`);
  console.log(`Error: ${wrongSecret.error}\n`);

  // 5. 성능 벤치마크
  console.log('5. Performance Benchmark');
  const iterations = 1000;

  const startSign = Date.now();
  for (let i = 0; i < iterations; i++) {
    jwtSign(payload, secret, 3600);
  }
  const signTime = Date.now() - startSign;
  console.log(
    `Sign: ${signTime}ms (${(signTime / iterations).toFixed(3)}ms/op, ${Math.round(
      (iterations * 1000) / signTime
    )} ops/sec)`
  );

  const tokens = Array.from({ length: 100 }, () =>
    jwtSign(payload, secret, 3600)
  );

  const startVerify = Date.now();
  for (let i = 0; i < iterations; i++) {
    jwtVerify(tokens[i % tokens.length], secret);
  }
  const verifyTime = Date.now() - startVerify;
  console.log(
    `Verify: ${verifyTime}ms (${(verifyTime / iterations).toFixed(3)}ms/op, ${Math.round(
      (iterations * 1000) / verifyTime
    )} ops/sec)`
  );
}
