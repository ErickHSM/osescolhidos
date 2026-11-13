import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/vault/AuthScreen";
import { Vault } from "@/components/vault/Vault";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OsEscolhidos — Seu cofre pessoal" },
      { name: "description", content: "Guarde áudios, anotações e arquivos em um cofre privado e moderno." },
      { property: "og:title", content: "OsEscolhidos — Seu cofre pessoal" },
      { property: "og:description", content: "Guarde áudios, anotações e arquivos em um cofre privado e moderno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <div className="aurora" />
      <div className="lightning-flash" />
      {!ready ? (
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando…</div>
      ) : session ? (
        <Vault session={session} />
      ) : (
        <AuthScreen />
      )}
    </>
  );
}
