import { LLM } from 'langchain/llms/base';
import type { BaseLLMParams } from 'langchain/llms';

export interface GLMInput {
  url: string;
}

export class GLM extends LLM {
  url: string;

  constructor(fields: GLMInput & BaseLLMParams) {
    super({ cache: false });

    this.url = fields.url;
  }

  _llmType() {
    return 'glm';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _call(prompt: string, _stop?: string[]): Promise<string> {
    const res = await this.caller.call(fetch, this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history: [],
      }),
    });
    const data = await res.json();

    // Note this is a little odd, but the output format is not consistent
    // across models, so it makes some amount of sense.
    return String(data.response);
  }
}
