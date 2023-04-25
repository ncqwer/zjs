/* eslint-disable import/named */
import { BaseChatMemory } from 'langchain/memory';
import type { BaseChatMemoryInput } from 'langchain/memory';
import { Collection } from 'chromadb';
import type { Embeddings } from 'langchain/embeddings';
import { getInputValue } from 'langchain/memory';
import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
} from 'langchain/schema';

type OutputValues = Record<string, any>;
type InputValues = Record<string, any>;

export type ChromaMemoryInput = {
  collection: Collection;
  embeddings: Embeddings;
  meta: Record<string, string | number>;
  stashQA: (question: string, answer: string) => Promise<string>;
  fetchQA: (ids: string[]) => Promise<{ question: string; answer: string }[]>;
  memoryKey: string;
  n: number;
  setInfo: (info: any) => void;
} & BaseChatMemoryInput;

export class ChromaMemory extends BaseChatMemory {
  collection: Collection;
  embeddings: Embeddings;
  meta: Record<string, string | number>;
  stashQA: (question: string, answer: string) => Promise<string>;
  fetchQA: (ids: string[]) => Promise<{ question: string; answer: string }[]>;
  memoryKey: string;
  n: number;
  setInfo: (info: any) => void;

  constructor({
    returnMessages,
    inputKey,
    outputKey,
    chatHistory,
    collection,
    embeddings,
    meta,
    stashQA,
    fetchQA,
    memoryKey,
    n,
    setInfo,
  }: ChromaMemoryInput) {
    super({ returnMessages, inputKey, outputKey, chatHistory });
    this.collection = collection;
    this.embeddings = embeddings;
    this.meta = meta;
    this.stashQA = stashQA;
    this.fetchQA = fetchQA;
    this.memoryKey = memoryKey;
    this.n = n;
    this.setInfo = setInfo;
  }

  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues,
  ): Promise<void> {
    // await super.saveContext(inputValues, outputValues); // this is useless

    const input = getInputValue(inputValues, this.inputKey);
    const outputKey = getInputValue(outputValues, this.outputKey);

    const qaPairText = `Human:${input}\nAI:${outputKey}`;
    const qaPairVec = await this.embeddings.embedQuery(qaPairText);

    const id = await this.stashQA(input, outputKey);

    // set id for current qaPair
    this.setInfo({ id });

    await this.collection.add(id, qaPairVec, this.meta); //
  }

  async loadMemoryVariables(values: InputValues) {
    const input = getInputValue(values, this.inputKey);
    const inputVec = await this.embeddings.embedQuery(input);

    const count = await this.collection.count();
    const tmp = await this.collection.query(
      inputVec,
      Math.min(count, this.n),
      this.meta,
    );
    const { ids } = tmp;

    const qaPairs = await this.fetchQA(ids?.[0] ?? []);

    if (this.returnMessages) {
      const result = {
        [this.memoryKey]: qaPairs.reduce(
          (acc, v) =>
            acc.concat(
              new HumanChatMessage(v.question),
              new AIChatMessage(v.answer),
            ),
          [] as BaseChatMessage[],
        ),
      };
      return result;
    }
    const result = {
      [this.memoryKey]: qaPairs
        .map((v) => `Human:${v.question}\nAI:${v.answer}`)
        .join('\n'),
    };
    this.setInfo({
      associatedIds: ids,
    });
    return result;
  }
}
