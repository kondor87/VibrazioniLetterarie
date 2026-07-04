"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Library } from "lucide-react";
import { useUserBooks } from "@/lib/hooks/useUserBooks";
import { CommunityBookPanel } from "@/components/community/CommunityBookPanel";

interface Head { title: string; authors: string[]; cover_url: string | null }

export default function ComunitaBookPage({ params }: { params: { bookId: string } }) {
  const { bookId } = params;
  const { books } = useUserBooks();
  const mine = books.find(b => b.book_id === bookId);

  const [head, setHead] = useState<Head | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/community/book?bookId=${encodeURIComponent(bookId)}`)
      .then(r => r.json())
      .then(d => { if (active && d?.title) setHead({ title: d.title, authors: d.authors ?? [], cover_url: d.cover_url ?? null }); })
      .catch(() => {});
    return () => { active = false; };
  }, [bookId]);

  // Ritmo personale se possiedo il libro (per il percentile)
  const myPpd = (mine?.started_at && mine?.finished_at && mine?.page_count)
    ? mine.page_count / Math.max(1, Math.round(
        (new Date(mine.finished_at).getTime() - new Date(mine.started_at).getTime()) / 86400000))
    : null;

  const title = head?.title ?? mine?.title ?? "Libro";
  const authors = head?.authors?.length ? head.authors : (mine?.authors ?? []);
  const cover = head?.cover_url ?? mine?.cover_url ?? null;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-void">
      <div className="w-full max-w-3xl mx-auto px-8 py-8 space-y-8">
        <Link href="/comunita" className="inline-flex items-center gap-1.5 font-ui text-[12px] text-text-muted hover:text-gold transition-colors">
          <ArrowLeft size={13} /> La comunità
        </Link>

        {/* Header libro (il core) */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-5 items-end">
          <div className="shrink-0 w-[120px] h-[180px] rounded-md shadow-book overflow-hidden border border-white/10 bg-surface-3 flex items-center justify-center">
            {cover
              ? <Image src={cover} alt={title} width={120} height={180} className="w-full h-full object-cover" />
              : <BookOpen size={26} className="text-text-muted" />}
          </div>
          <div className="min-w-0 pb-1">
            <p className="font-ui text-[11px] uppercase tracking-[0.2em] text-gold/60 mb-1">Profilo della comunità</p>
            <h1 className="font-display text-2xl font-semibold text-text-warm leading-tight">{title}</h1>
            <p className="font-ui text-[14px] text-text-sec mt-1">{authors.join(", ")}</p>
            {mine && (
              <Link href={`/libri/${mine.id}`}
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg border border-gold/25 bg-gold/8 text-gold font-ui text-[11px] uppercase tracking-widest hover:bg-gold/15 transition-all">
                <Library size={12} /> È nella tua libreria
              </Link>
            )}
          </div>
        </motion.div>

        {/* Vibrazioni della comunità */}
        <CommunityBookPanel bookId={bookId} myRating={mine?.rating ?? null} myPpd={myPpd} />
      </div>
    </div>
  );
}
