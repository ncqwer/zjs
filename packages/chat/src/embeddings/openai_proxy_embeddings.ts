import { Embeddings } from 'langchain/embeddings';

export class OpenAIProxyEmbeddings extends Embeddings {
  modelName = 'text-embedding-ada-002';

  batchSize = 512;

  stripNewLines = true;

  proxy_url: string;
  apiKey: string;

  constructor({
    modelName,
    batchSize,
    stripNewLines,
    proxy_url,
    openAIApiKey,
  }: Partial<{
    modelName: string;
    batchSize: number;
    stripNewLines: boolean;
  }> & {
    proxy_url: string;
    openAIApiKey: string;
  }) {
    super({});
    this.modelName = modelName ?? this.modelName;
    this.batchSize = batchSize ?? this.batchSize;
    this.stripNewLines = stripNewLines ?? this.stripNewLines;

    this.proxy_url = proxy_url;
    this.apiKey = openAIApiKey;
  }

  async embedDocuments(texts: string[]) {
    const subPrompts = chunkArray(
      this.stripNewLines ? texts.map((t) => t.replaceAll('\n', ' ')) : texts,
      this.batchSize,
    );

    const embeddings: number[][] = [];

    for (let i = 0; i < subPrompts.length; i += 1) {
      const input = subPrompts[i];
      const { data } = await this.caller
        .call(fetch, `${this.proxy_url}/v1/embeddings`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.modelName,
            input,
          }),
        })
        .then((v) => v.json());
      for (let j = 0; j < input.length; j += 1) {
        embeddings.push(data[j].embedding);
      }
    }

    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const { data } = await this.caller
      .call(fetch, `${this.proxy_url}/v1/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          input: this.stripNewLines ? text.replaceAll('\n', ' ') : text,
        }),
      })
      .then((v) => v.json());
    return data[0].embedding;
  }
}

export const chunkArray = <T>(arr: T[], chunkSize: number) =>
  arr.reduce((chunks, elem, index) => {
    const chunkIndex = Math.floor(index / chunkSize);
    const chunk = chunks[chunkIndex] || [];
    // eslint-disable-next-line no-param-reassign
    chunks[chunkIndex] = chunk.concat([elem]);
    return chunks;
  }, [] as T[][]);
