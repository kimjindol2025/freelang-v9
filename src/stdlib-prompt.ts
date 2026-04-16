// stdlib-prompt.ts — FreeLang v9 Step 58: defprompt 프롬프트 템플릿

type CallFn = (name: string, args: any[]) => any;

interface PromptTemplate {
  name: string;
  vars: string[];
  system: string;
  user: string;
  format: string;
}

const prompts = new Map<string, PromptTemplate>();

const promptModule = {
  // Step 58: 프롬프트 정의
  "defprompt": (
    name: string,
    vars: string[],
    system: string,
    user: string,
    format: string = 'text'
  ): boolean => {
    prompts.set(name, {
      name,
      vars,
      system,
      user,
      format,
    });
    return true;
  },

  // Step 58: 프롬프트 조회
  "prompt-get": (name: string): any => {
    return prompts.get(name) || null;
  },

  // Step 58: 프롬프트 치환 및 렌더링
  "prompt-render": (name: string, values: Record<string, any>): any => {
    const template = prompts.get(name);
    if (!template) return { error: `Prompt not found: ${name}` };

    let renderedUser = template.user;
    let renderedSystem = template.system;

    // {{var}} 치환
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      renderedUser = renderedUser.replace(new RegExp(placeholder, 'g'), stringValue);
      renderedSystem = renderedSystem.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return {
      system: renderedSystem,
      user: renderedUser,
      format: template.format,
    };
  },

  // Step 58: JSON 포맷 검증
  "prompt-validate": (name: string, response: string): any => {
    const template = prompts.get(name);
    if (!template) return { valid: false, error: 'Prompt not found' };

    if (template.format === 'json') {
      try {
        const parsed = JSON.parse(response);
        return { valid: true, parsed };
      } catch (err) {
        return { valid: false, error: String(err) };
      }
    }

    return { valid: true, text: response };
  },

  // Step 58: 프롬프트 목록
  "prompts-list": (): string[] => {
    return Array.from(prompts.keys());
  },

  // Step 58: 프롬프트 삭제
  "prompt-delete": (name: string): boolean => {
    return prompts.delete(name);
  },

  // Step 58: 프롬프트 전체 삭제
  "prompts-clear": (): number => {
    const size = prompts.size;
    prompts.clear();
    return size;
  },

  // Step 58: 프롬프트 버전 기록
  "prompt-versions": (name: string): number => {
    // 구현: 버전 관리
    return 1;
  },

  // Step 58: 프롬프트 체인 (A → B → C)
  "prompt-chain": (
    promptNames: string[],
    initialInput: Record<string, any>
  ): any => {
    let currentInput = initialInput;

    for (const promptName of promptNames) {
      const template = prompts.get(promptName);
      if (!template) {
        return { error: `Prompt not found: ${promptName}` };
      }

      // 다음 프롬프트에 현재 결과를 입력으로 사용
      const rendered = (promptModule['prompt-render'] as any)(
        promptName,
        currentInput
      );

      if (rendered.error) {
        return rendered;
      }

      currentInput = {
        prompt: rendered.user,
        previous: currentInput,
      };
    }

    return currentInput;
  },
};

export function createPromptModule(): Record<string, any> {
  return promptModule;
}
