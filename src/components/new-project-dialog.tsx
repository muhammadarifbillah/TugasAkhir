"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { csrfFetch } from "@/lib/csrf-client";
import type { Dictionary } from "@/lib/i18n";

const TEMPLATES = [
  { code: "custom", label: "templateCustom", desc: null, req: null },
  { code: "e-commerce", label: "templateEcommerce", desc: "templateEcommerceDesc", req: "templateEcommerceReq" },
  { code: "saas", label: "templateSaas", desc: "templateSaasDesc", req: "templateSaasReq" },
  { code: "rest-api", label: "templateRestApi", desc: "templateRestApiDesc", req: "templateRestApiReq" },
  { code: "lms", label: "templateLms", desc: "templateLmsDesc", req: "templateLmsReq" },
] as const;

export function NewProjectDialog({
  dict,
  lang,
  preferredLanguage,
}: {
  dict: Dictionary;
  lang: string;
  preferredLanguage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState("custom");
  const [outputLanguage, setOutputLanguage] = useState(preferredLanguage === "id" ? "id" : "en");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [uiPreferences, setUiPreferences] = useState("");

  function changeTemplate(code: string) {
    setTemplate(code);
    const preset = TEMPLATES.find((t) => t.code === code);
    setDescription(preset?.desc ? dict.dashboard[preset.desc] : "");
    setRequirements(preset?.req ? dict.dashboard[preset.req] : "");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await csrfFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: description.trim() || form.get("description"),
          template,
          scopeRequirements: requirements.trim() || form.get("scopeRequirements"),
          uiPreferences: uiPreferences.trim(),
          outputLanguage,
        }),
      });
      const data = (await res.json()) as { project?: { id: string }; error?: string };
      if (!res.ok || !data.project) {
        setError(data.error ?? dict.dashboard.failedCreateProject);
        return;
      }
      router.push(`/${lang}/studio/${data.project.id}/analysis`);
    } catch {
      setError(dict.dashboard.failedCreateProject);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          {dict.dashboard.newProject}
        </CardTitle>
        <CardDescription>{dict.dashboard.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{dict.dashboard.name}</Label>
            <Input id="name" name="name" required maxLength={120} placeholder={dict.dashboard.phName} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template">{dict.dashboard.template}</Label>
            <Select value={template} onValueChange={changeTemplate}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {dict.dashboard[t.label]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="outputLanguage">{dict.dashboard.contentLanguage}</Label>
            <Select value={outputLanguage} onValueChange={setOutputLanguage}>
              <SelectTrigger id="outputLanguage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dict.dashboard.languages).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{dict.dashboard.contentLanguageHint}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{dict.dashboard.description}</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dict.dashboard.phDescription}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="uiPreferences">{dict.dashboard.uiPreferences}</Label>
            <Textarea
              id="uiPreferences"
              name="uiPreferences"
              rows={2}
              value={uiPreferences}
              onChange={(e) => setUiPreferences(e.target.value)}
              placeholder={dict.dashboard.phUiPreferences}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scopeRequirements">{dict.dashboard.requirements}</Label>
            <Textarea
              id="scopeRequirements"
              name="scopeRequirements"
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={dict.dashboard.phRequirements}
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin" />}
            {dict.dashboard.newProject}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
