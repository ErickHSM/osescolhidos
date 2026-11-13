import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { FileText, Mic, Upload, Search, LogOut, Pin, Trash2, Download, Square, StickyNote, AudioLines, Paperclip, LayoutGrid, GripVertical, ChevronUp, ChevronsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "./Logo";

type Item = Tables<"items">;
type Filter = "all" | "note" | "audio" | "file";

const fmtSize = (b?: number | null) =>
  !b ? "" : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Vault({ session }: { session: Session }) {
  const uid = session.user.id;
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("items").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = items.filter((i) => (filter === "all" || i.kind === filter) && (!s || i.title.toLowerCase().includes(s) || (i.content ?? "").toLowerCase().includes(s)));
    if (filter === "audio") return filtered.sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
    return filtered;
  }, [items, filter, q]);

  const counts = useMemo(() => ({
    all: items.length,
    note: items.filter((i) => i.kind === "note").length,
    audio: items.filter((i) => i.kind === "audio").length,
    file: items.filter((i) => i.kind === "file").length,
  }), [items]);

  async function uploadBlob(blob: Blob, name: string, kind: "audio" | "file") {
    const path = `${uid}/${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("vault").upload(path, blob, { contentType: blob.type || undefined });
    if (upErr) { toast.error(upErr.message); return; }
    let sortOrder = 0;
    if (kind === "audio") {
      const { data: lastAudio } = await supabase.from("items").select("sort_order").eq("user_id", uid).eq("kind", "audio").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      sortOrder = (lastAudio?.sort_order ?? -1) + 1;
    }
    const { error } = await supabase.from("items").insert({ user_id: uid, kind, title: name, file_path: path, mime_type: blob.type, size_bytes: blob.size, sort_order: sortOrder });
    if (error) { toast.error(error.message); return; }
    toast.success(kind === "audio" ? "Áudio salvo" : "Arquivo salvo");
    load();
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      await uploadBlob(f, f.name, f.type.startsWith("audio/") ? "audio" : "file");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveNote(title: string, content: string) {
    if (editing) {
      const { error } = await supabase.from("items").update({ title, content, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("items").insert({ user_id: uid, kind: "note", title: title || "Sem título", content });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Anotação salva");
    setNoteOpen(false);
    setEditing(null);
    load();
  }

  async function togglePin(i: Item) {
    await supabase.from("items").update({ pinned: !i.pinned }).eq("id", i.id);
    load();
  }

  async function moveAudio(itemId: string, targetId: string) {
    if (itemId === targetId) return;
    const ordered = items.filter((item) => item.kind === "audio").sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
    const from = ordered.findIndex((item) => item.id === itemId);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const updated = ordered.map((item, index) => ({ ...item, sort_order: index }));
    setItems((current) => current.map((item) => updated.find((next) => next.id === item.id) ?? item));
    for (const item of updated) {
      const { error } = await supabase.from("items").update({ sort_order: item.sort_order }).eq("id", item.id).eq("user_id", uid);
      if (error) { toast.error("Não foi possível salvar a ordem dos áudios"); await load(); return; }
    }
  }

  async function remove(i: Item) {
    if (!confirm(`Excluir "${i.title}"?`)) return;
    if (i.file_path) await supabase.storage.from("vault").remove([i.file_path]);
    await supabase.from("items").delete().eq("id", i.id);
    toast.success("Excluído");
    load();
  }

  const tabs: { key: Filter; label: string; icon: typeof LayoutGrid }[] = [
    { key: "all", label: "Tudo", icon: LayoutGrid },
    { key: "note", label: "Anotações", icon: StickyNote },
    { key: "audio", label: "Áudios", icon: AudioLines },
    { key: "file", label: "Arquivos", icon: Paperclip },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="glass sticky top-4 z-20 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <Logo />
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cofre…" className="h-10 rounded-xl pl-9" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="rounded-xl text-muted-foreground">
          <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      <div className="relative mt-4 sm:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cofre…" className="h-10 rounded-xl pl-9" />
      </div>

      <section className="mt-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">Seu cofre</h1>
        <p className="mt-1 text-muted-foreground">{session.user.email}</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard icon={FileText} title="Nova anotação" desc="Escreva e guarde ideias" onClick={() => { setEditing(null); setNoteOpen(true); }} />
        <ActionCard icon={Mic} title="Gravar áudio" desc="Grave direto do microfone" onClick={() => setRecOpen(true)} />
        <ActionCard icon={Upload} title="Enviar arquivo" desc="Áudios, imagens, PDFs… até 50 MB" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </section>

      <nav className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${filter === t.key ? "glow bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
            <span className="opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </nav>

      {filter === "audio" && <p className="mt-4 text-sm text-muted-foreground">Arraste os áudios para mudar a ordem ou use as setas. A ordem fica salva na sua conta. Para reorganizar, limpe a busca.</p>}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : visible.length === 0 ? (
          <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">
            Nada aqui ainda. Crie uma anotação, grave um áudio ou envie um arquivo.
          </div>
        ) : (
          visible.map((i) => (
            <ItemCard key={i.id} item={i} onPin={() => togglePin(i)} onDelete={() => remove(i)}
              onOpen={() => { if (i.kind === "note") { setEditing(i); setNoteOpen(true); } }}
              canReorder={filter === "audio" && !q.trim() && i.kind === "audio"} dragging={draggingId === i.id}
              onDragStart={() => setDraggingId(i.id)} onDragEnd={() => setDraggingId(null)}
              onDrop={() => { if (draggingId) void moveAudio(draggingId, i.id); setDraggingId(null); }}
              onMoveUp={() => { const audio = visible.filter((x) => x.kind === "audio"); const index = audio.findIndex((x) => x.id === i.id); if (index > 0) void moveAudio(i.id, audio[index - 1].id); }}
              onMoveFirst={() => { const first = visible.find((x) => x.kind === "audio"); if (first && first.id !== i.id) void moveAudio(i.id, first.id); }} />
          ))
        )}
      </section>

      <NoteDialog open={noteOpen} onOpenChange={(o) => { setNoteOpen(o); if (!o) setEditing(null); }} item={editing} onSave={saveNote} />
      <RecorderDialog open={recOpen} onOpenChange={setRecOpen} onSave={async (b, n) => { await uploadBlob(b, n, "audio"); setRecOpen(false); }} />
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, onClick }: { icon: typeof Mic; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="glass group flex items-center gap-4 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:glow">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage.from("vault").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return url;
}

function ItemCard({ item, onPin, onDelete, onOpen, canReorder, dragging, onDragStart, onDragEnd, onDrop, onMoveUp, onMoveFirst }: { item: Item; onPin: () => void; onDelete: () => void; onOpen: () => void; canReorder: boolean; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onDrop: () => void; onMoveUp: () => void; onMoveFirst: () => void }) {
  const url = useSignedUrl(item.kind === "note" ? null : item.file_path);
  const Icon = item.kind === "note" ? StickyNote : item.kind === "audio" ? AudioLines : Paperclip;
  const isImage = item.mime_type?.startsWith("image/");
  return (
    <article draggable={canReorder} onDragStart={(e) => { if (!canReorder) return; e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragOver={(e) => { if (canReorder) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={(e) => { if (canReorder) { e.preventDefault(); onDrop(); } }} onDragEnd={onDragEnd} className={`glass group flex flex-col rounded-2xl p-5 transition hover:glow ${dragging ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {canReorder && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-label="Arrastar para reorganizar" />}
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <h3 className={`truncate font-semibold ${item.kind === "note" ? "cursor-pointer" : ""}`} onClick={onOpen}>{item.title}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          {canReorder && <><button onClick={onMoveUp} aria-label="Mover para cima" title="Mover para cima" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ChevronUp className="h-4 w-4" /></button><button onClick={onMoveFirst} aria-label="Mover para o primeiro lugar" title="Mover para o primeiro lugar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ChevronsUp className="h-4 w-4" /></button></>}
          <button onClick={onPin} aria-label="Fixar" className={`rounded-lg p-1.5 hover:bg-accent ${item.pinned ? "text-primary" : "text-muted-foreground"}`}>
            <Pin className="h-4 w-4" fill={item.pinned ? "currentColor" : "none"} />
          </button>
          <button onClick={onDelete} aria-label="Excluir" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1">
        {item.kind === "note" && (
          <p onClick={onOpen} className="line-clamp-5 cursor-pointer whitespace-pre-wrap text-sm text-muted-foreground">{item.content || "—"}</p>
        )}
        {item.kind === "audio" && (url ? <audio controls src={url} className="w-full" /> : <div className="h-12 animate-pulse rounded-xl bg-muted" />)}
        {item.kind === "file" && isImage && url && <img src={url} alt={item.title} className="max-h-48 w-full rounded-xl object-cover" />}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{fmtDate(item.created_at)} {fmtSize(item.size_bytes) && `· ${fmtSize(item.size_bytes)}`}</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" download={item.title} className="flex items-center gap-1 hover:text-primary">
            <Download className="h-3.5 w-3.5" /> Baixar
          </a>
        )}
      </div>
    </article>
  );
}

