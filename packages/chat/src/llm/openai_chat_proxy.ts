/* eslint-disable valid-jsdoc */
import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { LLM } from 'langchain/llms/base';
import type { BaseLLMParams } from 'langchain/llms/base';
import { createParser } from 'eventsource-parser';
import type { ParseEvent } from 'eventsource-parser';

/**
 * Input to OpenAI class.
 */
export interface OpenAIChatProxyInput {
  /** Sampling temperature to use, between 0 and 2, defaults to 1 */
  temperature: number;

  /** Total probability mass of tokens to consider at each step, between 0 and 1, defaults to 1 */
  topP: number;

  /** Penalizes repeated tokens according to frequency */
  frequencyPenalty: number;

  /** Penalizes repeated tokens */
  presencePenalty: number;

  /** Number of chat completions to generate for each prompt */
  n: number;

  /** Dictionary used to adjust the probability of specific tokens being generated */
  logitBias?: Record<string, number>;

  /** Whether to stream the results or not */
  streaming: boolean;

  /** Model name to use */
  modelName: string;

  /** ChatGPT messages to pass as a prefix to the prompt */
  prefixMessages?: any[];

  /** Holds any additional parameters that are valid to pass to {@link
   * https://platform.openai.com/docs/api-reference/completions/create |
   * `openai.create`} that are not explicitly specified on this class.
   */
  modelKwargs?: Kwargs;

  /** List of stop words to use when generating */
  stop?: string[];

  /**
   * Timeout to use when making requests to OpenAI.
   */
  timeout?: number;

  /**
   * Maximum number of tokens to generate in the completion.  If not specified,
   * defaults to the maximum number of tokens allowed by the model.
   */
  maxTokens?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kwargs = Record<string, any>;

/**
 * Wrapper around OpenAI large language models that use the Chat endpoint.
 *
 * To use you should have the `openai` package installed, with the
 * `OPENAI_API_KEY` environment variable set.
 *
 * @remarks
 * Any parameters that are valid to be passed to {@link
 * https://platform.openai.com/docs/api-reference/chat/create |
 * `openai.createCompletion`} can be passed through {@link modelKwargs}, even
 * if not explicitly available on this class.
 *
 * @augments BaseLLM
 * @augments OpenAIInput
 */
export class OpenAIChatProxy extends LLM implements OpenAIChatProxyInput {
  temperature = 1;

  topP = 1;

  frequencyPenalty = 0;

  presencePenalty = 0;

  n = 1;

  logitBias?: Record<string, number>;

  maxTokens?: number;

  modelName = 'gpt-3.5-turbo';

  prefixMessages?: any[];

  modelKwargs?: Kwargs;

  timeout?: number;

  stop?: string[];

  streaming = false;

  proxy_url: string;
  apiKey: string;

