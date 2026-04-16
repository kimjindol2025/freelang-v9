// stdlib-ai-pipeline.ts — FreeLang v9 Step 62: AI-PIPELINE 멀티스테이지

type CallFn = (name: string, args: any[]) => any;

interface PipelineStage {
  name: string;
  fn: string;
  type: 'fetch' | 'process' | 'transform' | 'filter' | 'merge';
  onError?: 'skip' | 'fail' | 'retry';
  retries?: number;
}

interface Pipeline {
  id: string;
  stages: PipelineStage[];
  onError: 'skip' | 'fail' | 'retry';
  results: Map<string, any>;
}

const pipelines = new Map<string, Pipeline>();
let pipelineIndex = 0;

const aiPipelineModule = {
  // Step 62: 파이프라인 생성
  "pipeline-create": (stages: PipelineStage[], onError: string = 'fail'): string => {
    const id = `pipeline_${Date.now()}_${++pipelineIndex}`;

    pipelines.set(id, {
      id,
      stages,
      onError: (onError as any) || 'fail',
      results: new Map(),
    });

    return id;
  },

  // Step 62: 파이프라인 실행
  "pipeline-run": (
    id: string,
    input: any,
    callFn?: CallFn
  ): any => {
    const pipeline = pipelines.get(id);
    if (!pipeline) return { error: `Pipeline not found: ${id}` };

    let currentData = input;
    const executionLog: any[] = [];

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      let retryCount = 0;
      const maxRetries = stage.retries || 0;

      while (retryCount <= maxRetries) {
        try {
          if (callFn) {
            currentData = callFn(stage.fn, [currentData]);
          }

          pipeline.results.set(stage.name, currentData);

          executionLog.push({
            stage: stage.name,
            status: 'success',
            input: currentData !== undefined ? '...' : null,
          });

          break; // 성공하면 재시도 루프 탈출
        } catch (err) {
          retryCount++;

          if (retryCount > maxRetries) {
            // 최대 재시도 초과
            const errorPolicy = stage.onError || pipeline.onError;

            if (errorPolicy === 'fail') {
              return {
                error: `Stage ${stage.name} failed: ${String(err)}`,
                executed: executionLog,
                lastGoodStage: i - 1,
              };
            } else if (errorPolicy === 'skip') {
              executionLog.push({
                stage: stage.name,
                status: 'skipped',
                reason: String(err),
              });
              break; // 다음 스테이지로
            } else if (errorPolicy === 'retry') {
              // 이미 재시도했으니 스킵
              executionLog.push({
                stage: stage.name,
                status: 'retried',
                reason: `Max retries (${maxRetries}) exceeded`,
              });
              break;
            }
          }
        }
      }
    }

    return {
      pipelineId: id,
      status: 'completed',
      output: currentData,
      executionLog,
    };
  },

  // Step 62: 스테이지별 결과 조회
  "pipeline-results": (id: string, stageName?: string): any => {
    const pipeline = pipelines.get(id);
    if (!pipeline) return null;

    if (stageName) {
      return pipeline.results.get(stageName) || null;
    }

    // 모든 결과
    const results: Record<string, any> = {};
    for (const [name, value] of pipeline.results.entries()) {
      results[name] = value;
    }

    return results;
  },

  // Step 62: 파이프라인 조회
  "pipeline-get": (id: string): any => {
    const pipeline = pipelines.get(id);
    if (!pipeline) return null;

    return {
      id: pipeline.id,
      stages: pipeline.stages.map((s) => ({
        name: s.name,
        type: s.type,
        onError: s.onError || pipeline.onError,
      })),
      onError: pipeline.onError,
    };
  },

  // Step 62: 병렬 파이프라인 (여러 파이프라인 동시 실행)
  "pipelines-parallel": (
    ids: string[],
    input: any,
    callFn?: CallFn
  ): any[] => {
    const results = [];

    for (const id of ids) {
      const result = (aiPipelineModule['pipeline-run'] as any)(
        id,
        input,
        callFn
      );
      results.push(result);
    }

    return results;
  },

  // Step 62: 파이프라인 체인 (이전 결과를 다음 파이프라인에 전달)
  "pipelines-chain": (
    ids: string[],
    initialInput: any,
    callFn?: CallFn
  ): any => {
    let currentData = initialInput;
    const chainLog: any[] = [];

    for (const id of ids) {
      const result = (aiPipelineModule['pipeline-run'] as any)(
        id,
        currentData,
        callFn
      );

      if (result.error) {
        return {
          error: result.error,
          executedPipelines: chainLog.length,
          lastError: result.error,
        };
      }

      currentData = result.output;
      chainLog.push({
        pipeline: id,
        status: result.status,
      });
    }

    return {
      status: 'completed',
      output: currentData,
      pipelines: chainLog.length,
    };
  },

  // Step 62: 파이프라인 삭제
  "pipeline-delete": (id: string): boolean => {
    return pipelines.delete(id);
  },

  // Step 62: 모든 파이프라인 삭제
  "pipelines-clear": (): number => {
    const size = pipelines.size;
    pipelines.clear();
    return size;
  },

  // Step 62: 파이프라인 통계
  "pipelines-stats": (): any => {
    return {
      total: pipelines.size,
      pipelines: Array.from(pipelines.values()).map((p) => ({
        id: p.id,
        stages: p.stages.length,
        onError: p.onError,
      })),
    };
  },

  // Step 62: 조건부 파이프라인 (조건에 따라 다른 파이프라인 실행)
  "pipeline-conditional": (
    condition: (data: any) => boolean,
    truePipelineId: string,
    falsePipelineId: string,
    input: any,
    callFn?: CallFn
  ): any => {
    const selectedId = condition(input) ? truePipelineId : falsePipelineId;
    return (aiPipelineModule['pipeline-run'] as any)(
      selectedId,
      input,
      callFn
    );
  },
};

export function createAiPipelineModule(): Record<string, any> {
  return aiPipelineModule;
}
