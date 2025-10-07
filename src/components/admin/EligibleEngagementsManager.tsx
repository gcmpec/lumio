import { useEffect, useRef, useState } from "react";






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













type BulkImportSummary = {






  created: number;






  updated: number;






  skipped: number;






};













type ImportResponse = {






  success: true;






  created: EligibleEngagement[];






  updated: EligibleEngagement[];






  skipped: Array<{ input: unknown; reason: string }>;






};













type ExportResponse = { success: true; items: EligibleEngagement[] };













type ListResponse = { success: true; items: EligibleEngagement[] };













type EngagementPayload = {






  engagement_code: string;






  engagement_name: string;






};













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













const initialForm: { id: number | null } & EngagementPayload = {






  id: null,






  engagement_code: "",






  engagement_name: "",






};













const EligibleEngagementsManager = () => {






  const [engagements, setEngagements] = useState<EligibleEngagement[]>([]);






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













  const loadEngagements = async () => {






    setLoading(true);






    try {






      const data = await fetchJSON<ListResponse>("/api/admin/eligible/engagements");






      setEngagements(data.items ?? []);






    } catch (error) {






      console.error(error);






      showMessage(error instanceof Error ? error.message : "Não foi possível carregar os engagements", "error");






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













    const payload: EngagementPayload = {






      engagement_code: form.engagement_code.trim(),






      engagement_name: form.engagement_name.trim(),






    };













    if (!payload.engagement_code || !payload.engagement_name) {






      showMessage("Indica o código e o nome do engagement", "error");






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






        showMessage("Engagement elegível atualizado", "success");






      } else {






        await fetchJSON("/api/admin/eligible/engagements", {






          method: "POST",






          headers: { "Content-Type": "application/json" },






          body: JSON.stringify(payload),






        });






        showMessage("Engagement elegível criado", "success");






      }






      await loadEngagements();






      resetForm();






    } catch (error) {






      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao guardar", "error");






    } finally {






      setSaving(false);






    }






  };













  const handleEdit = (engagement: EligibleEngagement) => {






    setForm({






      id: engagement.id,






      engagement_code: engagement.engagement_code,






      engagement_name: engagement.engagement_name,






    });






    window.scrollTo({ top: 0, behavior: "smooth" });






  };













  const handleDelete = async (engagement: EligibleEngagement) => {






    const confirmed = window.confirm(`Apagar o engagement ${engagement.engagement_code}?`);






    if (!confirmed) return;













    try {






      await fetchJSON(`/api/admin/eligible/engagements/${engagement.id}`, { method: "DELETE" });






      showMessage("Engagement elegível apagado", "success");






      await loadEngagements();






      if (form.id === engagement.id) {






        resetForm();






      }






    } catch (error) {






      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao apagar", "error");






    }






  };













  const handleExport = async () => {






    try {






      const data = await fetchJSON<ExportResponse>("/api/admin/eligible/engagements/export");






      const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });






      const url = URL.createObjectURL(blob);






      const anchor = document.createElement("a");






      anchor.href = url;






      anchor.download = `eligible-engagements-${new Date().toISOString().slice(0, 10)}.json`;






      document.body.appendChild(anchor);






      anchor.click();






      document.body.removeChild(anchor);






      URL.revokeObjectURL(url);






      showMessage("Exportação concluída", "success");






    } catch (error) {






      console.error(error);






      showMessage(error instanceof Error ? error.message : "Não foi possível exportar os engagements", "error");






    }






  };













  const parseImportFile = async (file: File) => {






    const text = await file.text();






    const parsed = JSON.parse(text) as unknown;






    const items = Array.isArray(parsed) ? parsed : (parsed as any)?.items;






    if (!Array.isArray(items)) {






      throw new Error("O ficheiro deve conter um array de engagements");






    }






    return items as EngagementPayload[];






  };













  const summarizeImport = (response: ImportResponse): BulkImportSummary => ({






    created: response.created.length,






    updated: response.updated.length,






    skipped: response.skipped.length,






  });













  const handleImportPayload = async (items: EngagementPayload[]) => {






    if (!items.length) {






      showMessage("O ficheiro está vazio", "error");






      return;






    }













    try {






      const response = await fetchJSON<ImportResponse>("/api/admin/eligible/engagements/import", {






        method: "POST",






        headers: { "Content-Type": "application/json" },






        body: JSON.stringify({ items }),






      });






      const summary = summarizeImport(response);






      if (response.skipped.length) {






        console.warn("Engagements ignorados durante a importação", response.skipped);






      }






      showMessage(






        `Importao concluída: ${summary.created} criado(s), ${summary.updated} atualizado(s)${






          summary.skipped ? `, ${summary.skipped} ignorado(s)` : ""






        }`,






        "success",






      );






      await loadEngagements();






    } catch (error) {






      console.error(error);






      showMessage(error instanceof Error ? error.message : "Não foi possível importar os engagements", "error");






    }






  };













  const handleImportClick = () => {






    fileInputRef.current?.click();






  };













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






            {form.id ? "Editar engagement elegível" : "Adicionar engagement elegível"}






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













        <div className="grid gap-4 md:grid-cols-2">






          <div className="space-y-2">






            <Label htmlFor="eligible-engagement-code">Código</Label>






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













        <div className="mt-4 flex flex-wrap items-center gap-3">






          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>






            {saving ? "A guardar..." : form.id ? "Guardar alteraes" : "Adicionar engagement"}






          </button>






          <button






            type="button"






            className={buttonVariants({ variant: "ghost", size: "sm" })}






            onClick={loadEngagements}






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






          <h3 className="text-lg font-semibold">Engagements elegíveis</h3>






          <span className="text-sm text-muted-foreground">






            {loading ? "A carregar..." : `${engagements.length} registos`}






          </span>






        </div>













        {loading ? (






          <p className="text-sm text-muted-foreground">A carregar engagements...</p>






        ) : engagements.length === 0 ? (






          <p className="text-sm text-muted-foreground">Ainda no existem engagements elegíveis configurados.</p>






        ) : (






          <ul className="space-y-3">






            {engagements.map((engagement) => (






              <li






                key={engagement.id}






                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm"






              >






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






