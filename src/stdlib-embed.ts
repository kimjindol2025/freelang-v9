// stdlib-embed.ts — FreeLang v9 Step 59: 벡터 임베딩 (TF-IDF + 로컬)

type CallFn = (name: string, args: any[]) => any;

interface EmbeddingEntry {
  text: string;
  embedding: number[];
  metadata: Record<string, any>;
}

const embeddings = new Map<string, EmbeddingEntry>();
let embeddingIndex = 0;

// 간단한 TF-IDF 벡터 생성 (로컬)
function generateTfidfVector(text: string, vocabulary: string[]): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vector = new Array(vocabulary.length).fill(0);

  for (const word of words) {
    const idx = vocabulary.indexOf(word);
    if (idx >= 0) {
      vector[idx]++;
    }
  }

  // 정규화
  const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

// 코사인 유사도
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct;
}

const embedModule = {
  // Step 59: 텍스트 임베딩
  "embed-text": (text: string, model: string = 'local'): string => {
    const id = `embed_${Date.now()}_${++embeddingIndex}`;

    // 로컬 모델: 간단한 해시 기반 벡터
    const embedding = Array.from(text).map((ch) => ch.charCodeAt(0) % 10 / 10);

    embeddings.set(id, {
      text,
      embedding,
      metadata: { model, timestamp: Date.now() },
    });

    return id;
  },

  // Step 59: 임베딩 조회
  "embed-get": (id: string): any => {
    const entry = embeddings.get(id);
    if (!entry) return null;
    return {
      text: entry.text,
      embedding: entry.embedding,
      metadata: entry.metadata,
    };
  },

  // Step 59: 유사도 검색
  "embed-search": (
    queryText: string,
    options: any = {}
  ): any[] => {
    const { top = 5, model = 'local' } = options;

    // 쿼리 텍스트 임베딩
    const queryEmbedding = Array.from(queryText).map(
      (ch) => ch.charCodeAt(0) % 10 / 10
    );

    // 모든 임베딩과 유사도 계산
    const results: Array<{ id: string; similarity: number; text: string }> = [];

    for (const [id, entry] of embeddings.entries()) {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({
        id,
        similarity,
        text: entry.text,
      });
    }

    // 유사도로 정렬 후 top N 반환
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, top)
      .map((r) => ({
        id: r.id,
        similarity: r.similarity.toFixed(3),
        text: r.text,
      }));
  },

  // Step 59: 배치 임베딩
  "embed-batch": (texts: string[]): string[] => {
    return texts.map((text) => (embedModule['embed-text'] as any)(text, 'local'));
  },

  // Step 59: 임베딩 저장
  "embed-save": (filepath: string): boolean => {
    try {
      const fs = require('fs');
      const data = Array.from(embeddings.entries()).map(([id, entry]) => ({
        id,
        text: entry.text,
        embedding: entry.embedding,
        metadata: entry.metadata,
      }));
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 59: 임베딩 로드
  "embed-load": (filepath: string): boolean => {
    try {
      const fs = require('fs');
      if (!fs.existsSync(filepath)) return false;
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);

      for (const entry of data) {
        embeddings.set(entry.id, {
          text: entry.text,
          embedding: entry.embedding,
          metadata: entry.metadata,
        });
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  // Step 59: 임베딩 통계
  "embed-stats": (): any => {
    return {
      totalEmbeddings: embeddings.size,
      ids: Array.from(embeddings.keys()),
    };
  },

  // Step 59: 임베딩 삭제
  "embed-delete": (id: string): boolean => {
    return embeddings.delete(id);
  },

  // Step 59: 모든 임베딩 삭제
  "embed-clear": (): number => {
    const size = embeddings.size;
    embeddings.clear();
    return size;
  },
};

export function createEmbedModule(): Record<string, any> {
  return embedModule;
}
