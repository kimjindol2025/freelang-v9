// stdlib-rag-v2.ts — FreeLang v9 Step 60: RAG-V2 청킹 & 시맨틱 검색

type CallFn = (name: string, args: any[]) => any;

interface Chunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
  metadata: Record<string, any>;
}

const chunks = new Map<string, Chunk>();
let chunkIndex = 0;

// 슬라이딩 윈도우 청킹
function slideChunking(
  text: string,
  chunkSize: number = 512,
  overlap: number = 100
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end));
    start = end - overlap;

    if (start <= 0) break;
  }

  return chunks;
}

// 간단한 임베딩 생성
function simpleEmbedding(text: string): number[] {
  return Array.from(text.slice(0, 100)).map((ch) => ch.charCodeAt(0) % 10 / 10);
}

// 코사인 유사도
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct;
}

const ragV2Module = {
  // Step 60: 파일 인덱싱
  "rag-index-file": (filepath: string, options: any = {}): number => {
    try {
      const fs = require('fs');
      if (!fs.existsSync(filepath)) return 0;

      const content = fs.readFileSync(filepath, 'utf-8');
      const chunkSize = options.chunkSize || 512;
      const overlap = options.overlap || 100;

      const fileChunks = slideChunking(content, chunkSize, overlap);
      let indexed = 0;

      for (const text of fileChunks) {
        const id = `chunk_${Date.now()}_${++chunkIndex}`;
        const embedding = simpleEmbedding(text);

        chunks.set(id, {
          id,
          text,
          embedding,
          source: filepath,
          metadata: {
            indexed_at: new Date().toISOString(),
            chunk_size: text.length,
          },
        });

        indexed++;
      }

      return indexed;
    } catch (err) {
      return 0;
    }
  },

  // Step 60: 텍스트 인덱싱
  "rag-index-text": (text: string, options: any = {}): number => {
    const chunkSize = options.chunkSize || 512;
    const overlap = options.overlap || 100;

    const textChunks = slideChunking(text, chunkSize, overlap);
    let indexed = 0;

    for (const chunk of textChunks) {
      const id = `chunk_${Date.now()}_${++chunkIndex}`;
      const embedding = simpleEmbedding(chunk);

      chunks.set(id, {
        id,
        text: chunk,
        embedding,
        source: 'memory',
        metadata: {
          indexed_at: new Date().toISOString(),
          chunk_size: chunk.length,
        },
      });

      indexed++;
    }

    return indexed;
  },

  // Step 60: 시맨틱 검색
  "rag-search": (query: string, options: any = {}): any[] => {
    const { top = 5, threshold = 0.0 } = options;

    const queryEmbedding = simpleEmbedding(query);
    const results: Array<{ id: string; similarity: number; text: string; source: string }> = [];

    for (const [id, chunk] of chunks.entries()) {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= threshold) {
        results.push({
          id,
          similarity,
          text: chunk.text,
          source: chunk.source,
        });
      }
    }

    // 유사도로 정렬
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, top)
      .map((r) => ({
        id: r.id,
        similarity: r.similarity.toFixed(3),
        text: r.text.substring(0, 200) + '...',
        source: r.source,
      }));
  },

  // Step 60: 청크 조회
  "rag-chunk-get": (id: string): any => {
    const chunk = chunks.get(id);
    if (!chunk) return null;

    return {
      id: chunk.id,
      text: chunk.text,
      source: chunk.source,
      metadata: chunk.metadata,
    };
  },

  // Step 60: 청크 삭제
  "rag-chunk-delete": (id: string): boolean => {
    return chunks.delete(id);
  },

  // Step 60: 소스별 청크 필터링
  "rag-chunks-by-source": (source: string): any[] => {
    const results = [];

    for (const [id, chunk] of chunks.entries()) {
      if (chunk.source === source) {
        results.push({
          id,
          text: chunk.text.substring(0, 100) + '...',
        });
      }
    }

    return results;
  },

  // Step 60: RAG 통계
  "rag-stats": (): any => {
    const sources = new Set<string>();

    for (const chunk of chunks.values()) {
      sources.add(chunk.source);
    }

    return {
      totalChunks: chunks.size,
      sources: Array.from(sources),
      totalChunkSize: Array.from(chunks.values()).reduce(
        (sum, c) => sum + c.text.length,
        0
      ),
    };
  },

  // Step 60: RAG 전체 삭제
  "rag-clear": (): number => {
    const size = chunks.size;
    chunks.clear();
    return size;
  },

  // Step 60: 다중 쿼리 검색 (하나의 쿼리를 변형해서 여러 번 검색)
  "rag-multi-query": (
    baseQuery: string,
    variations: string[],
    options: any = {}
  ): any[] => {
    const allResults: Map<string, number> = new Map();

    // 원본 쿼리
    const baseResults = (ragV2Module['rag-search'] as any)(baseQuery, options);
    for (const result of baseResults) {
      allResults.set(result.id, parseFloat(result.similarity));
    }

    // 변형 쿼리
    for (const variation of variations) {
      const varResults = (ragV2Module['rag-search'] as any)(variation, {
        top: 10,
        threshold: options.threshold || 0.0,
      });
      for (const result of varResults) {
        const current = allResults.get(result.id) || 0;
        allResults.set(result.id, current + parseFloat(result.similarity));
      }
    }

    // 누적 유사도로 정렬
    return Array.from(allResults.entries())
      .map(([id, score]) => {
        const chunk = chunks.get(id);
        return {
          id,
          similarityScore: (score / (variations.length + 1)).toFixed(3),
          text: chunk?.text.substring(0, 200) + '...' || '',
        };
      })
      .sort((a, b) => parseFloat(b.similarityScore) - parseFloat(a.similarityScore))
      .slice(0, 5);
  },
};

export function createRagV2Module(): Record<string, any> {
  return ragV2Module;
}
