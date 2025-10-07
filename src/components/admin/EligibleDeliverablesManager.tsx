import { useEffect, useRef, useState } from "react";



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







interface DeliverablePayload {



  label: string;



  periodicity: (typeof DELIVERABLE_PERIODICITIES)[number];



}







type ListResponse = { success: true; items: EligibleDeliverable[] };



type ExportResponse = { success: true; items: EligibleDeliverable[] };



type ImportResponse = {



  success: true;



  created: EligibleDeliverable[];



  updated: EligibleDeliverable[];



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







const initialForm: { id: number | null } & DeliverablePayload = {



  id: null,



  label: "",



  periodicity: "not_applicable",



};







const EligibleDeliverablesManager = () => {



  const [deliverables, setDeliverables] = useState<EligibleDeliverable[]>([]);



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







  const loadDeliverables = async () => {



    setLoading(true);



    try {



      const data = await fetchJSON<ListResponse>("/api/admin/eligible/deliverables");



      setDeliverables(data.items ?? []);



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível carregar os deliverables", "error");



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







    const payload: DeliverablePayload = {



      label: form.label.trim(),



      periodicity: form.periodicity,



    };







    if (!payload.label) {



      showMessage("Indica a descrição do deliverable", "error");



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



        showMessage("Deliverable elegível atualizado", "success");



      } else {



        await fetchJSON("/api/admin/eligible/deliverables", {



          method: "POST",



          headers: { "Content-Type": "application/json" },



          body: JSON.stringify(payload),



        });



        showMessage("Deliverable elegível criado", "success");



      }



      await loadDeliverables();



      resetForm();



    } catch (error) {



      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao guardar", "error");



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



      showMessage("Deliverable elegível apagado", "success");



      await loadDeliverables();



      if (form.id === deliverable.id) {



        resetForm();



      }



    } catch (error) {



      showMessage(error instanceof Error ? error.message : "Ocorreu um erro ao apagar", "error");



    }



  };







  const handleExport = async () => {



    try {



      const data = await fetchJSON<ExportResponse>("/api/admin/eligible/deliverables/export");



      const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });



      const url = URL.createObjectURL(blob);



      const anchor = document.createElement("a");



      anchor.href = url;



      anchor.download = `eligible-deliverables-${new Date().toISOString().slice(0, 10)}.json`;



      document.body.appendChild(anchor);



      anchor.click();



      document.body.removeChild(anchor);



      URL.revokeObjectURL(url);



      showMessage("Exportação concluída", "success");



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível exportar os deliverables", "error");



    }



  };







  const parseImportFile = async (file: File) => {



    const text = await file.text();



    const parsed = JSON.parse(text) as unknown;



    const items = Array.isArray(parsed) ? parsed : (parsed as any)?.items;



    if (!Array.isArray(items)) {



      throw new Error("O ficheiro deve conter um array de deliverables");



    }



    return items as DeliverablePayload[];



  };







  const summarize = (result: ImportResponse): BulkSummary => ({



    created: result.created.length,



    updated: result.updated.length,



    skipped: result.skipped.length,



  });







  const handleImportPayload = async (items: DeliverablePayload[]) => {



    if (!items.length) {



      showMessage("O ficheiro está vazio", "error");



      return;



    }







    try {



      const response = await fetchJSON<ImportResponse>("/api/admin/eligible/deliverables/import", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({ items }),



      });



      const summary = summarize(response);



      if (response.skipped.length) {



        console.warn("Deliverables ignorados durante a importação", response.skipped);



      }



      showMessage(



        `Importao concluída: ${summary.created} criado(s), ${summary.updated} atualizado(s)${



          summary.skipped ? `, ${summary.skipped} ignorado(s)` : ""



        }`,



        "success",



      );



      await loadDeliverables();



    } catch (error) {



      console.error(error);



      showMessage(error instanceof Error ? error.message : "Não foi possível importar os deliverables", "error");



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



            {form.id ? "Editar deliverable elegível" : "Adicionar deliverable elegível"}



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







        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">



          <div className="space-y-2">



            <Label htmlFor="deliverable-label">Descrio</Label>



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



                setForm((prev) => ({



                  ...prev,



                  periodicity: event.target.value as (typeof DELIVERABLE_PERIODICITIES)[number],



                }))



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







        <div className="mt-4 flex flex-wrap items-center gap-3">



          <button type="submit" className={buttonVariants({ size: "sm" })} disabled={saving}>



            {saving ? "A guardar..." : form.id ? "Guardar alteraes" : "Adicionar deliverable"}



          </button>



          <button



            type="button"



            className={buttonVariants({ variant: "ghost", size: "sm" })}



            onClick={loadDeliverables}



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



          <h3 className="text-lg font-semibold">Deliverables elegíveis</h3>



          <span className="text-sm text-muted-foreground">{loading ? "A carregar..." : `${deliverables.length} registos`}</span>



        </div>







        {loading ? (



          <p className="text-sm text-muted-foreground">A carregar deliverables...</p>



        ) : deliverables.length === 0 ? (



          <p className="text-sm text-muted-foreground">Ainda no existem deliverables elegíveis configurados.</p>



        ) : (



          <ul className="space-y-3">



            {deliverables.map((deliverable) => (



              <li



                key={deliverable.id}



                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm"



              >



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



