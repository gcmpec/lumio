import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EligibleEngagement {
  id: number;
  engagement_code: string;
  engagement_name: string;
}

interface EligibleItem {
  id: number;
  label: string;
}

interface EngagementTaskInput {
  label: string;
  eligible_task_id: number | null;
}

interface EngagementDeliverableInput {
  label: string;
  eligible_deliverable_id: number | null;
}

interface ManagerEngagementRecord {
  id: number;
  engagement_code: string;
  engagement_name: string;
  eligible_engagement_id: number | null;
  tasks: Array<{ id: number; label: string; eligible_task_id: number | null }>;
  deliverables: Array<{ id: number; label: string; eligible_deliverable_id: number | null }>;
}

interface FormState {
  engagement_code: string;
  engagement_name: string;
  eligible_engagement_id: number | null;
  tasks: EngagementTaskInput[];
  deliverables: EngagementDeliverableInput[];
}

const createEmptyFormState = (): FormState => ({
  engagement_code: "",
  engagement_name: "",
  eligible_engagement_id: null,
  tasks: [
    { label: "", eligible_task_id: null },
  ],
  deliverables: [
    { label: "", eligible_deliverable_id: null },
  ],
});

const messageClasses = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

function matchEligibleId(label: string, items: EligibleItem[]): number | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  const match = items.find((item) => item.label.trim().toLowerCase() === normalized);
  return match ? match.id : null;
}

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload && (payload as any).success === false)) {
    const message = (payload as any)?.message ?? "Ocorreu um erro inesperado";
    throw new Error(message);
  }
  return payload;
}

type MessageState = { text: string; variant: "success" | "error" } | null;

type EngagementPayload = {
  engagement_code: string;
  engagement_name: string;
  eligible_engagement_id: number | null;
  tasks: Array<{ label: string; eligible_task_id: number | null }>;
  deliverables: Array<{ label: string; eligible_deliverable_id: number | null }>;
};

