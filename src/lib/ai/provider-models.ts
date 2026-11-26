export interface ProviderModelEntry {
  id: string;
  name: string;
  maxTokens: number | null;
}

/**
 * OpenAI-compatible `/models` for routers (DeepSeek, OmniRoute) that only expose
 * their own ids. OpenAI's `gpt-4/o1/o3/o4` prefix filter would empty the list.
 */
export async function fetchOpenAICompatibleModels(
  apiKey: string,
  baseUrl: string,
): Promise<ProviderModelEntry[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Provider API ${res.status}`);
  const data = (await res.json()) as { data?: { id: string }[] };
  return (data.data ?? []).map((m) => ({ id: m.id, name: m.id, maxTokens: null }));
}
