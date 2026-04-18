import { Interpreter } from '../interpreter';
import { lex } from '../lexer';
import { parse } from '../parser';
import * as fs from 'fs';
import * as path from 'path';

describe('FreeLang v9 셀프호스팅 완성 증명', () => {
  let interp: Interpreter;
  const flInterpSrc = fs.readFileSync(
    path.join(__dirname, '../freelang-interpreter.fl'), 'utf-8'
  );

  beforeEach(() => {
    interp = new Interpreter();
    interp.run(flInterpSrc);  // FL 인터프리터를 TypeScript 엔진에 로드
  });

  function selfhostEval(code: string): any {
    const ast = parse(lex(code));
    interp.context.variables.set('__ast__', ast);
    const ctx = interp.run('(interpret $__ast__)');
    return ctx.lastValue;
  }

  // 테스트 1: 산술 연산
  test('FL 인터프리터가 (+ 1 2) → 3 을 계산', () => {
    expect(selfhostEval('(+ 1 2)')).toBe(3);
  });

  // 테스트 2: let 바인딩
  test('FL 인터프리터가 let 바인딩을 처리', () => {
    expect(selfhostEval('(let [[$x 10]] (* $x $x))')).toBe(100);
  });

  // 테스트 3: if 분기
  test('FL 인터프리터가 if 조건 분기를 처리', () => {
    expect(selfhostEval('(if true "yes" "no")')).toBe('yes');
    expect(selfhostEval('(if false "yes" "no")')).toBe('no');
  });

  // 테스트 4: 환경 조회 (env-lookup)
  test('env-lookup이 fl-env-get 없이 동작', () => {
    const code = `
      (let [[$x 42]]
        $x
      )
    `;
    expect(selfhostEval(code)).toBe(42);
  });

  // 테스트 5: 중첩 let 바인딩
  test('FL 인터프리터가 중첩 env를 정확하게 처리', () => {
    const code = `
      (let [[$x 10]]
        (let [[$y 20]]
          (+ $x $y)
        )
      )
    `;
    expect(selfhostEval(code)).toBe(30);
  });

  // 테스트 6: array 바인딩
  test('FL 인터프리터가 배열을 처리', () => {
    const code = `
      (let [[$arr [1 2 3]]]
        (get $arr 1)
      )
    `;
    expect(selfhostEval(code)).toBe(2);
  });
});
