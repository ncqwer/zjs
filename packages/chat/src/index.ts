import { ConversationChain } from 'langchain/chains';
// import { BufferMemory } from 'langchain/memory';
// import { GLM } from './llm/glm.ts';
import { OpenAIChatProxy } from './llm/openai_chat_proxy.ts';
// import { EncoderFakeEmbeddings } from './embeddings/encoder_fake.ts';
import { ChromaMemory } from './memory/chroma_memory.ts';
import { ChromaClient } from 'chromadb';
import { v4 as uuid } from 'uuid';
// eslint-disable-next-line import/no-unresolved
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { OpenAIProxyEmbeddings } from './embeddings/openai_proxy_embeddings.ts';

const mockQACache = () => {
  const cache = {};

  return {
    stashQA,
    fetchQA,
  };

  function getNewId() {
    while (true) {
      const id = uuid();
      if (!cache[id]) return id;
    }
  }
  async function stashQA(question: string, answer: string) {
    const id = getNewId();
    cache[id] = { question, answer, createdAt: Date.now() };
    return id;
  }
  async function fetchQA(ids: string[]) {
    const qaPairs = ids.map((id) => cache[id]).filter(Boolean);
    qaPairs.sort((l, r) => l.createdAt - r.createdAt);
    return qaPairs.map((v) => ({ question: v.question, answer: v.answer }));
  }
};

const main = async () => {
  // const model = new GLM({ url: 'http://workspace.izhaji.cloud:8000' });
  const model = new OpenAIChatProxy({
    proxy_url: '',
    openAIApiKey: '',
    streaming: true,
  });
  // const embeddings = new EncoderFakeEmbeddings({ modelName: 'gpt-3.5-turbo' });
  const embeddings = new OpenAIProxyEmbeddings({
    proxy_url: '',
    openAIApiKey: '',
  });

  const rl = readline.createInterface({ input, output });
  const client = new ChromaClient();
  await client.reset(); // for entirely new start
  const collection = await client.getOrCreateCollection('test');
  const qaCache = mockQACache();
  let info = {};
  const setInfo = (v: any) => {
    info = { ...info, ...v };
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const memory = new ChromaMemory({
    inputKey: 'input',
    outputKey: 'output',
    stashQA: qaCache.stashQA,
    fetchQA: qaCache.fetchQA,
    memoryKey: 'history',
    n: 10,
    setInfo,
    meta: {},
    embeddings,
    collection,
  });
  // console.log(memory.n);
  const chain = new ConversationChain({
    outputKey: 'output',
    memory,
    llm: model,
  });
  try {
    while (true) {
      const input = await rl.question('USER:');
      const output = await chain.predict({ input });
      console.log(`AI:${output}`);
    }
  } finally {
    // embeddings.free();
  }
};

main().catch((e) => console.error(e));