const EngagementManager = () => {
  const [engagements, setEngagements] = useState<ManagerEngagementRecord[]>([]);
  const [eligibleEngagements, setEligibleEngagements] = useState<EligibleEngagement[]>([]);
  const [eligibleTasks, setEligibleTasks] = useState<EligibleItem[]>([]);
  const [eligibleDeliverables, setEligibleDeliverables] = useState<EligibleItem[]>([]);
  const [form, setForm] = useState<FormState>(createEmptyFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const resetForm = () => {
    setForm(createEmptyFormState());
    setEditingId(null);
  };

  const showMessage = (text: string, variant: "success" | "error") => {
    setMessage({ text, variant });
    setTimeout(() => setMessage(null), 6000);
  };

  const loadEligibleData = async () => {
    try {
      const [engagementRes, taskRes, deliverableRes] = await Promise.all([
        fetchJSON<{ items: EligibleEngagement[] }>("/api/manager/eligible/engagements"),
        fetchJSON<{ items: EligibleItem[] }>("/api/manager/eligible/tasks"),
        fetchJSON<{ items: EligibleItem[] }>("/api/manager/eligible/deliverables"),
      ]);
      setEligibleEngagements(engagementRes.items ?? []);
      setEligibleTasks(taskRes.items ?? []);
      setEligibleDeliverables(deliverableRes.items ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadEngagements = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON<{ engagements: ManagerEngagementRecord[] }>("/api/manager/engagements");
      setEngagements(data.engagements ?? []);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível carregar os engagements", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEngagements();
    loadEligibleData();
  }, []);

  const handleEligibleEngagementSelect = (id: number) => {
    const selected = eligibleEngagements.find((item) => item.id === id);
    if (!selected) return;
    setForm((prev) => ({
      ...prev,
      engagement_code: selected.engagement_code,
      engagement_name: selected.engagement_name,
      eligible_engagement_id: selected.id,
    }));
  };

  const updateTaskAt = (index: number, value: string) => {
    setForm((prev) => {
      const tasks = [...prev.tasks];
      tasks[index] = {
        label: value,
        eligible_task_id: matchEligibleId(value, eligibleTasks),
      };
      return { ...prev, tasks };
    });
  };

  const updateDeliverableAt = (index: number, value: string) => {
    setForm((prev) => {
      const deliverables = [...prev.deliverables];
      deliverables[index] = {
        label: value,
        eligible_deliverable_id: matchEligibleId(value, eligibleDeliverables),
      };
      return { ...prev, deliverables };
    });
  };

  const addTaskRow = () => {
    setForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { label: "", eligible_task_id: null }],
    }));
  };

  const addDeliverableRow = () => {
    setForm((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, { label: "", eligible_deliverable_id: null }],
    }));
  };

  const removeTaskAt = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, idx) => idx !== index),
    }));
  };

  const removeDeliverableAt = (index: number) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, idx) => idx !== index),
    }));
  };

  const preparePayload = (): EngagementPayload => ({
    engagement_code: form.engagement_code.trim(),
    engagement_name: form.engagement_name.trim(),
    eligible_engagement_id: form.eligible_engagement_id,
    tasks: form.tasks
      .map((task) => ({
        label: task.label.trim(),
        eligible_task_id: task.label.trim() ? task.eligible_task_id : null,
      }))
      .filter((task) => task.label.length > 0),
    deliverables: form.deliverables
      .map((deliverable) => ({
        label: deliverable.label.trim(),
        eligible_deliverable_id: deliverable.label.trim() ? deliverable.eligible_deliverable_id : null,
      }))
      .filter((deliverable) => deliverable.label.length > 0),
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const payload = preparePayload();
    if (!payload.engagement_code || !payload.engagement_name) {
      showMessage("Indica o código e o nome do engagement", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await fetchJSON(`/api/manager/engagements/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Engagement atualizado com sucesso", "success");
      } else {
        await fetchJSON("/api/manager/engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Engagement criado com sucesso", "success");
      }
      await loadEngagements();
      resetForm();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível guardar o engagement", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (engagement: ManagerEngagementRecord) => {
    setEditingId(engagement.id);
    setForm({
      engagement_code: engagement.engagement_code,
      engagement_name: engagement.engagement_name,
      eligible_engagement_id: engagement.eligible_engagement_id,
      tasks: engagement.tasks.map((task) => ({
        label: task.label,
        eligible_task_id: task.eligible_task_id,
      })),
      deliverables: engagement.deliverables.map((deliverable) => ({
        label: deliverable.label,
        eligible_deliverable_id: deliverable.eligible_deliverable_id,
      })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (engagement: ManagerEngagementRecord) => {
    const confirmed = window.confirm(`Apagar o engagement ${engagement.engagement_name}?`);
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/manager/engagements/${engagement.id}`, { method: "DELETE" });
      showMessage("Engagement apagado com sucesso", "success");
      await loadEngagements();
      if (editingId === engagement.id) {
        resetForm();
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Não foi possível apagar o engagement", "error");
    }
  };

  const engagementOptions = useMemo(() => eligibleEngagements, [eligibleEngagements]);

  return (
    <div className="space-y-8">
      {message && (
        <div className={clsx("rounded-md border px-4 py-3 text-sm", messageClasses[message.variant])}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border bg-card p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? "Editar engagement" : "Novo engagement"}</h2>
            <p className="text-sm text-muted-foreground">
              Define o código, nome, tarefas e deliverables disponíveis para este engagement.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              onClick={resetForm}
              disabled={saving}
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="engagement-code">Código do engagement</Label>
              <Input
                id="engagement-code"
                name="engagement_code"
                value={form.engagement_code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, engagement_code: event.target.value, eligible_engagement_id: null }))
                }
                placeholder="Código interno"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engagement-name">Nome do engagement</Label>
              <Input
                id="engagement-name"
                name="engagement_name"
                value={form.engagement_name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, engagement_name: event.target.value, eligible_engagement_id: null }))
                }
                placeholder="Nome visível para a equipa"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="eligible-engagement">Sugestões existentes</Label>
              <select
                id="eligible-engagement"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.eligible_engagement_id ?? ""}
                onChange={(event) => {
                  const selectedId = event.target.value ? Number.parseInt(event.target.value, 10) : null;
                  if (selectedId) {
                    handleEligibleEngagementSelect(selectedId);
                  } else {
                    setForm((prev) => ({ ...prev, eligible_engagement_id: null }));
                  }
                }}
              >
                <option value="">Seleciona um engagement sugerido</option>
                {engagementOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.engagement_code} — {option.engagement_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className={buttonVariants({ variant: "outline", size: "sm" })}
                onClick={loadEligibleData}
              >
                Atualizar sugestões
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tarefas elegíveis</h3>
              <button
                type="button"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
                onClick={addTaskRow}
              >
                Adicionar tarefa
              </button>
            </div>
            {form.tasks.map((task, index) => (
              <div key={`task-${index}`} className="flex items-center gap-3">
                <Input
                  list="eligible-tasks-list"
                  placeholder="Descrição da tarefa"
                  value={task.label}
                  onChange={(event) => updateTaskAt(index, event.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  onClick={() => removeTaskAt(index)}
                  disabled={form.tasks.length === 1}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Deliverables elegíveis</h3>
              <button
                type="button"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
                onClick={addDeliverableRow}
              >
                Adicionar deliverable
              </button>
            </div>
            {form.deliverables.map((deliverable, index) => (
              <div key={`deliverable-${index}`} className="flex items-center gap-3">
                <Input
                  list="eligible-deliverables-list"
                  placeholder="Descrição do deliverable"
                  value={deliverable.label}
                  onChange={(event) => updateDeliverableAt(index, event.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  onClick={() => removeDeliverableAt(index)}
                  disabled={form.deliverables.length === 1}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className={buttonVariants({ size: "sm" })}
              disabled={saving}
            >
              {saving ? "A guardar..." : editingId ? "Guardar alterações" : "Criar engagement"}
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              onClick={resetForm}
              disabled={saving}
            >
              Limpar formulário
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Engagements configurados</h2>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            onClick={loadEngagements}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar engagements...</p>
        ) : engagements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não existem engagements configurados.</p>
        ) : (
          <div className="space-y-4">
            {engagements.map((engagement) => (
              <div key={engagement.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">{engagement.engagement_code}</p>
                    <h3 className="text-lg font-semibold">{engagement.engagement_name}</h3>
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
                </div>

                {engagement.tasks.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tarefas</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {engagement.tasks.map((task) => (
                        <li key={`task-${engagement.id}-${task.id}`}>{task.label}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {engagement.deliverables.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliverables</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {engagement.deliverables.map((deliverable) => (
                        <li key={`deliverable-${engagement.id}-${deliverable.id}`}>{deliverable.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <datalist id="eligible-tasks-list">
        {eligibleTasks.map((task) => (
          <option key={`task-option-${task.id}`} value={task.label} />
        ))}
      </datalist>

      <datalist id="eligible-deliverables-list">
        {eligibleDeliverables.map((deliverable) => (
          <option key={`deliverable-option-${deliverable.id}`} value={deliverable.label} />
        ))}
      </datalist>
    </div>
  );
};

export default EngagementManager;
