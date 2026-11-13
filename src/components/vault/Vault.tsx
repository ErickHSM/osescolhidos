import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { FileText, Mic, Upload, Search, LogOut, Pin, Trash2, Download, Square, StickyNote, AudioLines, Paperclip, LayoutGrid, GripVertical, ChevronUp, ChevronDown, ChevronsUp, CalendarDays, FolderPlus, Pencil, Tags, Menu, Camera, UserCircle2, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "./Logo";
import { GoalCalendar } from "./GoalCalendar";

type Item = Tables<"items">;
type Filter = "all" | "note" | "audio" | "file";
type AudioCategory = { id: string; name: string };
const defaultCategories = ["Orações", "Recaídas", "Testemunhos", "Estudos bíblicos", "Louvores", "Outros"];
const categoryLabel = (value: string | null) => value || "Sem categoria";

const fmtSize = (b?: number | null) =>
  !b ? "" : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Vault({ session }: { session: Session }) {
  const uid = session.user.id;
  const [items, setItems] = useState<Item[]>([]);
  const [audioOrderIds, setAudioOrderIds] = useState<string[]>([]);
  const [listenedAudioIds, setListenedAudioIds] = useState<string[]>([]);
  const [currentAudio, setCurrentAudio] = useState<Item | null>(null);
  const persistentAudioUrl = useSignedUrl(currentAudio?.file_path ?? null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [recOpen, setRecOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<AudioCategory[]>([]);
  const [selectedAudioCategory, setSelectedAudioCategory] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<AudioCategory | null>(null);
  const [editingAudio, setEditingAudio] = useState<Item | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioCategory, setAudioCategory] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(String(session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Escolhido"));
  const [profileAvatarPath, setProfileAvatarPath] = useState<string | null>(session.user.user_metadata?.avatar_path || null);
  const [journeyStart, setJourneyStart] = useState(String(session.user.user_metadata?.journey_start || new Date().toISOString().slice(0,10)));
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarUrl = useSignedUrl(profileAvatarPath);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const journeyDays = Math.max(0, Math.floor((new Date(new Date().toDateString()).getTime() - new Date(journeyStart + "T00:00:00").getTime()) / 86400000) + 1);
  const rankTiers = [{days:1,name:"Iniciante"},{days:5,name:"Determinado"},{days:15,name:"Disciplinado"},{days:30,name:"Guerreiro"},{days:60,name:"Vencedor"},{days:90,name:"Campeão"},{days:180,name:"Lendário"},{days:365,name:"Imparável"}];
  const currentRank = [...rankTiers].reverse().find((tier) => journeyDays >= tier.days) || rankTiers[0];
  const nextRank = rankTiers.find((tier) => tier.days > journeyDays);
  const rankProgress = nextRank ? Math.min(100, Math.round(((journeyDays - currentRank.days) / (nextRank.days - currentRank.days)) * 100)) : 100;
  const [activeView, setActiveView] = useState<"vault" | "goals" | "pdfs">("vault");
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) { toast.error("Não foi possível carregar categorias: " + error.message); return; }
    const saved = data.user.user_metadata?.audio_categories;
    let list: AudioCategory[] = Array.isArray(saved)
      ? saved.map((entry: unknown, index: number) => typeof entry === "string"
          ? { id: `legacy-${index}-${entry}`, name: entry }
          : entry && typeof entry === "object" && "name" in entry
            ? { id: String((entry as { id?: string }).id || crypto.randomUUID()), name: String((entry as { name: string }).name) }
            : null).filter((entry): entry is AudioCategory => !!entry && !!entry.name.trim())
      : [];
    if (!list.length) {
      list = defaultCategories.map((name) => ({ id: crypto.randomUUID(), name }));
      const savedDefaults = await supabase.auth.updateUser({ data: { audio_categories: list } });
      if (savedDefaults.error) { toast.error("Não foi possível preparar categorias: " + savedDefaults.error.message); return; }
    }
    setCategories(list);
    setSelectedAudioCategory((current) => current || list[0]?.name || "");
  }, []);

  const load = useCallback(async () => {
    const [{ data, error }, { data: authData }] = await Promise.all([
      supabase.from("items").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }),
      supabase.auth.getUser(),
    ]);
    if (error) toast.error(error.message);
    const loadedItems = data ?? [];
    setItems(loadedItems);
    const savedListened = authData.user?.user_metadata?.listened_audio_ids;
    setListenedAudioIds(Array.isArray(savedListened) ? savedListened.filter((id: unknown): id is string => typeof id === "string") : []);
    const savedOrder = authData.user?.user_metadata?.audio_order;
    if (Array.isArray(savedOrder)) {
      const validIds = savedOrder.filter((id: unknown): id is string => typeof id === "string" && loadedItems.some((item) => item.id === id));
      const missingIds = loadedItems.filter((item) => item.kind === "audio" && !validIds.includes(item.id)).map((item) => item.id);
      setAudioOrderIds([...validIds, ...missingIds]);
    } else {
      setAudioOrderIds(loadedItems.filter((item) => item.kind === "audio").sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)).map((item) => item.id));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); void loadCategories(); }, [load, loadCategories]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = items.filter((i) => (filter === "all" || i.kind === filter) && (filter !== "audio" || categoryFilter === "all" || i.category === categoryFilter) && (!s || i.title.toLowerCase().includes(s) || (i.content ?? "").toLowerCase().includes(s)));
    // Reordena os áudios em qualquer visualização (inclusive "Tudo"),
    // mantendo anotações e arquivos nas mesmas posições relativas.
    const positions = new Map(audioOrderIds.map((id, index) => [id, index]));
    const orderedAudio = filtered.filter((item) => item.kind === "audio").sort((a, b) =>
      (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
      a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)
    );
    let audioIndex = 0;
    return filtered.map((item) => item.kind === "audio" ? orderedAudio[audioIndex++] : item);
  }, [items, filter, q, categoryFilter, audioOrderIds]);

  const counts = useMemo(() => ({
    all: items.length,
    note: items.filter((i) => i.kind === "note").length,
    audio: items.filter((i) => i.kind === "audio").length,
    file: items.filter((i) => i.kind === "file").length,
  }), [items]);

  const pdfItems = useMemo(() => items.filter((item) =>
    item.kind === "file" && (item.mime_type === "application/pdf" || item.title.toLowerCase().endsWith(".pdf")) &&
    (!q.trim() || item.title.toLowerCase().includes(q.trim().toLowerCase()))
  ), [items, q]);

  const audioGroups = useMemo(() => {
    const audio = visible.filter((item) => item.kind === "audio");
    const groups = categories.map((category) => ({
      id: category.id, name: category.name,
      items: audio.filter((item) => item.category === category.name),
    })).filter((group) => group.items.length > 0);
    const uncategorized = audio.filter((item) => !categories.some((category) => category.name === item.category));
    if (uncategorized.length) groups.push({ id: "uncategorized", name: "Sem categoria", items: uncategorized });
    return groups;
  }, [visible, categories]);

  async function uploadBlob(blob: Blob, name: string, kind: "audio" | "file") {
    const path = `${uid}/${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("vault").upload(path, blob, { contentType: blob.type || undefined });
    if (upErr) { toast.error(upErr.message); return; }
    let sortOrder = 0;
    if (kind === "audio") {
      const { data: lastAudio } = await supabase.from("items").select("sort_order").eq("user_id", uid).eq("kind", "audio").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      sortOrder = (lastAudio?.sort_order ?? -1) + 1;
    }
    const { error } = await supabase.from("items").insert({ user_id: uid, kind, title: name, file_path: path, mime_type: blob.type, size_bytes: blob.size, sort_order: sortOrder, category: kind === "audio" ? (selectedAudioCategory || categories[0]?.name || "Outros") : "outros" });
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

  async function onPdfFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${file.name} não é um PDF`);
        continue;
      }
      await uploadBlob(file, file.name, "file");
    }
    if (pdfRef.current) pdfRef.current.value = "";
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
    const audio = items.filter((item) => item.kind === "audio");
    const ordered = [...audio].sort((a, b) => {
      const ai = audioOrderIds.indexOf(a.id);
      const bi = audioOrderIds.indexOf(b.id);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
      return a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at);
    });
    const from = ordered.findIndex((item) => item.id === itemId);
    const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    const nextIds = ordered.map((item) => item.id);
    const previousIds = audioOrderIds;
    setAudioOrderIds(nextIds);
    setItems((current) => current.map((item) => {
      const position = nextIds.indexOf(item.id);
      return position >= 0 ? { ...item, sort_order: position } : item;
    }));

    // Persist the manual order in the signed-in user's metadata so it also works
    // when the database's optional sort_order column/policies are not configured.
    const { error: metadataError } = await supabase.auth.updateUser({ data: { audio_order: nextIds } });
    if (metadataError) {
      setAudioOrderIds(previousIds);
      toast.error("Não foi possível salvar a ordem: " + metadataError.message);
      await load();
      return;
    }

    const results = await Promise.all(ordered.map((item, index) =>
      supabase.from("items").update({ sort_order: index }).eq("id", item.id).eq("user_id", uid)
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      // Metadata remains the source of truth for display order; report the
      // database issue without undoing the successfully saved order.
      toast.warning("A ordem foi salva na sua conta, mas o banco não atualizou a coluna auxiliar: " + failed.error.message);
    } else {
      toast.success("Áudio movido e ordem salva");
    }
  }

  async function toggleAudioListened(itemId: string, nextValue?: boolean) {
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) { toast.error("Não foi possível atualizar o progresso do áudio"); return; }
    const current = data.user.user_metadata?.listened_audio_ids;
    const currentIds: string[] = Array.isArray(current) ? current.filter((id: unknown): id is string => typeof id === "string") : [];
    const shouldListen = nextValue ?? !currentIds.includes(itemId);
    const nextIds = shouldListen ? [...new Set([...currentIds, itemId])] : currentIds.filter((id) => id !== itemId);
    const { error } = await supabase.auth.updateUser({ data: { listened_audio_ids: nextIds } });
    if (error) { toast.error("Não foi possível salvar: " + error.message); return; }
    setListenedAudioIds(nextIds);
    toast.success(shouldListen ? "Áudio marcado como escutado" : "Áudio marcado como não escutado");
  }

  async function updateAudio() {
    if (!editingAudio || !audioTitle.trim() || !audioCategory) return;
    const { error } = await supabase.from("items").update({ title: audioTitle.trim(), category: audioCategory, updated_at: new Date().toISOString() }).eq("id", editingAudio.id).eq("user_id", uid);
    if (error) { toast.error("Não foi possível atualizar o áudio: " + error.message); return; }
    toast.success("Áudio atualizado"); setEditingAudio(null); await load();
  }

  async function persistCategories(next: AudioCategory[]) {
    const { error } = await supabase.auth.updateUser({ data: { audio_categories: next } });
    if (error) { toast.error("Não foi possível salvar categorias: " + error.message); return false; }
    setCategories(next);
    return true;
  }

  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) { toast.error("Digite um nome para a categoria"); return; }
    if (categories.some((c) => c.name.toLocaleLowerCase() === name.toLocaleLowerCase() && c.id !== editingCategory?.id)) {
      toast.error("Essa categoria já existe"); return;
    }
    const next = editingCategory
      ? categories.map((c) => c.id === editingCategory.id ? { ...c, name } : c)
      : [...categories, { id: crypto.randomUUID(), name }];
    if (editingCategory) {
      const { error } = await supabase.from("items").update({ category: name }).eq("user_id", uid).eq("category", editingCategory.name);
      if (error) { toast.error("Não foi possível atualizar os áudios: " + error.message); return; }
      if (selectedAudioCategory === editingCategory.name) setSelectedAudioCategory(name);
      if (categoryFilter === editingCategory.name) setCategoryFilter(name);
    }
    if (!await persistCategories(next)) return;
    setCategoryName(""); setEditingCategory(null); await load(); toast.success("Categoria salva");
  }

  async function deleteCategory(category: AudioCategory) {
    if (categories.length <= 1) { toast.error("Mantenha pelo menos uma categoria"); return; }
    const fallback = categories.find((c) => c.id !== category.id);
    if (!fallback) return;
    if (!confirm(`Excluir a categoria "${category.name}"? Os áudios serão movidos para "${fallback.name}".`)) return;
    const moved = await supabase.from("items").update({ category: fallback.name }).eq("user_id", uid).eq("category", category.name);
    if (moved.error) { toast.error("Não foi possível mover os áudios: " + moved.error.message); return; }
    if (!await persistCategories(categories.filter((c) => c.id !== category.id))) return;
    if (selectedAudioCategory === category.name) setSelectedAudioCategory(fallback.name);
    if (categoryFilter === category.name) setCategoryFilter("all");
    await load(); toast.success("Categoria excluída");
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

  function renderItemCard(i: Item) {
    const audio = items.filter((x) => x.kind === "audio").sort((a, b) => {
      const ai = audioOrderIds.indexOf(a.id), bi = audioOrderIds.indexOf(b.id);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
      return a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at);
    });
    const index = audio.findIndex((x) => x.id === i.id);
    return <ItemCard key={i.id} item={i} categoryLabel={categoryLabel(i.category)} listened={listenedAudioIds.includes(i.id)} onToggleListened={(value) => void toggleAudioListened(i.id, value)} onPlayAudio={() => setCurrentAudio(i)} isCurrentAudio={currentAudio?.id === i.id} onPin={() => togglePin(i)} onDelete={() => remove(i)} onEditAudio={() => {setEditingAudio(i);setAudioTitle(i.title);setAudioCategory(i.category || categories[0]?.name || "");}}
      onOpen={() => { if (i.kind === "note") { setEditing(i); setNoteOpen(true); } }}
      canReorder={filter === "audio" && categoryFilter === "all" && !q.trim() && i.kind === "audio"} showMoveControls={i.kind === "audio"} dragging={draggingId === i.id}
      onDragStart={() => setDraggingId(i.id)} onDragEnd={() => setDraggingId(null)}
      onDrop={() => { if (draggingId) void moveAudio(draggingId, i.id); setDraggingId(null); }}
      onMoveUp={() => { if (index > 0) void moveAudio(i.id, audio[index - 1].id); }}
      onMoveDown={() => { if (index >= 0 && index < audio.length - 1) void moveAudio(i.id, audio[index + 1].id); }}
      onMoveFirst={() => { const first = audio[0]; if (first && first.id !== i.id) void moveAudio(i.id, first.id); }} />;
  }

  return (
    <div className="min-h-screen w-full md:pl-64"><aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[rgba(34,36,40,0.68)] p-5 shadow-[12px_0_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl backdrop-saturate-150 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="flex justify-center"><Logo /></div><p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">Workspace</p><button onClick={() => {setActiveView("vault");setSidebarOpen(false);}} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${activeView === "vault" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"}`}><LayoutGrid className="h-4 w-4"/> Meu cofre</button><button onClick={() => {setActiveView("goals");setSidebarOpen(false);}} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${activeView === "goals" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"}`}><CalendarDays className="h-4 w-4"/> Metas</button><button onClick={() => {setActiveView("pdfs");setSidebarOpen(false);setQ("");}} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${activeView === "pdfs" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/5"}`}><FileText className="h-4 w-4"/> PDFs <span className="ml-auto text-xs opacity-60">{items.filter((item)=>item.kind==="file"&&(item.mime_type==="application/pdf"||item.title.toLowerCase().endsWith(".pdf"))).length}</span></button><div className="mt-8 flex items-center justify-between px-3"><span className="text-[10px] font-bold uppercase tracking-[.22em] text-muted-foreground">Categorias</span><button onClick={() => {setActiveView("vault");setEditingCategory(null);setCategoryName("");setCategoryManagerOpen(true);}} aria-label="Criar categoria" className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-primary"><FolderPlus className="h-4 w-4"/></button></div><div className="mt-2 space-y-1">{categories.map((category) => <button key={category.id} onClick={() => {setActiveView("vault");setFilter("audio");setCategoryFilter(category.name);setSidebarOpen(false);}} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${categoryFilter === category.name && filter === "audio" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5"}`}><span className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full bg-primary/70"/><span className="truncate">{category.name}</span></span><span className="text-xs opacity-60">{items.filter((i)=>i.kind==="audio"&&i.category===category.name).length}</span></button>)}</div><div className="mt-auto border-t border-border/70 pt-4"><p className="truncate px-3 text-xs text-muted-foreground">{session.user.email}</p><button onClick={() => supabase.auth.signOut()} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-white/5"><LogOut className="h-4 w-4"/> Sair</button></div></aside>{sidebarOpen && <button onClick={()=>setSidebarOpen(false)} aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/60 md:hidden"/>}<main className="mx-auto w-full max-w-6xl px-3 pb-20 pt-3 sm:px-6 sm:pt-6 md:px-8">
      <header className="glass sticky top-2 z-20 flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:top-4 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2"><button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu" className="rounded-xl p-2 text-muted-foreground hover:bg-white/5 md:hidden"><Menu className="h-5 w-5"/></button><div className="md:hidden"><Logo size="sm" /></div></div>
        {activeView !== "goals" && <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cofre…" className="h-10 rounded-xl pl-9" />
        </div>}
        <div className="ml-auto flex shrink-0 items-center justify-center gap-1 sm:gap-2">{activeView === "vault" && <Button variant="ghost" size="sm" onClick={() => {setEditingCategory(null);setCategoryName("");setCategoryManagerOpen(true);}} className="hidden h-9 shrink-0 rounded-xl px-2 text-xs text-muted-foreground sm:inline-flex sm:px-3 sm:text-sm"><Tags className="mr-1 h-4 w-4 shrink-0"/> Categorias</Button>}<button type="button" onClick={() => setProfileOpen(true)} title="Meu perfil" aria-label="Abrir meu perfil" className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5 ring-1 ring-white/10 hover:ring-primary/60">{avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover"/> : <UserCircle2 className="h-6 w-6 text-muted-foreground"/>}</button><Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="h-9 shrink-0 rounded-xl px-2 text-muted-foreground sm:px-3"><LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sair</span></Button></div>
      </header>



