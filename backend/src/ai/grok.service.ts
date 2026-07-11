import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Thin client over the Grok (xAI) chat-completions API. The endpoint is
 * OpenAI-compatible, so it also works against OpenRouter by swapping
 * GROK_API_URL / GROK_MODEL. Handles timeout, one retry, and surfaces a
 * typed "unavailable" signal so callers can fall back gracefully.
 */
@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);
  private readonly timeoutMs = 20000;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('GROK_API_KEY');
  }

  /**
   * Ask the model to return a JSON object. Returns the raw assistant text
   * (expected to be JSON) or throws if the service is unavailable.
   */
  async completeJson(system: string, user: string): Promise<string> {
    const apiKey = this.config.get<string>('GROK_API_KEY');
    const baseUrl =
      this.config.get<string>('GROK_API_URL') ?? 'https://api.x.ai/v1';
    const model = this.config.get<string>('GROK_MODEL') ?? 'grok-2-latest';

    if (!apiKey) {
      throw new Error('GROK_API_KEY not configured');
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const body = {
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' as const },
    };

    // One retry on transient failure.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Grok API ${res.status}: ${text.slice(0, 200)}`);
        }

        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Grok API returned empty content');
        }
        return content;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        this.logger.warn(
          `Grok attempt ${attempt} failed: ${(err as Error).message}`,
        );
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Grok request failed');
  }
}
