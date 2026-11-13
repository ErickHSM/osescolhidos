import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type BibleBook = { name: string; slug: string; chapters: number; testament: "Antigo Testamento" | "Novo Testamento" };
type BibleVerse = { v: number; t: string };
type BibleChapterResponse = { verses?: BibleVerse[]; translation?: string; book?: string; chapter?: number };

const books: BibleBook[] = [
  ["Gênesis","genesis",50],["Êxodo","exodus",40],["Levítico","leviticus",27],["Números","numbers",36],["Deuteronômio","deuteronomy",34],["Josué","joshua",24],["Juízes","judges",21],["Rute","ruth",4],["1 Samuel","1-samuel",31],["2 Samuel","2-samuel",24],["1 Reis","1-kings",22],["2 Reis","2-kings",25],["1 Crônicas","1-chronicles",29],["2 Crônicas","2-chronicles",36],["Esdras","ezra",10],["Neemias","nehemiah",13],["Ester","esther",10],["Jó","job",42],["Salmos","psalms",150],["Provérbios","proverbs",31],["Eclesiastes","ecclesiastes",12],["Cantares","song-of-solomon",8],["Isaías","isaiah",66],["Jeremias","jeremiah",52],["Lamentações","lamentations",5],["Ezequiel","ezekiel",48],["Daniel","daniel",12],["Oséias","hosea",14],["Joel","joel",3],["Amós","amos",9],["Obadias","obadiah",1],["Jonas","jonah",4],["Miquéias","micah",7],["Naum","nahum",3],["Habacuque","habakkuk",3],["Sofonias","zephaniah",3],["Ageu","haggai",2],["Zacarias","zechariah",14],["Malaquias","malachi",4],
  ["Mateus","matthew",28],["Marcos","mark",16],["Lucas","luke",24],["João","john",21],["Atos","acts",28],["Romanos","romans",16],["1 Coríntios","1-corinthians",16],["2 Coríntios","2-corinthians",13],["Gálatas","galatians",6],["Efésios","ephesians",6],["Filipenses","philippians",4],["Colossenses","colossians",4],["1 Tessalonicenses","1-thessalonians",5],["2 Tessalonicenses","2-thessalonians",3],["1 Timóteo","1-timothy",6],["2 Timóteo","2-timothy",4],["Tito","titus",3],["Filemom","philemon",1],["Hebreus","hebrews",13],["Tiago","james",5],["1 Pedro","1-peter",5],["2 Pedro","2-peter",3],["1 João","1-john",5],["2 João","2-john",1],["3 João","3-john",1],["Judas","jude",1],["Apocalipse","revelation",22],
].map(([name, slug, chapters], index) => ({ name: String(name), slug: String(slug), chapters: Number(chapters), testament: index < 39 ? "Antigo Testamento" : "Novo Testamento" }));

export function BibleReader() {
  const [bookSlug, setBookSlug] = useState("genesis");
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState<BibleChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "previous">("next");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const selectedBook = books.find((book) => book.slug === bookSlug) ?? books[0];
  const oldTestament = useMemo(() => books.filter((book) => book.testament === "Antigo Testamento"), []);
  const newTestament = useMemo(() => books.filter((book) => book.testament === "Novo Testamento"), []);
  const pages = useMemo(() => { const verses = data?.verses ?? []; const result: BibleVerse[][] = []; for (let i = 0; i < verses.length; i += 12) result.push(verses.slice(i, i + 12)); return result.length ? result : [[]]; }, [data]);
  const pageCount = pages.length;
  const isLastChapter = bookSlug === books[books.length - 1].slug && chapter === selectedBook.chapters;
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

  function changeBook(value: string) { setBookSlug(value); setChapter(1); setPageIndex(0); }
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
        .bible-book { perspective:1800px; transform-style:preserve-3d; background:linear-gradient(90deg,#392516,#77502e 5%,#4b301d 10%,#674326 50%,#4b301d 90%,#77502e 95%,#392516); box-shadow:0 22px 55px rgba(0,0,0,.38); }
        @media(max-width:639px){.bible-book{background:transparent;box-shadow:none;padding:0}}
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
        <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[#f5e6cd]">
          <button onClick={()=>turnPage("previous")} disabled={loading||(pageIndex===0&&bookSlug===books[0].slug&&chapter===1)} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="h-4 w-4"/><span className="hidden sm:inline">Página anterior</span><span className="sm:hidden">Voltar</span></button>
          <span className="text-center text-xs tabular-nums">{loading?"…":`Página ${pageIndex+1} de ${pageCount}`} · {selectedBook.name} {chapter}</span>
          <button onClick={()=>turnPage("next")} disabled={loading||(pageIndex>=pageCount-1&&isLastChapter)} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-white/10 disabled:opacity-30"><span className="hidden sm:inline">Próxima página</span><span className="sm:hidden">Avançar</span><ChevronRight className="h-4 w-4"/></button>
        </div>
      </div>
      <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">Texto em português disponibilizado pelo projeto Free.Bible. <a href="https://free.bible/pt" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">Conheça as traduções e licenças</a>.</p>
    </div>
  );
}