<Dialog open={profileOpen} onOpenChange={setProfileOpen}><DialogContent className="glass max-h-[88dvh] overflow-y-auto rounded-3xl sm:max-w-lg"><DialogHeader><DialogTitle>Meu perfil e minha jornada</DialogTitle></DialogHeader><div className="flex flex-col items-center gap-3"><button type="button" onClick={() => avatarInputRef.current?.click()} className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-background">{avatarUrl ? <img src={avatarUrl} alt="Foto do perfil" className="h-full w-full object-cover"/> : <UserCircle2 className="h-12 w-12 text-muted-foreground"/>}<span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition group-hover:opacity-100"><Camera className="h-6 w-6"/></span></button><input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error("Escolha uma imagem de até 5 MB."); return; } const path = uid + "/profile-" + crypto.randomUUID() + "-" + file.name.replace(/[^\\w.-]/g, "_"); const { error } = await supabase.storage.from("vault").upload(path, file, { contentType: file.type }); if (error) { toast.error("Falha ao enviar foto: " + error.message); return; } setProfileAvatarPath(path); event.target.value = ""; }}/><p className="text-xs text-muted-foreground">Toque na foto para alterar · até 5 MB</p></div><label className="block space-y-1 text-sm"><span className="text-muted-foreground">Nome de exibição</span><Input value={profileName} onChange={(e)=>setProfileName(e.target.value)} maxLength={40} className="rounded-xl"/></label><label className="block space-y-1 text-sm"><span className="text-muted-foreground">Início da jornada</span><Input type="date" value={journeyStart} max={new Date().toISOString().slice(0,10)} onChange={(e)=>setJourneyStart(e.target.value)} className="rounded-xl"/></label><div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/15 p-3 text-primary"><Award className="h-6 w-6"/></div><div><p className="text-xs text-muted-foreground">Patente atual</p><p className="text-xl font-bold">{currentRank.name}</p><p className="text-sm text-muted-foreground">{journeyDays} dias de jornada</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-all" style={{width:rankProgress + "%"}}/></div><p className="mt-2 text-xs text-muted-foreground">{nextRank ? (nextRank.days - journeyDays) + " dias para alcançar " + nextRank.name : "Você alcançou a patente máxima!"}</p></div><div className="flex flex-wrap gap-2">{rankTiers.map((tier)=><span key={tier.days} className={"rounded-full border px-2.5 py-1 text-xs " + (journeyDays >= tier.days ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{tier.days}d · {tier.name}</span>)}</div><Button disabled={profileSaving || !profileName.trim() || !journeyStart} className="w-full rounded-xl" onClick={async()=>{setProfileSaving(true);const {error}=await supabase.auth.updateUser({data:{display_name:profileName.trim(),avatar_path:profileAvatarPath,journey_start:journeyStart}});setProfileSaving(false);if(error){toast.error("Não foi possível salvar: "+error.message);return;}toast.success("Perfil atualizado!");setProfileOpen(false);}}>{profileSaving ? "Salvando…" : "Salvar perfil"}</Button></DialogContent></Dialog>

      {activeView === "vault" ? <>
      <div className="relative mt-4 sm:hidden">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no cofre…" className="h-10 rounded-xl pl-9" />
      </div>

      <section className="mx-auto mt-8 max-w-3xl text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Seu cofre</h1>
        <p className="mt-1 text-muted-foreground">Seu espaço para guardar o que importa</p>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard icon={FileText} title="Nova anotação" desc="Escreva e guarde ideias" onClick={() => { setEditing(null); setNoteOpen(true); }} />
        <ActionCard icon={Mic} title="Gravar áudio" desc="Grave direto do microfone" onClick={() => setRecOpen(true)} />
        <ActionCard icon={Upload} title="Enviar arquivo" desc="Áudios, imagens, PDFs… até 50 MB" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" multiple accept="audio/*,image/*,.pdf,.doc,.docx,.txt" hidden onChange={(e) => onFiles(e.target.files)} />
      </section>

      <div className="glass mt-4 flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold">Categoria dos próximos áudios</p><p className="text-xs text-muted-foreground">Escolha antes de gravar ou enviar um áudio</p></div>
        <select aria-label="Categoria dos próximos áudios" value={selectedAudioCategory} onChange={(e) => setSelectedAudioCategory(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm sm:max-w-xs">{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2 pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${filter === t.key ? "glow bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
            <span className="opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </nav>

      {filter === "audio" && <><div className="mt-4 flex flex-wrap gap-2 pb-1">{[{name:"Todas",id:"all"}, ...categories].map((category) => <button key={category.id} onClick={() => setCategoryFilter(category.id === "all" ? "all" : category.name)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${categoryFilter === (category.id === "all" ? "all" : category.name) ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>{category.name}</button>)}</div><p className="mt-2 text-xs text-muted-foreground">Arraste para reorganizar ou use as setas. A ordem fica salva na sua conta. Para reorganizar a lista completa, selecione “Todas” e limpe a busca.</p></>}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-muted-foreground">Carregando…</p>
        ) : visible.length === 0 ? (
          <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">
            Nada aqui ainda. Crie uma anotação, grave um áudio ou envie um arquivo.
          </div>
        ) : (
          filter === "audio" && categoryFilter === "all" ? (
            <div className="col-span-full space-y-8">
              {audioGroups.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Nenhum áudio encontrado.</div> : audioGroups.map((group) => (
                <section key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-border/70 pb-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-primary/70"/>{group.name}</h2>
                    <span className="text-xs text-muted-foreground">{group.items.length} {group.items.length === 1 ? "áudio" : "áudios"}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(renderItemCard)}</div>
                </section>
              ))}
            </div>
          ) : visible.map(renderItemCard)
        )}
      </section>

      <Dialog open={categoryManagerOpen} onOpenChange={(open) => { setCategoryManagerOpen(open); if (!open) { setEditingCategory(null); setCategoryName(""); } }}><DialogContent className="glass max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg gap-5 overflow-y-auto rounded-3xl border border-white/10 p-5 sm:p-7"><DialogHeader className="text-center"><DialogTitle className="text-xl">Gerenciar categorias</DialogTitle></DialogHeader><div className="flex flex-col gap-2 sm:flex-row"><Input value={categoryName} onChange={(e)=>setCategoryName(e.target.value)} placeholder={editingCategory ? "Editar nome da categoria" : "Nome da nova categoria"} className="h-11 rounded-xl"/><Button onClick={()=>void saveCategory()} className="h-11 shrink-0 rounded-xl px-4"><FolderPlus className="mr-2 h-4 w-4"/>{editingCategory ? "Salvar" : "Criar"}</Button></div><div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">{categories.map((category)=><div key={category.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/30 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span><div className="flex gap-1"><button onClick={()=>{setEditingCategory(category);setCategoryName(category.name);}} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10" aria-label="Editar categoria"><Pencil className="h-4 w-4"/></button><button onClick={()=>void deleteCategory(category)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400" aria-label="Excluir categoria"><Trash2 className="h-4 w-4"/></button></div></div>)}</div><p className="text-center text-xs text-muted-foreground">Ao renomear, os áudios acompanham o novo nome. Ao excluir, eles são movidos para outra categoria existente.</p></DialogContent></Dialog>
      <Dialog open={!!editingAudio} onOpenChange={(open)=>{if(!open)setEditingAudio(null);}}><DialogContent className="glass rounded-3xl sm:max-w-md"><DialogHeader><DialogTitle>Editar áudio</DialogTitle></DialogHeader><div className="space-y-3"><label className="block space-y-1 text-sm"><span className="text-muted-foreground">Nome do áudio</span><Input value={audioTitle} onChange={(e)=>setAudioTitle(e.target.value)} className="h-11 rounded-xl"/></label><label className="block space-y-1 text-sm"><span className="text-muted-foreground">Categoria</span><select value={audioCategory} onChange={(e)=>setAudioCategory(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3">{categories.map((category)=><option key={category.id} value={category.name}>{category.name}</option>)}</select></label><Button onClick={()=>void updateAudio()} className="w-full rounded-xl">Salvar alterações</Button></div></DialogContent></Dialog>
      <NoteDialog open={noteOpen} onOpenChange={(o) => { setNoteOpen(o); if (!o) setEditing(null); }} item={editing} onSave={saveNote} />
      <RecorderDialog open={recOpen} onOpenChange={setRecOpen} onSave={async (b, n) => { await uploadBlob(b, n, "audio"); setRecOpen(false); }} />
      </> : activeView === "pdfs" ? <>
        <section className="mx-auto mt-8 max-w-3xl text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">Biblioteca de PDFs</h1>
          <p className="mt-2 text-muted-foreground">Envie documentos e leia o conteúdo diretamente aqui, sem precisar sair do OsEscolhidos.</p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => pdfRef.current?.click()} className="glow rounded-xl"><Upload className="mr-2 h-4 w-4"/> Enviar PDF</Button>
            <input ref={pdfRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => void onPdfFiles(e.target.files)} />
          </div>
        </section>
        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {loading ? <p className="text-muted-foreground">Carregando PDFs…</p> : pdfItems.length === 0 ? (
            <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground"><FileText className="mx-auto mb-3 h-9 w-9 opacity-60"/><p className="font-medium text-foreground">Sua biblioteca está vazia</p><p className="mt-1 text-sm">Envie um PDF para começar a ler por aqui.</p></div>
          ) : pdfItems.map((item) => <PdfCard key={item.id} item={item} onDelete={() => void remove(item)} />)}
        </section>
      </> : <GoalCalendar session={session} />}
    </main>{currentAudio && <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[rgba(30,32,36,0.94)] p-3 shadow-2xl backdrop-blur-2xl sm:inset-x-6 sm:bottom-5 sm:p-4"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{currentAudio.title}</p><p className="text-xs text-muted-foreground">{categoryLabel(currentAudio.category)} · Reprodução contínua</p></div>{persistentAudioUrl ? <audio key={currentAudio.id} controls autoPlay src={persistentAudioUrl} onEnded={() => void toggleAudioListened(currentAudio.id, true)} className="w-[min(58%,360px)]" /> : <span className="text-xs text-muted-foreground">Carregando áudio…</span>}<button type="button" aria-label="Fechar player" onClick={() => setCurrentAudio(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-white/10">×</button></div></div>}</div>
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

function PdfCard({ item, onDelete }: { item: Item; onDelete: () => void }) {
  const url = useSignedUrl(item.file_path);
  return (
    <article className="glass flex min-w-0 flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5"/></div>
          <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{item.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(item.created_at)} {fmtSize(item.size_bytes) && `· ${fmtSize(item.size_bytes)}`}</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {url && <a href={url} target="_blank" rel="noreferrer" download={item.title} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary" aria-label="Baixar PDF"><Download className="h-4 w-4"/></a>}
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400" aria-label="Excluir PDF"><Trash2 className="h-4 w-4"/></button>
        </div>
      </div>
      <div className="min-h-[420px] bg-white/5">
        {url ? <iframe src={`${url}#toolbar=1&navpanes=0&view=FitH`} title={`Leitor de ${item.title}`} className="h-[520px] w-full border-0 bg-white" /> : <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">Carregando documento…</div>}
      </div>
    </article>
  );
}

function ItemCard({ item, categoryLabel, listened, onToggleListened, onPlayAudio, isCurrentAudio, onPin, onDelete, onOpen, onEditAudio, canReorder, showMoveControls, dragging, onDragStart, onDragEnd, onDrop, onMoveUp, onMoveDown, onMoveFirst }: { item: Item; categoryLabel: string; listened: boolean; onToggleListened: (value: boolean) => void; onPlayAudio: () => void; isCurrentAudio: boolean; onPin: () => void; onDelete: () => void; onOpen: () => void; onEditAudio: () => void; canReorder: boolean; showMoveControls: boolean; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onDrop: () => void; onMoveUp: () => void; onMoveDown: () => void; onMoveFirst: () => void }) {
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
          {showMoveControls && <><button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} aria-label="Mover áudio para cima" title="Mover para cima" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} aria-label="Mover áudio para baixo" title="Mover para baixo" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={(e) => { e.stopPropagation(); onMoveFirst(); }} aria-label="Mover áudio para o primeiro lugar" title="Mover para o primeiro lugar" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><ChevronsUp className="h-4 w-4" /></button></>}
          {item.kind === "audio" && <button onClick={onEditAudio} aria-label="Editar áudio" title="Editar áudio" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-4 w-4"/></button>}
          <button onClick={onPin} aria-label="Fixar" className={`rounded-lg p-1.5 hover:bg-accent ${item.pinned ? "text-primary" : "text-muted-foreground"}`}>
            <Pin className="h-4 w-4" fill={item.pinned ? "currentColor" : "none"} />
          </button>
          <button onClick={onDelete} aria-label="Excluir" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {item.kind === "audio" && <div className="mt-3"><span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{categoryLabel}</span></div>}
      <div className="mt-3 flex-1">
        {item.kind === "note" && (
          <p onClick={onOpen} className="line-clamp-5 cursor-pointer whitespace-pre-wrap text-sm text-muted-foreground">{item.content || "—"}</p>
        )}
        {item.kind === "audio" && <div className="space-y-2"><button type="button" onClick={onPlayAudio} className="w-full rounded-xl border border-border bg-background/40 px-3 py-3 text-sm font-semibold text-foreground hover:bg-accent">{isCurrentAudio ? "Áudio selecionado no player fixo" : "▶ Tocar no player fixo"}</button><button type="button" onClick={() => onToggleListened(!listened)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${listened ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full border ${listened ? "border-emerald-400 bg-emerald-400 text-[#10151d]" : "border-current"}`}>{listened ? "✓" : ""}</span>{listened ? "Escutado" : "Marcar como escutado"}</button></div>}
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
