import { encoding_for_model } from '@dqbd/tiktoken';
import type { TiktokenModel, Tiktoken } from '@dqbd/tiktoken';
import { Embeddings } from 'langchain/embeddings';

export class EncoderFakeEmbeddings extends Embeddings {
  encoder: Tiktoken;
  constructor({ modelName }: { modelName: TiktokenModel }) {
    super({});
    this.encoder = encoding_for_model(modelName);
  }

  async embedDocuments(documents: string[]) {
    return Promise.all(documents.map((d) => this.embedQuery(d)));
  }

  async embedQuery(text: string): Promise<number[]> {
    const vec = this.encoder.encode(text);
    return Array.from(vec);
  }

  free() {
    this.encoder.free();
  }
}
