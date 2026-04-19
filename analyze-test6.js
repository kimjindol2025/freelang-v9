/**
 * Phase 3B-Final: Test 6 원인 분석 스크립트
 * 직접 실행: node analyze-test6.js
 */

const fs = require("fs");
const { Interpreter } = require("./dist/interpreter");
const { getCallDepthStats, resetCallDepthStats } = require("./dist/eval-call-function");

console.log("🔍 Test 6 분석 시작...\n");

const interp = new Interpreter();

// freelang-lexer.fl 로드
console.log("📦 freelang-lexer.fl 로드...");
const lexerFlCode = fs.readFileSync("./src/freelang-lexer.fl", "utf-8");
interp.run(lexerFlCode);

// freelang-parser.fl 로드
console.log("📦 freelang-parser.fl 로드...");
const parserFlCode = fs.readFileSync("./src/freelang-parser.fl", "utf-8");
interp.run(parserFlCode);

// freelang-interpreter.fl 로드
console.log("📦 freelang-interpreter.fl 로드...");
const interpreterFlCode = fs.readFileSync("./src/freelang-interpreter.fl", "utf-8");
interp.run(interpreterFlCode);

console.log("\n✅ 모든 FL 파일 로드 완료\n");

// Test 6 코드
const code = `(interpret (parse (lex "[FUNC square :params [$n] :body (* $n $n)] (square 4)")))`;

console.log("🚀 Test 6 실행: (square 4)\n");
console.log("코드:", code);
console.log("\n⏱️  타임아웃 1초 설정...\n");

const startTime = Date.now();
let completed = false;

// callDepth 추적 초기화
resetCallDepthStats();

// 타임아웃 설정
const timeoutHandle = setTimeout(() => {
  if (!completed) {
    const elapsed = Date.now() - startTime;
    const stats = getCallDepthStats();
    console.log(`\n❌ 타임아웃 발생 (${elapsed}ms)`);
    console.log("\n=== Test 6 분석 결과 ===");
    console.log("상태: 무한 재귀 (가능성)");
    console.log("메시지: 1초 초과 timeout");
    console.log(`최대 callDepth: ${stats.maxCallDepthReached}`);
    process.exit(1);
  }
}, 1000);

try {
  const result = interp.run(code);
  completed = true;
  clearTimeout(timeoutHandle);

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Test 6 완료 (${elapsed}ms)`);
  console.log("결과:", result);
  console.log("\n=== 분석 결과 ===");
  console.log("상태: 성공");
  process.exit(0);
} catch (err) {
  completed = true;
  clearTimeout(timeoutHandle);

  const elapsed = Date.now() - startTime;
  console.log(`\n❌ Test 6 에러 (${elapsed}ms)`);
  console.log("에러 메시지:", err.message);
  console.log("에러 타입:", err.constructor.name);

  // 스택 트레이스의 주요 함수들 추출
  if (err.stack) {
    const lines = err.stack.split("\n").slice(0, 20);
    console.log("\n스택 트레이스 (상위 20줄):");
    lines.forEach((line) => {
      console.log(line);
    });
  }

  const stats = getCallDepthStats();
  console.log("\n=== 분석 결과 ===");
  console.log("상태: 에러 발생");
  console.log("메시지:", err.message);
  console.log(`최대 callDepth: ${stats.maxCallDepthReached}`);
  process.exit(1);
}
