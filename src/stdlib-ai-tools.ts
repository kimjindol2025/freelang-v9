// stdlib-ai-tools.ts — FreeLang v9 Step 61: AI Function Calling / Tool Use

type CallFn = (name: string, args: any[]) => any;

interface ToolDef {
  name: string;
  description: string;
  params: Record<string, { type: string; description: string }>;
  handler: string;
}

const tools = new Map<string, ToolDef>();

const aiToolsModule = {
  // Step 61: 도구 정의
  "deftool": (
    name: string,
    description: string,
    params: Record<string, any>,
    handler: string
  ): boolean => {
    tools.set(name, {
      name,
      description,
      params,
      handler,
    });
    return true;
  },

  // Step 61: 도구 조회
  "tool-get": (name: string): any => {
    const tool = tools.get(name);
    if (!tool) return null;

    return {
      name: tool.name,
      description: tool.description,
      params: tool.params,
    };
  },

  // Step 61: 도구 목록
  "tools-list": (): string[] => {
    return Array.from(tools.keys());
  },

  // Step 61: Anthropic tool_use 형식으로 변환
  "tools-to-anthropic": (): any[] => {
    return Array.from(tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.params,
        required: Object.keys(tool.params),
      },
    }));
  },

  // Step 61: 도구 호출 실행
  "tool-call": (name: string, args: any, callFn?: CallFn): any => {
    const tool = tools.get(name);
    if (!tool) return { error: `Tool not found: ${name}` };

    if (!callFn) return { error: 'No callback function' };

    try {
      const result = callFn(tool.handler, [args]);
      return {
        tool: name,
        status: 'success',
        result,
      };
    } catch (err) {
      return {
        tool: name,
        status: 'error',
        error: String(err),
      };
    }
  },

  // Step 61: 도구 파이프라인 (여러 도구 순차 실행)
  "tool-pipeline": (
    toolCalls: Array<{ name: string; args: any }>,
    callFn?: CallFn
  ): any[] => {
    const results = [];

    for (const toolCall of toolCalls) {
      const result = (aiToolsModule['tool-call'] as any)(
        toolCall.name,
        toolCall.args,
        callFn
      );
      results.push(result);

      // 에러 시 중단
      if (result.status === 'error') {
        break;
      }
    }

    return results;
  },

  // Step 61: 도구 검증
  "tool-validate": (
    name: string,
    args: Record<string, any>
  ): any => {
    const tool = tools.get(name);
    if (!tool) return { valid: false, error: 'Tool not found' };

    const errors: string[] = [];

    for (const [paramName, paramDef] of Object.entries(tool.params)) {
      if (!(paramName in args)) {
        errors.push(`Missing required parameter: ${paramName}`);
      } else {
        const argValue = args[paramName];
        const expectedType = paramDef.type || 'any';
        const actualType = typeof argValue;

        // 간단한 타입 검증
        if (expectedType !== 'any' && actualType !== expectedType) {
          errors.push(
            `Parameter ${paramName}: expected ${expectedType}, got ${actualType}`
          );
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  },

  // Step 61: 도구 삭제
  "tool-delete": (name: string): boolean => {
    return tools.delete(name);
  },

  // Step 61: 모든 도구 삭제
  "tools-clear": (): number => {
    const size = tools.size;
    tools.clear();
    return size;
  },

  // Step 61: 도구 상태
  "tools-stats": (): any => {
    return {
      total: tools.size,
      tools: Array.from(tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        params: Object.keys(t.params),
      })),
    };
  },

  // Step 61: 조건부 도구 실행
  "tool-call-if": (
    condition: boolean,
    name: string,
    args: any,
    callFn?: CallFn
  ): any => {
    if (!condition) {
      return { skipped: true, reason: 'Condition false' };
    }

    return (aiToolsModule['tool-call'] as any)(name, args, callFn);
  },
};

export function createAiToolsModule(): Record<string, any> {
  return aiToolsModule;
}
