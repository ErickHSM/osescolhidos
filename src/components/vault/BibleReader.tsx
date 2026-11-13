import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LoaderCircle, Volume2, Pause, Play, Square, Search, Sparkles, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type BibleBook = { name: string; slug: string; chapters: number; testament: "Antigo Testamento" | "Novo Testamento" };
type BibleVerse = { v: number; t: string };
type BibleChapterResponse = { verses?: BibleVerse[]; translation?: string; book?: string; chapter?: number };

const books: BibleBook[] = [
  ["Gênesis","genesis",50],["Êxodo","exodus",40],["Levítico","leviticus",27],["Números","numbers",36],["Deuteronômio","deuteronomy",34],["Josué","joshua",24],["Juízes","judges",21],["Rute","ruth",4],["1 Samuel","1-samuel",31],["2 Samuel","2-samuel",24],["1 Reis","1-kings",22],["2 Reis","2-kings",25],["1 Crônicas","1-chronicles",29],["2 Crônicas","2-chronicles",36],["Esdras","ezra",10],["Neemias","nehemiah",13],["Ester","esther",10],["Jó","job",42],["Salmos","psalms",150],["Provérbios","proverbs",31],["Eclesiastes","ecclesiastes",12],["Cantares","song-of-solomon",8],["Isaías","isaiah",66],["Jeremias","jeremiah",52],["Lamentações","lamentations",5],["Ezequiel","ezekiel",48],["Daniel","daniel",12],["Oséias","hosea",14],["Joel","joel",3],["Amós","amos",9],["Obadias","obadiah",1],["Jonas","jonah",4],["Miquéias","micah",7],["Naum","nahum",3],["Habacuque","habakkuk",3],["Sofonias","zephaniah",3],["Ageu","haggai",2],["Zacarias","zechariah",14],["Malaquias","malachi",4],
  ["Mateus","matthew",28],["Marcos","mark",16],["Lucas","luke",24],["João","john",21],["Atos","acts",28],["Romanos","romans",16],["1 Coríntios","1-corinthians",16],["2 Coríntios","2-corinthians",13],["Gálatas","galatians",6],["Efésios","ephesians",6],["Filipenses","philippians",4],["Colossenses","colossians",4],["1 Tessalonicenses","1-thessalonians",5],["2 Tessalonicenses","2-thessalonians",3],["1 Timóteo","1-timothy",6],["2 Timóteo","2-timothy",4],["Tito","titus",3],["Filemom","philemon",1],["Hebreus","hebrews",13],["Tiago","james",5],["1 Pedro","1-peter",5],["2 Pedro","2-peter",3],["1 João","1-john",5],["2 João","2-john",1],["3 João","3-john",1],["Judas","jude",1],["Apocalipse","revelation",22],
].map(([name, slug, chapters], index) => ({ name: String(name), slug: String(slug), chapters: Number(chapters), testament: index < 39 ? "Antigo Testamento" : "Novo Testamento" }));