function NoteDialog({ open, onOpenChange, item, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; item: Item | null; onSave: (t: string, c: string) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  useEffect(() => { if (open) { setTitle(item?.title ?? ""); setContent(item?.content ?? ""); } }, [open, item]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass rounded-2xl sm:max-w-lg">
        <DialogHeader><DialogTitle>{item ? "Editar anotação" : "Nova anotação"}</DialogTitle></DialogHeader>
        <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        <Textarea placeholder="Escreva aqui…" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-48 rounded-xl" />
        <Button onClick={() => onSave(title, content)} className="glow rounded-xl">Salvar</Button>
      </DialogContent>
    </Dialog>
  );
}

function RecorderDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (b: Blob, name: string) => Promise<void> }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [secs, setSecs] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preview = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    if (!open) { rec?.stream.getTracks().forEach((t) => t.stop()); setRec(null); setBlob(null); setSecs(0); if (timer.current) clearInterval(timer.current); }
    else setName(`Áudio ${new Date().toLocaleString("pt-BR")}`);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => { setBlob(new Blob(chunks, { type: mr.mimeType || "audio/webm" })); stream.getTracks().forEach((t) => t.stop()); };
      mr.start();
      setRec(mr); setBlob(null); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      toast.error("Permita o acesso ao microfone");
    }
  }
  function stop() { rec?.stop(); setRec(null); if (timer.current) clearInterval(timer.current); }

  const ext = blob?.type.includes("mp4") ? "m4a" : blob?.type.includes("ogg") ? "ogg" : "webm";
  const mm = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>Gravar áudio</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <button onClick={rec ? stop : start}
            className={`flex h-24 w-24 items-center justify-center rounded-full transition ${rec ? "animate-pulse bg-destructive text-destructive-foreground" : "glow bg-primary text-primary-foreground hover:scale-105"}`}>
            {rec ? <Square className="h-8 w-8" fill="currentColor" /> : <Mic className="h-9 w-9" />}
          </button>
          <div className="font-display text-2xl tabular-nums">{mm}</div>
          <p className="text-sm text-muted-foreground">{rec ? "Gravando… toque para parar" : blob ? "Ouça e salve" : "Toque para começar"}</p>
        </div>
        {blob && preview && (
          <div className="space-y-3">
            <audio controls src={preview} className="w-full" />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            <Button disabled={saving} className="glow w-full rounded-xl"
              onClick={async () => { setSaving(true); await onSave(blob, `${name || "Áudio"}.${ext}`); setSaving(false); }}>
              {saving ? "Salvando…" : "Salvar no cofre"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
