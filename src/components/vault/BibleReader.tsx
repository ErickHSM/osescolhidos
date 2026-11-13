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
  const selectedBook = books.find((book) => book.slug === bookSlug) ?? books[0];
  const oldTestament = useMemo(() => books.filter((book) => book.testament === "Antigo Testamento"), []);
  const newTestament = useMemo(() => books.filter((book) => book.testament === "Novo Testamento"), []);

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

  function changeBook(slug: string) { setBookSlug(slug); setChapter(1); }
  function previous() {
    if (chapter > 1) setChapter((value) => value - 1);
    else {
      const index = books.findIndex((book) => book.slug === bookSlug);
      const previousBook = books[index - 1];
      if (previousBook) { setBookSlug(previousBook.slug); setChapter(previousBook.chapters); }
    }
  }
  function next() {
    if (chapter < selectedBook.chapters) setChapter((value) => value + 1);
    else {
      const index = books.findIndex((book) => book.slug === bookSlug);
      const nextBook = books[index + 1];
      if (nextBook) { setBookSlug(nextBook.slug); setChapter(1); }
    }
  }

  return (
    <div className="space-y-6">
      <section className="mx-auto mt-7 max-w-3xl text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-7 w-7"/></div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Bíblia Sagrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Leia os 66 livros, do Gênesis ao Apocalipse.</p>
      </section>
      <section className="glass grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Livro</span><select value={bookSlug} onChange={(event) => changeBook(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3">{oldTestament.map((book) => <option key={book.slug} value={book.slug}>{book.name}</option>)}<option disabled>──────────</option>{newTestament.map((book) => <option key={book.slug} value={book.slug}>{book.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">Capítulo</span><select value={chapter} onChange={(event) => setChapter(Number(event.target.value))} className="h-11 w-full rounded-xl border border-input bg-background px-3">{Array.from({length:selectedBook.chapters}, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
      </section>
      <article className="glass mx-auto max-w-3xl rounded-3xl p-5 sm:p-9">
        <div className="mb-6 border-b border-border/70 pb-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">{selectedBook.testament}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">{selectedBook.name} {chapter}</h2>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin"/> Carregando capítulo…</div> : error ? <div className="py-12 text-center text-sm text-muted-foreground">{error}<p className="mt-2">Verifique sua conexão e tente novamente.</p></div> : <div className="space-y-4">{(data?.verses ?? []).map((verse) => <p key={verse.v} className="font-serif text-[17px] leading-8 text-foreground sm:text-lg"><sup className="mr-2 font-sans text-xs font-bold text-primary">{verse.v}</sup>{verse.t}</p>)}</div>}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/70 pt-5"><Button variant="outline" onClick={previous} disabled={loading || (bookSlug === books[0].slug && chapter === 1)} className="rounded-xl"><ChevronLeft className="mr-1 h-4 w-4"/> Anterior</Button><span className="text-xs text-muted-foreground">{chapter} de {selectedBook.chapters}</span><Button onClick={next} disabled={loading || (bookSlug === books[books.length - 1].slug && chapter === selectedBook.chapters)} className="rounded-xl">Próximo <ChevronRight className="ml-1 h-4 w-4"/></Button></div>
      </article>
      <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">Texto em português disponibilizado pelo projeto Free.Bible. <a href="https://free.bible/pt" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-primary">Conheça as traduções e licenças</a>.</p>
    </div>
  );
}
