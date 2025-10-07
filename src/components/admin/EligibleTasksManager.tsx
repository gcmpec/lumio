import { useEffect, useRef, useState } from "react";



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







type TaskPayload = {



  macroprocess: string;



  process: string;



  label: string;



};







type ListResponse = { success: true; items: EligibleTask[] };



type ExportResponse = { success: true; items: EligibleTask[] };



type ImportResponse = {



  success: true;



  created: EligibleTask[];



  updated: EligibleTask[];



  skipped: Array<{ input: unknown; reason: string }>;



};







type BulkSummary = { created: number; updated: number; skipped: number };







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



  return payload as T;



}







const initialForm: { id: number | null } & TaskPayload = {



  id: null,



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



  const fileInputRef = useRef<HTMLInputElement | null>(null);







  const showMessage = (text: string, variant: "success" | "error") => {



    setMessage({ text, variant });



    window.setTimeout(() => setMessage(null), 5000);



  };







  const resetForm = () => setForm(initialForm);







  const loadTasks = async () => {



    setLoading(true);



    try {



      const data = await fetchJSON<ListResponse>("/api/admin/eligible/tasks");



      setTasks(data.items ?? []);



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível carregar as tarefas", "error");



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







    const payload: TaskPayload = {



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



        showMessage("Tarefa elegível atualizada", "success");



      } else {



        await fetchJSON("/api/admin/eligible/tasks", {



          method: "POST",



          headers: { "Content-Type": "application/json" },



          body: JSON.stringify(payload),



        });



        showMessage("Tarefa elegível criada", "success");



      }



      await loadTasks();



      resetForm();



    } catch (error) {



      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao guardar", "error");



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



      showMessage("Tarefa elegível apagada", "success");



      await loadTasks();



      if (form.id === task.id) {



        resetForm();



      }



    } catch (error) {



      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao apagar", "error");



    }



  };







  const handleExport = async () => {



    try {



      const data = await fetchJSON<ExportResponse>("/api/admin/eligible/tasks/export");



      const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });



      const url = URL.createObjectURL(blob);



      const anchor = document.createElement("a");



      anchor.href = url;



      anchor.download = `eligible-tasks-${new Date().toISOString().slice(0, 10)}.json`;



      document.body.appendChild(anchor);



      anchor.click();



      document.body.removeChild(anchor);



      URL.revokeObjectURL(url);



      showMessage("Exportação concluída", "success");



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível exportar as tarefas", "error");



    }



  };







  const parseImportFile = async (file: File) => {



    const text = await file.text();



    const parsed = JSON.parse(text) as unknown;



    const items = Array.isArray(parsed) ? parsed : (parsed as any)?.items;



    if (!Array.isArray(items)) {



      throw new Error("O ficheiro deve conter um array de tarefas");



    }



    return items as TaskPayload[];



  };







  const summarize = (result: ImportResponse): BulkSummary => ({



    created: result.created.length,



    updated: result.updated.length,



    skipped: result.skipped.length,



  });







  const handleImportPayload = async (items: TaskPayload[]) => {



    if (!items.length) {



      showMessage("O ficheiro está vazio", "error");



      return;



    }







    try {



      const response = await fetchJSON<ImportResponse>("/api/admin/eligible/tasks/import", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ items }),



      });



      const summary = summarize(response);



      if (response.skipped.length) {



        console.warn("Tarefas ignoradas durante a importao", response.skipped);



      }



      showMessage(



        `Importao concluída: ${summary.created} criada(s), ${summary.updated} atualizada(s)${



          summary.skipped ? `, ${summary.skipped} ignorada(s)` : ""



        }`,



        "success",



      );



      await loadTasks();



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível importar as tarefas", "error");



    }



  };







  const handleImportClick = () => fileInputRef.current?.click();







  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {



    const file = event.target.files?.[0];



    event.target.value = "";



    if (!file) return;



    try {



      const items = await parseImportFile(file);



      await handleImportPayload(items);



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível ler o ficheiro", "error");



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



            {form.id ? "Editar tarefa elegível" : "Adicionar tarefa elegível"}



          </h2>



          {form.id && (



            <button



              type="button"



              className={buttonVariants({ variant: "outline", size: "sm" })}



              onClick={resetForm}



              disabled={saving}



            >



              Cancelar edio



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







        <div className="mt-4 flex flex-wrap items-center gap-3">



          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>



            {saving ? "A guardar..." : form.id ? "Guardar alteraes" : "Adicionar tarefa"}



          </button>



          <button



            type="button"



            className={buttonVariants({ variant: "ghost", size: "sm" })}



            onClick={loadTasks}



            disabled={loading || saving}



          >



            Recarregar lista



          </button>



          <button



            type="button"



            className={buttonVariants({ variant: "outline", size: "sm" })}



            onClick={handleExport}



            disabled={loading}



          >



            Exportar JSON



          </button>



          <button



            type="button"



            className={buttonVariants({ variant: "secondary", size: "sm" })}



            onClick={handleImportClick}



            disabled={saving}



          >



            Importar JSON



          </button>



          <input



            ref={fileInputRef}



            type="file"



            accept="application/json"



            className="hidden"



            onChange={handleFileChange}



          />



        </div>



      </form>







      <section className="space-y-4">



        <div className="flex items-center justify-between">



          <h3 className="text-lg font-semibold">Tarefas elegíveis</h3>



          <span className="text-sm text-muted-foreground">{loading ? "A carregar..." : `${tasks.length} registos`}</span>



        </div>







        {loading ? (



          <p className="text-sm text-muted-foreground">A carregar tarefas...</p>



        ) : tasks.length === 0 ? (



          <p className="text-sm text-muted-foreground">Ainda no existem tarefas elegíveis configuradas.</p>



        ) : (



          <ul className="space-y-3">



            {tasks.map((task) => (



              <li



                key={task.id}



                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm"



              >



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



