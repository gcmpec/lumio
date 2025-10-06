import { useEffect, useState } from "react";
import clsx from "clsx";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EligibleTask {
  id: number;
  macroprocess: string;
  process: string;
  label: string;
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
  macroprocess: "",
  process: "",
  label: "",
};

const EligibleTasksManager = () => {
  const [tasks, setTasks] = useState<EligibleTask[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const showMessage = (text: string, variant: "success" | "error") => {
    setMessage({ text, variant });
    setTimeout(() => setMessage(null), 4000);
  };

  const resetForm = () => setForm(initialForm);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON<{ items: EligibleTask[] }>("/api/admin/eligible/tasks");
      setTasks(data.items ?? []);
    } catch (error) {
      console.error(error);
      showMessage(error instanceof Error ? error.message : "Nǜo foi poss��vel carregar as tarefas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const payload = {
      macroprocess: form.macroprocess.trim(),
      process: form.process.trim(),
      label: form.label.trim(),
    };

    if (!payload.macroprocess || !payload.process || !payload.label) {
      showMessage("Preenche o macroprocesso, processo e tarefa", "error");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await fetchJSON(`/api/admin/eligible/tasks/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Tarefa atualizada", "success");
      } else {
        await fetchJSON("/api/admin/eligible/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        showMessage("Tarefa criada", "success");
      }
      await loadTasks();
      resetForm();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Ocorreu um erro a guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task: EligibleTask) => {
    setForm({ id: task.id, macroprocess: task.macroprocess, process: task.process, label: task.label });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (task: EligibleTask) => {
    const confirmed = window.confirm(`Apagar a tarefa "${task.label}"?`);
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/admin/eligible/tasks/${task.id}`, { method: "DELETE" });
      showMessage("Tarefa apagada", "success");
      await loadTasks();
      if (form.id === task.id) {
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
          <h2 className="text-lg font-semibold">{form.id ? "Editar tarefa eleg��vel" : "Adicionar tarefa eleg��vel"}</h2>
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="macroprocess">Macroprocesso</Label>
            <Input
              id="macroprocess"
              value={form.macroprocess}
              onChange={(event) => setForm((prev) => ({ ...prev, macroprocess: event.target.value }))}
              placeholder="Macroprocesso"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="process">Processo</Label>
            <Input
              id="process"
              value={form.process}
              onChange={(event) => setForm((prev) => ({ ...prev, process: event.target.value }))}
              placeholder="Processo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-label">Tarefa</Label>
            <Input
              id="task-label"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Nome da tarefa"
              required
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>
            {saving ? "A guardar..." : form.id ? "Guardar altera����es" : "Adicionar tarefa"}
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={loadTasks}
            disabled={loading || saving}
          >
            Recarregar lista
          </button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tarefas eleg��veis</h3>
          <span className="text-sm text-muted-foreground">{loading ? "A carregar..." : `${tasks.length} registos`}</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar tarefas...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda nǜo existem tarefas eleg��veis configuradas.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold">{task.macroprocess} &gt; {task.process}</p>
                  <p className="text-sm text-muted-foreground">{task.label}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                    onClick={() => handleEdit(task)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({ variant: "destructive", size: "sm" })}
                    onClick={() => handleDelete(task)}
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

export default EligibleTasksManager;
