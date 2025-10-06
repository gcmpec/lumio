import { useEffect, useState } from "react";
import clsx from "clsx";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EligibleEngagement {
  id: number;
  engagement_code: string;
  engagement_name: string;
  created_at: string;
  updated_at: string;
}

type MessageState = { text: string; variant: "success" | "error" } | null;

const messageClasses = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload && (payload as any).success === false)) {
    const message = (payload as any)?.message ?? "Ocorreu um erro inesperado";
    throw new Error(message);
  }
  return payload;
}

const initialForm = {
  id: null as number | null,
  engagement_code: "",
  engagement_name: "",
};

const EligibleEngagementsManager = () => {
  const [engagements, setEngagements] = useState<EligibleEngagement[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const showMessage = (text: string, variant: "success" | "error") => {
    setMessage({ text, variant });
    setTimeout(() => setMessage(null), 4000);
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const loadEngagements = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON<{ items: EligibleEngagement[] }>("/api/admin/eligible/engagements");
      setEngagements(data.items ?? []);
    } catch (error) {
      console.error(error);
      showMessage(error instanceof Error ? error.message : "Nǜo foi poss��vel carregar os engagements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngagements();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const payload = {
      engagement_code: form.engagement_code.trim(),
      engagement_name: form.engagement_name.trim(),
    };

    if (!payload.engagement_code || !payload.engagement_name) {
      showMessage("Indica o c��digo e o nome do engagement", "error");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await fetchJSON(`/api/admin/eligible/engagements/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Engagement atualizado", "success");
      } else {
        await fetchJSON("/api/admin/eligible/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Engagement criado", "success");
      }
      await loadEngagements();
      resetForm();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Ocorreu um erro a guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (engagement: EligibleEngagement) => {
    setForm({ id: engagement.id, engagement_code: engagement.engagement_code, engagement_name: engagement.engagement_name });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (engagement: EligibleEngagement) => {
    const confirmed = window.confirm(`Apagar o engagement ${engagement.engagement_code}?`);
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/admin/eligible/engagements/${engagement.id}`, { method: "DELETE" });
      showMessage("Engagement apagado", "success");
      await loadEngagements();
      if (form.id === engagement.id) {
        resetForm();
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao apagar", "error");
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={clsx("rounded-md border px-4 py-3 text-sm", messageClasses[message.variant])}>{message.text}</div>
      )}

      <form className="rounded-lg border bg-card p-5 shadow" onSubmit={handleSubmit}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {form.id ? "Editar engagement eleg��vel" : "Adicionar engagement eleg��vel"}
          </h2>
          {form.id && (
            <button
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar edi��ǜo
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eligible-engagement-code">C��digo</Label>
            <Input
              id="eligible-engagement-code"
              value={form.engagement_code}
              onChange={(event) => setForm((prev) => ({ ...prev, engagement_code: event.target.value }))}
              placeholder="ex: ENG-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eligible-engagement-name">Nome</Label>
            <Input
              id="eligible-engagement-name"
              value={form.engagement_name}
              onChange={(event) => setForm((prev) => ({ ...prev, engagement_name: event.target.value }))}
              placeholder="Nome do engagement"
              required
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>
            {saving ? "A guardar..." : form.id ? "Guardar altera����es" : "Adicionar engagement"}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={loadEngagements}
            disabled={loading || saving}
          >
            Recarregar lista
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Engagements eleg��veis</h3>
          <span className="text-sm text-muted-foreground">
            {loading ? "A carregar..." : `${engagements.length} registos`}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar engagements...</p>
        ) : engagements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda nǜo existem engagements eleg��veis configurados.</p>
        ) : (
          <ul className="space-y-3">
            {engagements.map((engagement) => (
              <li key={engagement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{engagement.engagement_code}</p>
                  <p className="text-sm text-muted-foreground">{engagement.engagement_name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                    onClick={() => handleEdit(engagement)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "destructive", size: "sm" })}
                    onClick={() => handleDelete(engagement)}
                  >
                    Apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default EligibleEngagementsManager;