type BibleTopicResult = { title: string; reference: string; bookSlug: string; chapter: number; verse: number; terms: string[]; explanation: string };
const bibleTopicIndex: BibleTopicResult[] = [
  { title: "Fugir da imoralidade sexual", reference: "1 Coríntios 6:18", bookSlug: "1-corinthians", chapter: 6, verse: 18, terms: ["imoralidade","imoralidade sexual","pecado sexual","prostituição","fornicação","pornografia","pureza","sexualidade","tentação","corpo"], explanation: "Paulo orienta a fugir da imoralidade e a compreender a importância de honrar a Deus com o corpo." },
  { title: "Santidade e domínio do corpo", reference: "1 Tessalonicenses 4:3–5", bookSlug: "1-thessalonians", chapter: 4, verse: 3, terms: ["imoralidade","santidade","pureza","desejo","luxúria","paixão","sexual"], explanation: "Ensina sobre santificação e domínio dos desejos, em vez de viver dominado por paixões." },
  { title: "Pureza dos pensamentos e dos olhos", reference: "Mateus 5:27–30", bookSlug: "matthew", chapter: 5, verse: 27, terms: ["adultério","olhos","pensamentos","desejo","luxúria","pornografia","pureza","tentação","sexual"], explanation: "Jesus trata da intenção do coração e da responsabilidade com aquilo que alimentamos no olhar." },
  { title: "Viver em pureza", reference: "Efésios 5:3", bookSlug: "ephesians", chapter: 5, verse: 3, terms: ["imoralidade","impureza","pureza","santidade","pecado sexual"], explanation: "Apresenta um chamado para que a imoralidade e a impureza não façam parte da conduta cristã." },
  { title: "As obras da carne e o fruto do Espírito", reference: "Gálatas 5:19–23", bookSlug: "galatians", chapter: 5, verse: 19, terms: ["pecado","imoralidade","impureza","domínio próprio","autocontrole","carne","espírito","tentação"], explanation: "Contrasta comportamentos destrutivos com o fruto do Espírito, incluindo o domínio próprio." },
  { title: "Resistir à tentação", reference: "1 Coríntios 10:13", bookSlug: "1-corinthians", chapter: 10, verse: 13, terms: ["tentação","resistir","força","luta","pecado","autocontrole"], explanation: "Lembra que Deus é fiel e oferece escape para que a pessoa possa suportar a tentação." },
  { title: "Renovar a mente", reference: "Romanos 12:1–2", bookSlug: "romans", chapter: 12, verse: 1, terms: ["mente","pensamentos","mudança","transformação","hábitos","santidade","pureza"], explanation: "Convida a oferecer a vida a Deus e a experimentar transformação pela renovação da mente." },
  { title: "Deus perdoa quem confessa", reference: "1 João 1:9", bookSlug: "1-john", chapter: 1, verse: 9, terms: ["perdão","culpa","confessar","pecado","recomeço","arrependimento"], explanation: "Aponta para a fidelidade de Deus em perdoar e purificar quem confessa seus pecados." },
  { title: "Arrependimento e coração renovado", reference: "Salmos 51:10", bookSlug: "psalms", chapter: 51, verse: 10, terms: ["arrependimento","perdão","pureza","coração","recomeço","pecado"], explanation: "Uma oração pedindo um coração puro e um espírito firme diante de Deus." },
  { title: "Vencer o medo", reference: "Isaías 41:10", bookSlug: "isaiah", chapter: 41, verse: 10, terms: ["medo","ansiedade","coragem","preocupação","força"], explanation: "Uma promessa de presença, sustento e fortalecimento de Deus em momentos difíceis." },
  { title: "Entregar a ansiedade a Deus", reference: "Filipenses 4:6–7", bookSlug: "philippians", chapter: 4, verse: 6, terms: ["ansiedade","preocupação","paz","medo","oração"], explanation: "Ensina a apresentar as preocupações a Deus em oração e confiar em sua paz." },
  { title: "Força para continuar", reference: "Isaías 40:29–31", bookSlug: "isaiah", chapter: 40, verse: 29, terms: ["força","cansaço","desânimo","perseverança","esperança"], explanation: "Fala sobre Deus renovar as forças daqueles que esperam nele." },
  { title: "Amar a Deus e ao próximo", reference: "1 Coríntios 13:4–7", bookSlug: "1-corinthians", chapter: 13, verse: 4, terms: ["amor","relacionamento","paciência","perdão","casamento"], explanation: "Descreve o amor por meio de atitudes como paciência, bondade e perseverança." },
  { title: "Vencer o mal com o bem", reference: "Romanos 12:21", bookSlug: "romans", chapter: 12, verse: 21, terms: ["raiva","ódio","vingança","mal","perdão","domínio próprio"], explanation: "Orienta a não ser vencido pelo mal, mas a responder praticando o bem." },
  { title: "Buscar a Deus de todo o coração", reference: "Jeremias 29:13", bookSlug: "jeremiah", chapter: 29, verse: 13, terms: ["buscar deus","oração","fé","intimidade","propósito"], explanation: "Encoraja uma busca sincera por Deus, feita de todo o coração." },
  { title: "Fé em tempos difíceis", reference: "Hebreus 11:1", bookSlug: "hebrews", chapter: 11, verse: 1, terms: ["fé","confiança","dúvida","esperança"], explanation: "Apresenta a fé como confiança no que se espera e convicção sobre o que não se vê." },
  { title: "Deus está perto dos que sofrem", reference: "Salmos 34:18", bookSlug: "psalms", chapter: 34, verse: 18, terms: ["tristeza","sofrimento","depressão","dor","consolo","solidão"], explanation: "Lembra que Deus se aproxima de quem está com o coração quebrantado." },
  { title: "Disciplina e domínio próprio", reference: "2 Timóteo 1:7", bookSlug: "2-timothy", chapter: 1, verse: 7, terms: ["disciplina","autocontrole","domínio próprio","medo","coragem","força"], explanation: "Destaca que Deus nos chama a viver com poder, amor e equilíbrio." }
];
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();