  constructor(
    fields?: Partial<OpenAIChatProxyInput> &
      BaseLLMParams & {
        openAIApiKey?: string;
        proxy_url: string;
      },
  ) {
    super(fields ?? {});

    const apiKey =
      fields?.openAIApiKey ??
      // eslint-disable-next-line no-process-env
      (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    this.modelName = fields?.modelName ?? this.modelName;
    this.prefixMessages = fields?.prefixMessages ?? this.prefixMessages;
    this.modelKwargs = fields?.modelKwargs ?? {};
    this.timeout = fields?.timeout;

    this.temperature = fields?.temperature ?? this.temperature;
    this.topP = fields?.topP ?? this.topP;
    this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
    this.presencePenalty = fields?.presencePenalty ?? this.presencePenalty;
    this.n = fields?.n ?? this.n;
    this.logitBias = fields?.logitBias;
    this.maxTokens = fields?.maxTokens;
    this.stop = fields?.stop;

    this.streaming = fields?.streaming ?? false;

    if (this.streaming && this.n > 1) {
      throw new Error('Cannot stream results when n > 1');
    }

    this.apiKey = apiKey;
    this.proxy_url = fields?.proxy_url || 'https://api.openai.com';
  }

  /**
   * Get the parameters used to invoke the model
   */
  invocationParams() {
    return {
      model: this.modelName,
      temperature: this.temperature,
      top_p: this.topP,
      frequency_penalty: this.frequencyPenalty,
      presence_penalty: this.presencePenalty,
      n: this.n,
      logit_bias: this.logitBias,
      max_tokens: this.maxTokens,
      stop: this.stop,
      stream: this.streaming,
      ...this.modelKwargs,
    };
  }

  /** @ignore */
  _identifyingParams() {
    return {
      model_name: this.modelName,
      apiKey: this.apiKey,
      ...this.invocationParams(),
    };
  }

  /**
   * Get the identifying parameters for the model
   */
  identifyingParams() {
    return {
      model_name: this.modelName,
      apiKey: this.apiKey,
      ...this.invocationParams(),
    };
  }

  private formatMessages(prompt: string) {
    const message = {
      role: 'user',
      content: prompt,
    };
    return this.prefixMessages ? [...this.prefixMessages, message] : [message];
  }

  /** @ignore */
  async _call(
    prompt: string,
    stop?: string[],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<string> {
    if (this.stop && stop) {
      throw new Error('Stop found in input and default params');
    }

    const params = this.invocationParams();
    params.stop = stop ?? params.stop;

    const res = await this.caller.call(
      fetch,
      `${this.proxy_url}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.formatMessages(prompt),
          model: this.modelName,
          stream: !!this.streaming,
        }),
      },
    );
    if (!this.streaming) {
      return res.json().then((data) => data.choices[0].message?.content ?? '');
    }

    let response: any;
    let rejected = false;
    const data: any = await new Promise((resolve, reject) => {
      handleSSE(res, (event: any) => {
        if (event.data?.trim?.() === '[DONE]') {
          resolve(response);
        } else {
          const message = JSON.parse(event.data) as {
            id: string;
            object: string;
            created: number;
            model: string;
            choices: Array<{
              index: number;
              finish_reason: string | null;
              delta: { content?: string; role?: string };
            }>;
          };

          // on the first message set the response properties
          if (!response) {
            response = {
              id: message.id,
              object: message.object,
              created: message.created,
              model: message.model,
              choices: [],
            };
          }

          // on all messages, update choice
          const part = message.choices[0];
          if (part != null) {
            let choice = response.choices.find(
              (c: any) => c.index === part.index,
            );

            if (!choice) {
              choice = {
                index: part.index,
                finish_reason: part.finish_reason ?? undefined,
              };
              response.choices.push(choice);
            }

            if (!choice.message) {
              choice.message = {
                role: part.delta?.role,
                content: part.delta?.content ?? '',
              };
            }

            choice.message.content += part.delta?.content ?? '';
            // eslint-disable-next-line no-void
            void runManager?.handleLLMNewToken(part.delta?.content ?? '');
          }
        }
      }).catch((error) => {
        if (!rejected) {
          rejected = true;
          reject(error);
        }
      });
    });

    return data.choices[0].message?.content ?? '';
  }

  _llmType() {
    return 'openai_proxy';
  }
}

export async function handleSSE(
  response: Response,
  onMessage: (message: ParseEvent) => void,
) {
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error
        ? JSON.stringify(error)
        : `${response.status} ${response.statusText}`,
    );
  }
  if (response.status !== 200) {
    throw new Error(
      `Error from OpenAI: ${response.status} ${response.statusText}`,
    );
  }
  if (!response.body) {
    throw new Error('No response body');
  }
  const parser = createParser((event) => {
    if (event.type === 'event') {
      onMessage(event);
    }
  });
  for await (const chunk of iterableStreamAsync(response.body)) {
    const str = new TextDecoder().decode(chunk);
    parser.feed(str);
  }
}

export async function* iterableStreamAsync(
  stream: ReadableStream,
): AsyncIterableIterator<Uint8Array> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        return;
      } else {
        yield value;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
