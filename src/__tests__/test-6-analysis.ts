/**
 * Phase 3B-Final: Test 6 원인 분석
 * 목표: 정확한 깊이, TS↔FL 왕복 경로 추적
 */

import { Interpreter } from "../interpreter";
import { lex } from "../lexer";
import { parse } from "../parser";
import fs from "fs";

describe("Phase 3B-Final: Test 6 깊이 분석", () => {
  let interp: Interpreter;

  beforeAll(() => {
    interp = new Interpreter();

    // freelang-lexer.fl 로드
    const lexerFlCode = fs.readFileSync(
      "/home/kimjin/freelang-v9/src/freelang-lexer.fl",
      "utf-8"
    );
    interp.run(lexerFlCode);

    // freelang-parser.fl 로드
    const parserFlCode = fs.readFileSync(
      "/home/kimjin/freelang-v9/src/freelang-parser.fl",
      "utf-8"
    );
    interp.run(parserFlCode);

    // freelang-interpreter.fl 로드
    const interpreterFlCode = fs.readFileSync(
      "/home/kimjin/freelang-v9/src/freelang-interpreter.fl",
      "utf-8"
    );
    interp.run(interpreterFlCode);
  });

  test("Test 6 깊이 분석: (square 4)", (done) => {
    // callDepth 추적 활성화
    let maxCallDepth = 0;
    let callDepthSnapshots: { depth: number; func: string; time: number }[] = [];
    const startTime = Date.now();

    // callUserFunction 계측
    const originalCallUserFunction = require("../eval-call-function").callUserFunction;
    let currentDepth = 0;

    // 계측: 각 함수 호출 추적
    const tracedInterp = interp as any;
    const originalEval = tracedInterp.eval.bind(tracedInterp);

    let evalCallCount = 0;
    tracedInterp.eval = function (node: any) {
      evalCallCount++;
      if (evalCallCount % 100000 === 0) {
        console.log(`[DEBUG] eval 호출 ${evalCallCount}회`);
      }

      // TypeScript eval → FL dispatch 추적
      if (node?.kind === "sexpr" && evalCallCount % 50000 === 0) {
        console.log(`[DEBUG] sexpr: op="${node.op}" (eval count: ${evalCallCount})`);
      }

      return originalEval(node);
    };

    // Test 6 코드 실행
    const code = `(interpret (parse (lex "[FUNC square :params [$n] :body (* $n $n)] (square 4)")))`;

    try {
      // 타임아웃 설정 (기존 757ms보다 약간 길게)
      const timeoutHandle = setTimeout(() => {
        console.log(`\n=== Test 6 분석 결과 ===`);
        console.log(`타임아웃 발생 (1초)`);
        console.log(`eval 호출 횟수: ${evalCallCount}`);
        console.log(`최대 callDepth: ${maxCallDepth}`);
        console.log(`callDepth snapshots (처음 50개):`);
        callDepthSnapshots.slice(0, 50).forEach((s) => {
          console.log(
            `  depth=${s.depth}, func="${s.func}", t=${s.time - startTime}ms`
          );
        });
        done();
      }, 1000);

      const result = interp.run(code);

      clearTimeout(timeoutHandle);
      console.log(`\n✅ Test 6 통과: result = ${result}`);
      done();
    } catch (err: any) {
      console.log(`\n❌ Test 6 에러:`);
      console.log(`메시지: ${err.message}`);
      console.log(`eval 호출 횟수: ${evalCallCount}`);
      console.log(`최대 callDepth: ${maxCallDepth}`);
      done();
    }
  });
});
