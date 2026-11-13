import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Check, X, Clock3, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Goal = Tables<"goals">;
type GoalStatus = "pending" | "completed" | "failed";

const statusLabels: Record<GoalStatus, string> = {
  pending: "Pendente",
  completed: "Concluída",
  failed: "Não cumprida",
};

const statusStyles: Record<GoalStatus, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export function GoalCalendar({ session }: { session: Session }) {
  const uid = session.user.id;
  const [month, setMonth] = useState(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editing, setEditing] = useState<Goal | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("pending");
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  }), [monthStart.getTime(), monthEnd.getTime()]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("goals").select("*")
      .eq("user_id", uid)
      .gte("goal_date", format(monthStart, "yyyy-MM-dd"))
      .lte("goal_date", format(monthEnd, "yyyy-MM-dd"))
      .order("goal_date", { ascending: true });
    if (error) toast.error("Não foi possível carregar suas metas: " + error.message);
    setGoals(data ?? []);
    setLoading(false);
  }, [uid, monthStart.getTime(), monthEnd.getTime()]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => ({
    completed: goals.filter((goal) => goal.status === "completed").length,
    pending: goals.filter((goal) => goal.status === "pending").length,
    failed: goals.filter((goal) => goal.status === "failed").length,
  }), [goals]);

  function openNew(date: Date) {
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
    setEditing(null);
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setTitle("");
    setDescription("");
    setStatus("pending");
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setSelectedDate(goal.goal_date);
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setStatus(goal.status as GoalStatus);
    setDialogOpen(true);
  }

  async function saveGoal() {
    if (!title.trim()) { toast.error("Digite o nome da meta"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      goal_date: selectedDate,
      status,
      updated_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase.from("goals").update(payload).eq("id", editing.id).eq("user_id", uid)
      : await supabase.from("goals").insert({ ...payload, user_id: uid });
    setSaving(false);
    if (result.error) { toast.error("Não foi possível salvar: " + result.error.message); return; }
    toast.success(editing ? "Meta atualizada" : "Meta criada");
    setDialogOpen(false);
    await load();
  }

  async function deleteGoal() {
    if (!editing) return;
    const { error } = await supabase.from("goals").delete().eq("id", editing.id).eq("user_id", uid);
    if (error) { toast.error("Não foi possível excluir a meta"); return; }
    toast.success("Meta excluída");
    setDialogOpen(false);
    await load();
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary"><Target className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wider">Constância</span></div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Metas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Planeje seus dias e acompanhe o que conseguiu cumprir.</p>
        </div>
        <Button onClick={() => openNew(new Date())} className="glow rounded-xl"><Plus className="mr-2 h-4 w-4" /> Nova meta</Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-2xl p-3 sm:p-4"><div className="flex items-center gap-2 text-emerald-300"><Check className="h-4 w-4" /><span className="text-xs sm:text-sm">Concluídas</span></div><div className="mt-2 text-2xl font-semibold tabular-nums">{summary.completed}</div></div>
        <div className="glass rounded-2xl p-3 sm:p-4"><div className="flex items-center gap-2 text-amber-300"><Clock3 className="h-4 w-4" /><span className="text-xs sm:text-sm">Pendentes</span></div><div className="mt-2 text-2xl font-semibold tabular-nums">{summary.pending}</div></div>
        <div className="glass rounded-2xl p-3 sm:p-4"><div className="flex items-center gap-2 text-rose-300"><X className="h-4 w-4" /><span className="text-xs sm:text-sm">Não cumpridas</span></div><div className="mt-2 text-2xl font-semibold tabular-nums">{summary.failed}</div></div>
      </div>

      <div className="glass rounded-2xl p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div><h2 className="text-xl font-semibold capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h2><p className="text-xs text-muted-foreground">{goals.length} {goals.length === 1 ? "meta neste mês" : "metas neste mês"}</p></div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())} className="rounded-lg">Hoje</Button>
            <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground">{day}</div>)}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayGoals = goals.filter((goal) => goal.goal_date === dateKey);
            const inMonth = isSameMonth(day, month);
            return (
              <div key={dateKey} className={`min-h-28 rounded-xl border p-1.5 transition sm:min-h-36 sm:p-2 ${inMonth ? "border-border/60 bg-background/20" : "border-transparent bg-background/5 opacity-40"} ${isToday(day) ? "ring-1 ring-primary" : ""}`}>
                <button onClick={() => openNew(day)} className={`mb-1 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{format(day, "d")}</button>
                <div className="space-y-1">
                  {dayGoals.slice(0, 3).map((goal) => (
                    <button key={goal.id} onClick={() => openEdit(goal)} title={goal.title} className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight sm:text-xs ${statusStyles[goal.status as GoalStatus]}`}>
                      <span className="mr-1">{goal.status === "completed" ? "✓" : goal.status === "failed" ? "×" : "•"}</span>{goal.title}
                    </button>
                  ))}
                  {dayGoals.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayGoals.length - 3} mais</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Concluída</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Pendente</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Não cumprida</span>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass rounded-2xl sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input autoFocus placeholder="Ex.: Ler 20 páginas, treinar, estudar…" value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl" />
            <Textarea placeholder="Detalhes (opcional)" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-xl" />
            <label className="block space-y-1 text-sm"><span className="text-muted-foreground">Data</span><Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-xl" /></label>
            <div className="space-y-2"><p className="text-sm text-muted-foreground">Como ficou essa meta?</p><div className="grid grid-cols-3 gap-2">
              {(["pending", "completed", "failed"] as GoalStatus[]).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-xl border px-2 py-2 text-xs font-medium transition sm:text-sm ${status === value ? statusStyles[value] + " ring-1 ring-current" : "border-border text-muted-foreground hover:bg-accent"}`}>{statusLabels[value]}</button>)}
            </div></div>
            <div className="flex gap-2 pt-2">
              {editing && <Button type="button" variant="ghost" onClick={() => void deleteGoal()} className="rounded-xl text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>}
              <Button type="button" disabled={saving} onClick={() => void saveGoal()} className="glow ml-auto rounded-xl">{saving ? "Salvando…" : "Salvar meta"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