export function BibleReader() {
  const [bookSlug, setBookSlug] = useState("genesis");
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState<BibleChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "previous">("next");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [coverOpening, setCoverOpening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [speechRate, setSpeechRate] = useState(0.95);
  const [speechPitch, setSpeechPitch] = useState(0.65);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BibleTopicResult[]>([]);
  const [lastProgress, setLastProgress] = useState<{ bookSlug: string; chapter: number; pageIndex: number; updatedAt?: string } | null>(null);
  const progressReady = useRef(false);
  const selectedBook = books.find((book) => book.slug === bookSlug) ?? books[0];
  const oldTestament = useMemo(() => books.filter((book) => book.testament === "Antigo Testamento"), []);
  const newTestament = useMemo(() => books.filter((book) => book.testament === "Novo Testamento"), []);
  const pages = useMemo(() => { const verses = data?.verses ?? []; const result: BibleVerse[][] = []; for (let i = 0; i < verses.length; i += 12) result.push(verses.slice(i, i + 12)); return result.length ? result : [[]]; }, [data]);
  const pageCount = pages.length;
  const isLastChapter = bookSlug === books[books.length - 1].slug && chapter === selectedBook.chapters;
  const savedBook = lastProgress ? books.find((book) => book.slug === lastProgress.bookSlug) : null;
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      const saved = user?.user_metadata?.bible_progress;
      if (saved && typeof saved.bookSlug === "string" && books.some((book) => book.slug === saved.bookSlug)) {
        const savedBookInfo = books.find((book) => book.slug === saved.bookSlug)!;
        const savedChapter = Math.min(Math.max(Number(saved.chapter) || 1, 1), savedBookInfo.chapters);
        const savedPage = Math.max(Number(saved.pageIndex) || 0, 0);
        setLastProgress({ bookSlug: saved.bookSlug, chapter: savedChapter, pageIndex: savedPage, updatedAt: saved.updatedAt });
        setBookSlug(saved.bookSlug);
        setChapter(savedChapter);
        setPageIndex(savedPage);
      }
      progressReady.current = true;
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!progressReady.current || loading || !data?.verses?.length) return;
    const progress = { bookSlug, chapter, pageIndex, updatedAt: new Date().toISOString() };
    setLastProgress(progress);
    supabase.auth.updateUser({ data: { bible_progress: progress } });
  }, [bookSlug, chapter, pageIndex, loading, data]);
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeechStatus("idle");
    }
  }, [bookSlug, chapter]);

  function stopReading() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeechStatus("idle");
  }

  function startReading() {
    if (!data?.verses?.length || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.verses.map((verse) => verse.t).join(" "));
    utterance.lang = "pt-BR";
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase() === "pt-br") || voices.find((item) => item.lang.toLowerCase().startsWith("pt"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeechStatus("idle");
    utterance.onerror = () => setSpeechStatus("idle");
    window.speechSynthesis.speak(utterance);
    setSpeechStatus("playing");
  }

  function toggleReading() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speechStatus === "playing") { window.speechSynthesis.pause(); setSpeechStatus("paused"); }
    else if (speechStatus === "paused") { window.speechSynthesis.resume(); setSpeechStatus("playing"); }
    else startReading();
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`https://free.bible/bible/pt/${bookSlug}/${chapter}.json`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar este capítulo.");
        return response.json() as Promise<BibleChapterResponse>;
      })
      .then((result) => {
        if (!Array.isArray(result.verses)) throw new Error("O capítulo não retornou versículos.");
        setData(result);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== "AbortError") setError(cause.message || "Falha ao carregar a Bíblia.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [bookSlug, chapter]);

  function searchTopics() {
    const query = normalizeSearch(searchQuery);
    if (!query) { setSearchResults([]); return; }
    const words = query.split(/\\s+/).filter((word) => word.length > 2);
    const ranked = bibleTopicIndex.map((item) => {
      const haystack = normalizeSearch([item.title, item.reference, ...item.terms, item.explanation].join(" "));
      const score = words.reduce((total, word) => total + (haystack.includes(word) ? (item.terms.some((term) => normalizeSearch(term).includes(word)) ? 3 : 1) : 0), 0);
      return { item, score };
    }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
    setSearchResults(ranked.map((entry) => entry.item));
  }
  async function openSearchResult(result: BibleTopicResult) {
    const response = await fetch(`https://free.bible/bible/pt/${result.bookSlug}/${result.chapter}.json`);
    if (!response.ok) return;
    const chapterData = await response.json() as BibleChapterResponse;
    const verseIndex = Math.max(0, (result.verse - 1) / 12);
    const desktop = typeof window !== "undefined" && window.innerWidth >= 640;
    setBookSlug(result.bookSlug);
    setChapter(result.chapter);
    setPageIndex(desktop ? Math.floor(verseIndex / 2) * 2 : Math.floor(verseIndex));
    setIsCoverOpen(true);
    setSearchResults([]);
  }
  function changeBook(value: string) { setBookSlug(value); setChapter(1); setPageIndex(0); }
  function openBibleCover() {
    if (coverOpening || isCoverOpen) return;
    setCoverOpening(true);
    window.setTimeout(() => { setIsCoverOpen(true); setCoverOpening(false); }, 720);
  }
  function next() {
    if (chapter < selectedBook.chapters) { setChapter((v) => v + 1); setPageIndex(0); return; }
    const index = books.findIndex((book) => book.slug === bookSlug);
    if (index < books.length - 1) { setBookSlug(books[index + 1].slug); setChapter(1); setPageIndex(0); }
  }
  function previous() {
    if (chapter > 1) { setChapter((v) => v - 1); setPageIndex(0); return; }
    const index = books.findIndex((book) => book.slug === bookSlug);
    if (index > 0) { setBookSlug(books[index - 1].slug); setChapter(books[index - 1].chapters); setPageIndex(0); }
  }
  function turnPage(direction: "next" | "previous") {
    setFlipDirection(direction);
    const step = typeof window !== "undefined" && window.innerWidth >= 640 ? 2 : 1;
    if (direction === "next") {
      if (pageIndex + step < pageCount) setPageIndex((v) => Math.min(v + step, pageCount - 1));
      else { setPageIndex(0); next(); }
    } else if (pageIndex > 0) setPageIndex((v) => Math.max(0, v - step));
    else previous();
  }
  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 55) turnPage(delta < 0 ? "next" : "previous");
    setTouchStartX(null);
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes bible-page-next { 0% { transform: perspective(1800px) rotateY(-82deg); opacity: .25; filter: brightness(.65); } 65% { transform: perspective(1800px) rotateY(8deg); opacity: 1; filter: brightness(1.08); } 100% { transform: perspective(1800px) rotateY(0); opacity: 1; filter: brightness(1); } }
        @keyframes bible-page-previous { 0% { transform: perspective(1800px) rotateY(82deg); opacity: .25; filter: brightness(.65); } 65% { transform: perspective(1800px) rotateY(-8deg); opacity: 1; filter: brightness(1.08); } 100% { transform: perspective(1800px) rotateY(0); opacity: 1; filter: brightness(1); } }
        .bible-paper { backface-visibility:hidden; background: linear-gradient(105deg,#f5ead0 0%,#fffaf0 18%,#fffdf6 52%,#f5ead0 100%); color:#403425; box-shadow:inset 0 0 28px rgba(110,78,35,.10),0 14px 38px rgba(0,0,0,.2); }
        .bible-page-next { animation:bible-page-next .38s ease-out both; transform-origin:left center; }
        .bible-page-previous { animation:bible-page-previous .38s ease-out both; transform-origin:right center; }
        .bible-book { position:relative; perspective:1800px; transform-style:preserve-3d; background:linear-gradient(90deg,#392516,#77502e 5%,#4b301d 10%,#674326 50%,#4b301d 90%,#77502e 95%,#392516); box-shadow:0 22px 55px rgba(0,0,0,.38); }
        .bible-cover-wrap { position:absolute; z-index:5; inset:0; perspective:1800px; transform-style:preserve-3d; pointer-events:none; }
        .bible-cover { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; border:1px solid #c6a45e; border-radius:14px; background:radial-gradient(ellipse at 50% 42%,#713b35 0%,#542521 48%,#321411 100%); color:#f4dfaa; box-shadow:inset 0 0 0 8px rgba(205,166,91,.12),inset 0 0 35px rgba(0,0,0,.55),0 18px 40px rgba(0,0,0,.45); transform-origin:left center; transition:transform .72s cubic-bezier(.2,.75,.25,1),opacity .5s ease; backface-visibility:hidden; pointer-events:auto; cursor:pointer; }
        .bible-cover.opening { transform:rotateY(-158deg); opacity:.15; pointer-events:none; }
        .bible-cover-frame { position:absolute; inset:18px; border:1px solid rgba(222,190,125,.72); border-radius:8px; box-shadow:inset 0 0 0 4px rgba(222,190,125,.08); }
        .bible-cover-spine { position:absolute; top:0; bottom:0; left:0; width:24px; background:linear-gradient(90deg,rgba(0,0,0,.5),rgba(224,181,103,.24),rgba(0,0,0,.16)); border-radius:14px 0 0 14px; }
        .bible-cover-ornament { width:76px;height:76px;border:1px solid #d9b86f;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 0 7px rgba(217,184,111,.08),0 0 25px rgba(217,184,111,.12); }
        @media(max-width:639px){.bible-book{background:transparent;box-shadow:none;padding:0}.bible-cover{border-radius:12px;min-height:470px}.bible-cover-frame{inset:12px}}
      `}</style>
      <section className="mx-auto max-w-3xl pt-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-6 w-6"/></div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Bíblia Sagrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Uma experiência de leitura como um livro, página por página.</p>
      </section>
      <section className="glass mx-auto grid max-w-3xl grid-cols-1 gap-3 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:p-4">
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Livro</span><select value={bookSlug} onChange={(e) => changeBook(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3">{oldTestament.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}<option disabled>──────────</option>{newTestament.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Capítulo</span><select value={chapter} onChange={(e) => setChapter(Number(e.target.value))} className="h-11 w-full rounded-xl border border-input bg-background px-3">{Array.from({length:selectedBook.chapters},(_,i)=>i+1).map((n)=><option key={n} value={n}>{n}</option>)}</select></label>
      </section>
      <section className="glass mx-auto max-w-3xl space-y-3 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5"/></div><div><h2 className="font-semibold">Busca bíblica inteligente</h2><p className="text-xs text-muted-foreground">Pesquise por temas, dúvidas ou palavras do seu dia a dia.</p></div></div>
        <form onSubmit={(event) => { event.preventDefault(); searchTopics(); }} className="flex flex-col gap-2 sm:flex-row"><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Ex.: versículos sobre imoralidade sexual..." className="h-11 rounded-xl"/><Button type="submit" className="h-11 rounded-xl"><Search className="mr-2 h-4 w-4"/> Encontrar versículos</Button></form>
        {searchResults.length > 0 && <div className="space-y-2"><p className="text-xs text-muted-foreground">{searchResults.length} passagens relacionadas encontradas. Toque em uma para abrir a Bíblia no trecho.</p>{searchResults.map((result) => <button key={result.reference} type="button" onClick={() => void openSearchResult(result)} className="w-full rounded-xl border border-border/70 bg-background/40 p-3 text-left transition hover:border-primary/40 hover:bg-accent/50"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{result.title}</span><span className="shrink-0 text-xs font-medium text-primary">{result.reference}</span></div><p className="mt-1 text-sm text-muted-foreground">{result.explanation}</p></button>)}</div>}
        {searchQuery.trim() && searchResults.length === 0 && <p className="text-xs text-muted-foreground">Digite sua busca e toque em “Encontrar versículos” para ver as passagens relacionadas.</p>}
        <p className="text-[11px] text-muted-foreground">A busca relaciona temas a referências bíblicas selecionadas; ela não substitui o estudo do contexto completo das passagens.</p>
      </section>
      {lastProgress && savedBook && <section className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3"><div className="flex items-center gap-2"><BookmarkCheck className="h-5 w-5 text-primary"/><div><p className="text-sm font-semibold">Sua última leitura</p><p className="text-xs text-muted-foreground">{savedBook.name} {lastProgress.chapter} · página {lastProgress.pageIndex + 1}</p></div></div><Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => { setBookSlug(lastProgress.bookSlug); setChapter(lastProgress.chapter); setPageIndex(lastProgress.pageIndex); setIsCoverOpen(true); }}>Continuar leitura</Button></section>}
      {isCoverOpen && <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-[#f5e6cd]">
          <div className="flex items-center gap-2"><Volume2 className="h-5 w-5 text-[#d9bd82]"/><div><p className="text-sm font-semibold">Ouvir a Bíblia</p><p className="text-xs text-[#e8d6b8]/75">{speechStatus === "playing" ? "Lendo este capítulo…" : speechStatus === "paused" ? "Leitura pausada" : "Escute este capítulo em voz alta"}</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs">Voz<select aria-label="Tom da voz" value={speechPitch} onChange={(event) => setSpeechPitch(Number(event.target.value))} className="rounded-lg border border-white/15 bg-[#29231d] px-2 py-1.5 text-[#f5e6cd]"><option value={0.5}>Bem grave</option><option value={0.65}>Grave</option><option value={0.8}>Média-grave</option><option value={1}>Natural</option></select></label><label className="flex items-center gap-2 text-xs">Velocidade<select aria-label="Velocidade da leitura" value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))} className="rounded-lg border border-white/15 bg-[#29231d] px-2 py-1.5 text-[#f5e6cd]"><option value={0.8}>0,8×</option><option value={0.95}>1×</option><option value={1.2}>1,2×</option><option value={1.5}>1,5×</option></select></label>
          <Button type="button" size="sm" onClick={toggleReading} disabled={loading || !!error || !data?.verses?.length} className="rounded-xl bg-[#b58b4c] text-[#21180e] hover:bg-[#c99d5a]">{speechStatus === "playing" ? <><Pause className="mr-1 h-4 w-4"/> Pausar</> : speechStatus === "paused" ? <><Play className="mr-1 h-4 w-4"/> Continuar</> : <><Play className="mr-1 h-4 w-4"/> Ouvir capítulo</>}</Button>
          {speechStatus !== "idle" && <Button type="button" size="sm" variant="outline" onClick={stopReading} className="rounded-xl border-white/20 text-[#f5e6cd] hover:bg-white/10"><Square className="mr-1 h-3.5 w-3.5"/> Parar</Button>}</div></div>}
        <div className="bible-book mx-auto max-w-5xl rounded-[22px] p-3 sm:p-5">
        <div className="hidden overflow-hidden rounded-lg sm:grid sm:grid-cols-2 sm:gap-[2px]">
          {[pages[Math.min(pageIndex,pageCount-1)]??[],pages[Math.min(pageIndex+1,pageCount-1)]??[]].map((verses,side)=>(
            <article key={pageIndex+"-"+side} className={`bible-paper min-h-[520px] px-7 py-9 lg:px-10 ${flipDirection==="next"?"bible-page-next":"bible-page-previous"} ${side===0?"rounded-l-md":"rounded-r-md"}`}>
              <div className="mb-6 border-b border-[#b9a98d] pb-4 text-center"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#94764d]">{selectedBook.testament}</p><h2 className="mt-2 font-serif text-2xl font-semibold">{selectedBook.name}</h2><p className="mt-1 font-serif text-sm italic text-[#806c50]">Capítulo {chapter}</p></div>
              <div className="space-y-3 font-serif text-[15px] leading-[1.85] lg:text-base">{loading?<div className="flex items-center justify-center gap-2 py-20 text-sm text-[#806c50]"><LoaderCircle className="h-5 w-5 animate-spin"/> Abrindo as páginas…</div>:error?<p className="py-16 text-center text-sm">{error}</p>:verses.map(v=><p key={v.v}><sup className="mr-1.5 font-sans text-[10px] font-bold text-[#9a7848]">{v.v}</sup>{v.t}</p>)}</div>
              <div className="mt-8 border-t border-[#cbbda5] pt-3 text-center font-serif text-xs text-[#9a896e]">{side===0?pageIndex*2+1:Math.min(pageIndex+1,pageCount-1)*2+2}</div>
            </article>
          ))}
        </div>
        <div className="sm:hidden" onTouchStart={(e)=>setTouchStartX(e.touches[0].clientX)} onTouchEnd={handleTouchEnd}>
          <article key={pageIndex} className={`bible-paper bible-page-${flipDirection} min-h-[470px] rounded-lg px-5 py-7`}>
            <div className="mb-6 border-b border-[#b9a98d] pb-4 text-center"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#94764d]">{selectedBook.testament}</p><h2 className="mt-2 font-serif text-2xl font-semibold">{selectedBook.name}</h2><p className="mt-1 font-serif text-sm italic text-[#806c50]">Capítulo {chapter}</p></div>
            <div className="space-y-3 font-serif text-[15px] leading-[1.85]">{loading?<div className="flex items-center justify-center gap-2 py-20 text-sm text-[#806c50]"><LoaderCircle className="h-5 w-5 animate-spin"/> Abrindo…</div>:error?<p className="py-16 text-center text-sm">{error}</p>:(pages[pageIndex]??[]).map(v=><p key={v.v}><sup className="mr-1.5 font-sans text-[10px] font-bold text-[#9a7848]">{v.v}</sup>{v.t}</p>)}</div>
            <div className="mt-8 border-t border-[#cbbda5] pt-3 text-center font-serif text-xs text-[#9a896e]">{pageIndex+1}</div>
          </article>
          <p className="mt-3 text-center text-[11px] text-[#e8d6b8]/80">Deslize para virar a página</p>
        </div>
        {!isCoverOpen && <div className="bible-cover-wrap">
          <button type="button" onClick={openBibleCover} className={`bible-cover ${coverOpening ? "opening" : ""}`} aria-label="Abrir a Bíblia Sagrada">
            <span className="bible-cover-frame" /> <span className="bible-cover-spine" />
            <span className="relative z-10 flex max-w-[80%] flex-col items-center text-center">
              <span className="bible-cover-ornament"><BookOpen className="h-9 w-9" strokeWidth={1.25}/></span>
              <span className="mt-8 font-serif text-xs uppercase tracking-[.38em] text-[#d9bd82]">A Palavra de Deus</span>
              <span className="mt-3 font-serif text-4xl font-semibold tracking-[.08em] sm:text-5xl">BÍBLIA</span>
              <span className="mt-2 font-serif text-lg tracking-[.24em] text-[#e4c98e]">SAGRADA</span>
              <span className="mt-8 h-px w-28 bg-[#d9b86f]/70"/>
              <span className="mt-5 font-serif text-sm italic text-[#d9bd82]">Antigo e Novo Testamento</span>
              <span className="mt-10 rounded-full border border-[#d9b86f]/70 px-6 py-2.5 font-sans text-xs font-medium uppercase tracking-[.2em] text-[#f6e5bd]">Toque para abrir</span>
            </span>
          </button>
        </div>}
        <div className={`mt-3 flex items-center justify-between gap-2 px-1 text-[#f5e6cd] ${!isCoverOpen ? "invisible" : ""}`}>
          <button onClick={()=>turnPage("previous")} disabled={loading||(pageIndex===0&&bookSlug===books[0].slug&&chapter===1)} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="h-4 w-4"/><span className="hidden sm:inline">Página anterior</span><span className="sm:hidden">Voltar</span></button>
          <span className="text-center text-xs tabular-nums">{loading?"…":`Página ${pageIndex+1} de ${pageCount}`} · {selectedBook.name} {chapter}</span>
          <button onClick={()=>turnPage("next")} disabled={loading||(pageIndex>=pageCount-1&&isLastChapter)} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-white/10 disabled:opacity-30"><span className="hidden sm:inline">Próxima página</span><span className="sm:hidden">Avançar</span><ChevronRight className="h-4 w-4"/></button>
        </div>
      </div>
      <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">Texto em português disponibilizado pelo projeto Free.Bible. <a href="https://free.bible/pt" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">Conheça as traduções e licenças</a>.</p>
    </div>
  );
}