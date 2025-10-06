import { useEffect, useState } from "react";
import clsx from "clsx";
import { DELIVERABLE_PERIODICITIES, DELIVERABLE_PERIODICITY_LABELS } from "@/lib/engagement/catalog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EligibleDeliverable {
  id: number;
  label: string;
  periodicity: (typeof DELIVERABLE_PERIODICITIES)[number];
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
  label: "",
  periodicity: 'not_applicable' as (typeof DELIVERABLE_PERIODICITIES)[number],
};

const EligibleDeliverablesManager = () => {
  const [deliverables, setDeliverables] = useState<EligibleDeliverable[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const showMessage = (text: string, variant: "success" | "error") => {
    setMessage({ text, variant });
    setTimeout(() => setMessage(null), 4000);
  };

  const resetForm = () => setForm(initialForm);

  const loadDeliverables = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON<{ items: EligibleDeliverable[] }>("/api/admin/eligible/deliverables");
      setDeliverables(data.items ?? []);
    } catch (error) {
      console.error(error);
      showMessage(error instanceof Error ? error.message : "Nǜo foi poss��vel carregar os deliverables", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverables();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const payload = {
      label: form.label.trim(),
      periodicity: form.periodicity,
    };

    if (!payload.label) {
      showMessage("Indica a descri��ǜo do deliverable", "error");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await fetchJSON(`/api/admin/eligible/deliverables/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Deliverable atualizado", "success");
      } else {
        await fetchJSON("/api/admin/eligible/deliverables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Deliverable criado", "success");
      }
      await loadDeliverables();
      resetForm();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Ocorreu um erro a guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (deliverable: EligibleDeliverable) => {
    setForm({ id: deliverable.id, label: deliverable.label, periodicity: deliverable.periodicity });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (deliverable: EligibleDeliverable) => {
    const confirmed = window.confirm(`Apagar o deliverable "${deliverable.label}"?`);
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/admin/eligible/deliverables/${deliverable.id}`, { method: "DELETE" });
      showMessage("Deliverable apagado", "success");
      await loadDeliverables();
      if (form.id === deliverable.id) {
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
          <h2 className="text-lg font-semibold">{form.id ? "Editar deliverable eleg��vel" : "Adicionar deliverable eleg��vel"}</h2>
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

        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="deliverable-label">Descri��ǜo</Label>
            <Input
              id="deliverable-label"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Nome do deliverable"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliverable-periodicity">Periodicidade</Label>
            <select
              id="deliverable-periodicity"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.periodicity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, periodicity: event.target.value as (typeof DELIVERABLE_PERIODICITIES)[number] }))
              }
            >
              {DELIVERABLE_PERIODICITIES.map((value) => (
                <option key={value} value={value}>
                  {DELIVERABLE_PERIODICITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>
            {saving ? "A guardar..." : form.id ? "Guardar altera����es" : "Adicionar deliverable"}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={loadDeliverables}
            disabled={loading || saving}
          >
            Recarregar lista
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Deliverables eleg��veis</h3>
          <span className="text-sm text-muted-foreground">{loading ? "A carregar..." : `${deliverables.length} registos`}</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar deliverables...</p>
        ) : deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda nǜo existem deliverables eleg��veis configurados.</p>
        ) : (
          <ul className="space-y-3">
            {deliverables.map((deliverable) => (
              <li key={deliverable.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{deliverable.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {DELIVERABLE_PERIODICITY_LABELS[deliverable.periodicity]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                    onClick={() => handleEdit(deliverable)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "destructive", size: "sm" })}
                    onClick={() => handleDelete(deliverable)}
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

export default EligibleDeliverablesManager;
