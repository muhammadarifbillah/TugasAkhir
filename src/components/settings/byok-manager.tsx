"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, KeyRound, Loader2, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { csrfFetch } from "@/lib/csrf-client";
import type { Dictionary } from "@/lib/i18n";

interface ProviderRow {
  code: string;
  name: string;
  requiresKey: boolean;
}
interface ApiKeyRow {
  id: string;
  providerCode: string;
  keyMasked: string;
  label: string | null;
  isActive: boolean;
}
interface ModelRow {
  id: string;
  providerCode: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  apiKeyMasked: string | null;
}

export function ByokManager({
  providers,
  apiKeys,
  models,
  dict,
}: {
  providers: ProviderRow[];
  apiKeys: ApiKeyRow[];
  models: ModelRow[];
  dict: Dictionary;
}) {
  const [keys, setKeys] = useState(apiKeys);
  const [modelRows, setModelRows] = useState(models);

  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Add key form state
  const [keyProvider, setKeyProvider] = useState(providers[0]?.code ?? "");
  const [keyValue, setKeyValue] = useState("");
  const [keyLabel, setKeyLabel] = useState("");

  // Add model form state
  const [modelProvider, setModelProvider] = useState(providers[0]?.code ?? "");
  const [modelName, setModelName] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [modelTemp, setModelTemp] = useState("0.7");
  const [modelMaxTokens, setModelMaxTokens] = useState("16384");

  // Dynamic model list state
  const [modelList, setModelList] = useState<{ id: string; name: string; maxTokens: number | null }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelListError, setModelListError] = useState<string | null>(null);
  const [customModelMode, setCustomModelMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModels = useCallback(async (providerCode: string, apiKeyId: string) => {
    if (providerCode === "anthropic") {
      setLoadingModels(true);
      setModelListError(null);
      try {
        const res = await csrfFetch("/api/models/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerCode }),
        });
        const data = (await res.json()) as { models?: { id: string; name: string; maxTokens: number | null }[]; error?: string };
        setModelList(data.models ?? []);
      } catch {
        setModelList([]);
        setModelListError(dict.settings.fetchModelsFailed);
      }
      setLoadingModels(false);
      return;
    }

    if (providerCode === "ollama") {
      setLoadingModels(true);
      setModelListError(null);
      try {
        const res = await csrfFetch("/api/models/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerCode }),
        });
        const data = (await res.json()) as { models?: { id: string; name: string; maxTokens: number | null }[]; error?: string };
        setModelList(data.models ?? []);
      } catch {
        setModelList([]);
        setModelListError(dict.settings.fetchModelsFailed);
      }
      setLoadingModels(false);
      return;
    }

    if (!apiKeyId) {
      setModelList([]);
      return;
    }

    setLoadingModels(true);
    setModelListError(null);
    try {
      const res = await csrfFetch("/api/models/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerCode, apiKeyId }),
      });
      const data = (await res.json()) as {
        models?: { id: string; name: string; maxTokens: number | null }[];
        error?: string;
        fallback?: boolean;
      };
      setModelList(data.models ?? []);
      if (data.fallback) setModelListError(dict.settings.fetchModelsFallback);
      else if (data.error) setModelListError(data.error);
    } catch {
      setModelList([]);
      setModelListError(dict.settings.fetchModelsFailed);
    }
    setLoadingModels(false);
  }, [dict.settings.fetchModelsFailed, dict.settings.fetchModelsFallback]);

  // Debounced fetch when provider or key changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (customModelMode) return;
    debounceRef.current = setTimeout(() => {
      if (modelProvider) {
        fetchModels(modelProvider, modelKey);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [modelProvider, modelKey, fetchModels, customModelMode]);

  function changeKeyProvider(v: string) {
    setKeyProvider(v);
    setTestState("idle");
    setTestLatency(null);
    setTestError(null);
  }

  function changeKeyValue(v: string) {
    setKeyValue(v);
    setTestState("idle");
    setTestLatency(null);
    setTestError(null);
  }

  async function addKey(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setKeyError(null);
    try {
      const res = await csrfFetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerCode: keyProvider, apiKey: keyValue, label: keyLabel }),
      });
      if (!res.ok) {
        setKeyError(((await res.json()) as { error?: string }).error ?? dict.settings.failedAddKey);
        return;
      }
      const key = (await res.json()) as ApiKeyRow;
      setKeys((prev) => [key, ...prev]);
      setKeyValue("");
      setKeyLabel("");
      setShowKeyForm(false);
    } catch {
      // Without this the rejection is unhandled and `busy` stays true forever,
      // leaving the Save button permanently disabled.
      setKeyError(dict.studio.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function testKey() {
    if (!keyValue.trim()) return;
    setTestState("testing");
    setTestError(null);
    setTestLatency(null);
    try {
      const res = await csrfFetch("/api/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerCode: keyProvider, apiKey: keyValue }),
      });
      const data = (await res.json()) as { ok?: boolean; latency?: number; error?: string };
      if (res.ok && data.ok) {
        setTestState("ok");
        setTestLatency(data.latency ?? null);
      } else {
        setTestState("fail");
        setTestError(data.error ?? dict.settings.connectionFailed);
      }
    } catch {
      setTestState("fail");
      setTestError(dict.settings.connectionFailed);
    }
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setModelError(null);
    try {
      const provider = providers.find((p) => p.code === modelProvider);
      const res = await csrfFetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerCode: modelProvider,
          apiKeyId: provider?.requiresKey ? modelKey || null : null,
          modelName: modelName.trim().toLowerCase(),
          temperature: Number.isNaN(parseFloat(modelTemp)) ? 0.7 : parseFloat(modelTemp),
          maxTokens: Number.isNaN(parseInt(modelMaxTokens, 10)) ? 16384 : parseInt(modelMaxTokens, 10),
        }),
      });
      if (!res.ok) {
        setModelError(((await res.json()) as { error?: string }).error ?? dict.settings.failedAddModel);
        return;
      }
      const model = (await res.json()).model as ModelRow;
      setModelRows((prev) => [model, ...prev.map((m) => (m.isDefault ? { ...m, isDefault: false } : m))]);
      setModelName("");
      setShowModelForm(false);
    } catch {
      setModelError(dict.studio.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function deleteKey(id: string) {
    try {
      const res = await csrfFetch(`/api/keys/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string; deletedModels?: string[] };
      if (!res.ok) {
        setKeyError(data.error ?? dict.settings.failedAddKey);
        return;
      }
      const deleted = new Set(data.deletedModels ?? []);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      if (deleted.size > 0) {
        setModelRows((prev) => prev.filter((m) => !deleted.has(m.id)));
      }
    } catch {
      setKeyError(dict.settings.connectionFailed);
    }
  }

  async function setDefaultModel(id: string) {
    try {
      const res = await csrfFetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setModelError(data.error ?? dict.settings.failedAddModel);
        return;
      }
      setModelRows((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch {
      setModelError(dict.settings.connectionFailed);
    }
  }

  async function deleteModel(id: string) {
    try {
      const res = await csrfFetch(`/api/models/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setModelError(data.error ?? dict.settings.failedAddModel);
        return;
      }
      setModelRows((prev) => {
        const removed = prev.find((m) => m.id === id);
        const next = prev.filter((m) => m.id !== id);
        if (removed?.isDefault && !next.some((m) => m.isDefault) && next.length > 0) {
          return next.map((m, i) => (i === 0 ? { ...m, isDefault: true } : m));
        }
        return next;
      });
    } catch {
      setModelError(dict.settings.connectionFailed);
    }
  }

  async function toggleKeyActive(id: string, current: boolean) {
    try {
      const res = await csrfFetch(`/api/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setKeyError(data.error ?? dict.settings.failedAddKey);
        return;
      }
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: !current } : k)));
    } catch {
      setKeyError(dict.settings.connectionFailed);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {dict.settings.aiModels}
            </span>
            <Button size="sm" variant="outline" onClick={() => setShowKeyForm((v) => !v)}>
              <Plus /> {dict.settings.addKey}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showKeyForm && (
            <form onSubmit={addKey} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid gap-2">
                <Label htmlFor="keyProvider">{dict.settings.provider}</Label>
                <Select name="keyProvider" value={keyProvider} onValueChange={changeKeyProvider}>
                  <SelectTrigger id="keyProvider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">{dict.settings.apiKey}</Label>
                <Input id="apiKey" name="apiKey" type="password" aria-label={dict.settings.apiKey} value={keyValue} onChange={(e) => changeKeyValue(e.target.value)} required placeholder={dict.settings.phApiKey} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKeyLabel">{dict.settings.keyLabel}</Label>
                <Input
                  id="apiKeyLabel"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  placeholder={dict.settings.phKeyLabel}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testKey}
                  disabled={testState === "testing" || !keyValue.trim()}
                >
                  {testState === "testing" ? <Loader2 className="animate-spin" /> : <Check className="size-3.5" />}
                  {dict.settings.testConnection}
                </Button>
                {testState === "ok" && (
                  <span className="text-xs text-success">
                    {dict.settings.connected}
                    {testLatency != null && ` · ${testLatency}ms`}
                  </span>
                )}
                {testState === "fail" && (
                  <span className="text-xs text-destructive">{dict.settings.testFailed}{testError ? `: ${testError}` : ""}</span>
                )}
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2 className="animate-spin" />}
                {dict.settings.save}
              </Button>
            </form>
          )}

          {keyError && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {keyError}
            </p>
          )}

          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.settings.noApiKeys}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {keys.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant="secondary">{k.providerCode}</Badge>
                    <code className="font-mono text-xs text-muted-foreground truncate">{k.keyMasked}</code>
                    {k.label && <span className="text-xs text-muted-foreground truncate">{k.label}</span>}
                    {!k.isActive && <Badge variant="muted">{dict.settings.inactive}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyActive(k.id, k.isActive)}
                      title={k.isActive ? dict.settings.deactivate : dict.settings.activate}
                      aria-label={k.isActive ? dict.settings.deactivate : dict.settings.activate}
                    >
                      <Check className={`size-4 ${k.isActive ? "text-success" : "text-muted-foreground"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteKey(k.id)} aria-label={dict.settings.delete}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{dict.settings.aiModelsCard}</span>
            <Button size="sm" variant="outline" onClick={() => setShowModelForm((v) => !v)}>
              <Plus /> {dict.settings.addModel}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {showModelForm && (
            <form onSubmit={addModel} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="grid gap-2">
                <Label htmlFor="modelProvider">{dict.settings.provider}</Label>
                <Select
                  name="modelProvider"
                  value={modelProvider}
                  onValueChange={(v) => {
                    setModelProvider(v);
                    setModelName("");
                    setModelKey("");
                    setCustomModelMode(false);
                    setModelList([]);
                  }}
                >
                  <SelectTrigger id="modelProvider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {providers.find((p) => p.code === modelProvider)?.requiresKey && (
                <div className="grid gap-2">
                  <Label htmlFor="modelKey">{dict.settings.apiKey}</Label>
                  <Select name="modelKey" value={modelKey} onValueChange={setModelKey}>
                    <SelectTrigger id="modelKey"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {keys.filter((k) => k.providerCode === modelProvider).map((k) => (
                        <SelectItem key={k.id} value={k.id}>{k.keyMasked}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="modelNameSelect">{dict.settings.modelName}</Label>
                {customModelMode ? (
                  <div className="flex gap-2">
                    <Input
                      id="modelNameCustom"
                      name="modelName"
                      aria-label={dict.settings.modelName}
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      required
                      placeholder={dict.settings.phModelName}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomModelMode(false);
                        setModelName("");
                      }}
                    >
                      {dict.settings.cancel}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <Select
                        name="modelName"
                        value={modelName}
                        onValueChange={(v) => {
                          if (v === "__custom__") {
                            setCustomModelMode(true);
                            setModelName("");
                          } else {
                            setModelName(v);
                            const found = modelList.find((m) => m.id === v);
                            if (found?.maxTokens) {
                              setModelMaxTokens(String(found.maxTokens));
                            }
                          }
                        }}
                        disabled={loadingModels}
                      >
                        <SelectTrigger id="modelNameSelect" aria-label={dict.settings.modelName}>
                          <SelectValue
                            placeholder={
                              loadingModels
                                ? dict.settings.fetchingModels
                                : modelList.length > 0
                                  ? dict.settings.selectModel
                                  : dict.settings.phModelName
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {modelList.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                              {m.maxTokens && (
                                <span className="ml-1 text-[11px] text-muted-foreground">
                                  ({m.maxTokens.toLocaleString()} tokens)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__">
                            {dict.settings.customModelLabel}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {!loadingModels && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => fetchModels(modelProvider, modelKey)}
                          title="Refresh"
                          aria-label={dict.settings.refreshModels}
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    {loadingModels && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        {dict.settings.fetchingModels}
                      </span>
                    )}
                    {modelListError && !loadingModels && (
                      <span className="text-xs text-destructive">{modelListError}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{dict.settings.temperature}</Label>
                  <Input id="modelTemp" name="modelTemp" aria-label={dict.settings.temperature} type="number" step="0.1" min="0" max="2" value={modelTemp} onChange={(e) => setModelTemp(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{dict.settings.maxTokens}</Label>
                  <Input id="modelMaxTokens" name="modelMaxTokens" aria-label={dict.settings.maxTokens} type="number" min="256" value={modelMaxTokens} onChange={(e) => setModelMaxTokens(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={busy || (!modelName && !customModelMode)} className="w-full">
                {busy && <Loader2 className="animate-spin" />}
                {dict.settings.save}
              </Button>
            </form>
          )}

          {modelError && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {modelError}
            </p>
          )}

          {modelRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.settings.noModels}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {modelRows.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant="secondary">{m.providerCode}</Badge>
                    <span className="font-mono truncate">{m.modelName}</span>
                    {m.isDefault && (
                      <Badge variant="success"><Star className="size-3" /> {dict.settings.defaultModel}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {dict.settings.temperatureTokens.replace("{temperature}", String(m.temperature)).replace("{tokens}", String(m.maxTokens))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!m.isDefault && (
                      <Button variant="ghost" size="icon" onClick={() => setDefaultModel(m.id)} title={dict.settings.setDefault} aria-label={dict.settings.setDefault}>
                        <Check className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteModel(m.id)} aria-label={dict.settings.delete}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
