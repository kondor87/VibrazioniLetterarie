"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Library, Loader2, Inbox, Search, Check, X, Layers, CheckSquare, ListOrdered, ChevronUp, ChevronDown, Image as ImageIcon, GalleryVerticalEnd } from "lucide-react";
import { BookCover } from "./BookCover";
import { useCensus } from "@/lib/hooks/useCensus";
import { ROW_LABEL, rowsFor, type ShelfRow } from "@/types/census";
import { GENRE_COLORS, type BookWithReading } from "@/types/book";

// Altezza del dorso: dallo spessore (pagine) MA anche dalla lunghezza del titolo,
// così i titoli lunghi hanno più spazio verticale e non si troncano.
function spineHeight(book: BookWithReading): number {
  const p = book.page_count ?? 280;
  const base = p < 200 ? 64 : p < 350 ? 74 : p < 520 ? 84 : 94;
  const titleNeed = 46 + (book.title?.length ?? 0) * 2.3;
  return Math.round(Math.min(152, Math.max(base, titleNeed)));
}

interface CensusViewProps {
  books: BookWithReading[];
  onPick: (book: BookWithReading) => void;
  focusId?: string | null;          // libro da evidenziare ("trova dov'è")
  matchIds?: Set<string>;           // libri che corrispondono ai filtri attivi
  filtersActive?: boolean;          // se true, evidenzia i match e sfuma il resto
}
interface Target { shelfId: string; row: ShelfRow }

const AZ = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export function CensusView({ books, onPick, focusId, matchIds, filtersActive }: CensusViewProps) {
  const isDimmed = (id: string) => !!filtersActive && !!matchIds && !matchIds.has(id);
  const c = useCensus();
  const booksById = useMemo(() => new Map(books.map(b => [b.id, b])), [books]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [traySearch, setTraySearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [spine, setSpine] = useState(false); // vista dorsi (di profilo) vs copertine

  // "Trova dov'è": scorre fino al libro e lo evidenzia
  useEffect(() => {
    if (!focusId || c.loading) return;
    setHighlightId(focusId);
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-bookid="${focusId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const clear = setTimeout(() => setHighlightId(null), 4000);
    return () => { clearTimeout(t); clearTimeout(clear); };
  }, [focusId, c.loading]);

  const placedIds = useMemo(() => new Set(Object.keys(c.placements)), [c.placements]);
  const unplaced = useMemo(() => {
    const q = traySearch.trim().toLowerCase();
    return books.filter(b => !placedIds.has(b.id)
      && (!filtersActive || !matchIds || matchIds.has(b.id))
      && (!q || b.title.toLowerCase().includes(q) || b.authors.some(a => a.toLowerCase().includes(q)))
    );
  }, [books, placedIds, traySearch, filtersActive, matchIds]);

  const rowIdsOf = (shelfId: string, row: ShelfRow): string[] =>
    Object.values(c.placements)
      .filter(p => p.shelf_id === shelfId && p.shelf_row === row)
      .sort((a, b) => a.position - b.position)
      .map(p => p.user_book_id);

  const shelfName = (shelfId: string) => c.bookcases.flatMap(b => b.shelves).find(s => s.id === shelfId)?.name ?? "";

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function trayClick(b: BookWithReading) {
    if (selectMode) toggleSelect(b.id);
    else if (target) c.placeBook(b.id, target.shelfId, target.row);
    else onPick(b);
  }
  function onRowLabel(shelfId: string, row: ShelfRow, isTarget: boolean) {
    if (selectMode && selected.size > 0) {
      c.placeMany(Array.from(selected), shelfId, row);
      setSelected(new Set());
    } else {
      setTarget(isTarget ? null : { shelfId, row });
    }
  }
  // drop su una copertina dentro una fila → inserisci a quell'indice
  function insertAt(shelfId: string, row: ShelfRow, index: number) {
    if (!dragId) return;
    const ids = rowIdsOf(shelfId, row).filter(id => id !== dragId);
    ids.splice(Math.min(index, ids.length), 0, dragId);
    c.setRowOrder(shelfId, row, ids);
    setDragId(null); setOverKey(null);
  }
  // drop nell'area della fila → accoda
  function appendTo(shelfId: string, row: ShelfRow) {
    if (!dragId) return;
    const ids = rowIdsOf(shelfId, row).filter(id => id !== dragId);
    ids.push(dragId);
    c.setRowOrder(shelfId, row, ids);
    setDragId(null); setOverKey(null);
  }

  if (c.loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-gold/40" size={26} /></div>;
  }

  // Dorso (vista "di profilo") — font adattivo + testo su più colonne per titoli lunghi
  const Spine = ({ book, h }: { book: BookWithReading; h: number }) => {
    const color = GENRE_COLORS[book.genres?.[0] ?? ""] ?? "#5a3b28";
    const len = book.title?.length ?? 0;
    const fs = len > 40 ? 9 : len > 24 ? 10 : 11;
    return (
      <div title={`${book.title} — ${book.authors[0] ?? ""}`}
        style={{
          width: 42, height: Math.max(h, 64),
          background: `linear-gradient(180deg, ${color} 0%, ${color}dd 60%, ${color}aa 100%)`,
          borderRadius: "2px 2px 0 0",
          boxShadow: "inset 1px 0 0 rgba(255,255,255,0.14), inset -2px 0 3px rgba(0,0,0,0.5), 0 -2px 5px rgba(0,0,0,0.35)",
        }}
        className="relative flex items-center justify-center overflow-hidden px-0.5 pt-3 pb-2">
        {/* filetti dorati come incisioni */}
        <div className="absolute inset-x-1.5 top-2 h-[2px] rounded" style={{ background: "rgba(212,161,94,0.6)" }} />
        <div className="absolute inset-x-1.5 bottom-2 h-[2px] rounded" style={{ background: "rgba(212,161,94,0.3)" }} />
        <span className="font-ui font-semibold text-center"
          style={{
            writingMode: "vertical-rl", fontSize: fs, lineHeight: 1.08, color: "#fff",
            textShadow: "0 1px 2px rgba(0,0,0,0.78)", letterSpacing: "0.01em",
            maxHeight: "100%", overflow: "hidden",
            whiteSpace: "normal",         // consente l'andata a capo su più colonne
            wordBreak: "break-word",
          }}>
          {book.title}
        </span>
      </div>
    );
  };

  // libro nel vassoio (drag + click select/place/pick)
  const TrayCover = ({ book }: { book: BookWithReading }) => {
    const sel = selected.has(book.id);
    return (
      <div draggable
        onDragStart={() => setDragId(book.id)} onDragEnd={() => { setDragId(null); setOverKey(null); }}
        onClick={spine ? () => trayClick(book) : undefined}
        style={{ cursor: target || selectMode ? "pointer" : "grab", opacity: dragId === book.id ? 0.4 : 1 }}
        className={`shrink-0 rounded-[3px] ${sel ? "ring-2 ring-gold" : ""}`}>
        {spine
          ? <Spine book={book} h={spineHeight(book)} />
          : <BookCover book={book} width={44} height={66} onClick={() => trayClick(book)} />}
      </div>
    );
  };

  // libro dentro una fila (drag + drop-target per inserimento)
  const RowCover = ({ book, shelfId, row, index }: { book: BookWithReading; shelfId: string; row: ShelfRow; index: number }) => {
    const k = `${shelfId}:${row}:${index}`;
    const w = row === "davanti" ? 44 : 38;
    const hl = highlightId === book.id;
    const dim = isDimmed(book.id);
    return (
      <div draggable data-bookid={book.id}
        onDragStart={() => setDragId(book.id)} onDragEnd={() => { setDragId(null); setOverKey(null); }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOverKey(k); }}
        onDrop={e => { e.stopPropagation(); insertAt(shelfId, row, index); }}
        onClick={spine ? () => onPick(book) : undefined}
        style={{
          cursor: "grab",
          opacity: dragId === book.id ? 0.4 : dim ? 0.18 : 1,
          filter: dim ? "grayscale(0.85)" : undefined,
          boxShadow: overKey === k ? "-3px 0 0 rgba(212,161,94,0.85)" : undefined,
          transition: "opacity 0.25s, filter 0.25s",
        }}
        className={`shrink-0 rounded-[3px] ${hl ? "ring-2 ring-gold animate-pulse" : ""}`}>
        {spine
          ? <Spine book={book} h={spineHeight(book)} />
          : <BookCover book={book} width={w} height={Math.round(w * 1.5)} onClick={() => onPick(book)} />}
      </div>
    );
  };

  // fila
  const Row = ({ shelfId, row }: { shelfId: string; row: ShelfRow }) => {
    const ids = rowIdsOf(shelfId, row);
    const rowBooks = ids.map(id => booksById.get(id)).filter((b): b is BookWithReading => !!b);
    const isOver = overKey === `${shelfId}:${row}`;
    const isTarget = target?.shelfId === shelfId && target?.row === row;
    const canTarget = selectMode && selected.size > 0;
    return (
      <div
        onDragOver={e => { e.preventDefault(); setOverKey(`${shelfId}:${row}`); }}
        onDragLeave={() => setOverKey(prev => prev === `${shelfId}:${row}` ? null : prev)}
        onDrop={() => appendTo(shelfId, row)}
        className="rounded-md transition-colors px-2 py-1.5"
        style={{
          background: isOver ? "rgba(212,161,94,0.10)" : isTarget ? "rgba(212,161,94,0.06)" : "transparent",
          outline: isOver ? "1px dashed rgba(212,161,94,0.5)" : isTarget ? "1px solid rgba(212,161,94,0.35)" : "none",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => onRowLabel(shelfId, row, isTarget)}
            title={canTarget ? "Colloca qui i selezionati" : "Riempi questa fila cliccando i libri nel vassoio"}
            className="flex items-center gap-1 font-ui text-[10px] uppercase tracking-[0.16em] transition-colors"
            style={{ color: (isTarget || canTarget) ? "#d4a15e" : row === "davanti" ? "rgba(212,161,94,0.6)" : "rgba(168,138,106,0.55)" }}>
            {isTarget ? <Check size={11} /> : <Plus size={11} className="opacity-60" />}
            {ROW_LABEL[row]}
          </button>
          <span className="font-mono text-[10px] text-text-muted">{rowBooks.length}</span>
        </div>
        <div className="flex items-end gap-1.5 min-h-[68px] flex-wrap">
          {rowBooks.length === 0 ? (
            <span className="font-ui text-[11px] text-text-muted/50 italic py-5">
              {isTarget ? "clicca i libri nel vassoio…" : canTarget ? "clicca per collocare i selezionati" : "trascina qui o usa “＋ fila”"}
            </span>
          ) : rowBooks.map((b, i) => <RowCover key={b.id} book={b} shelfId={shelfId} row={row} index={i} />)}
        </div>
      </div>
    );
  };

  const placedCount = placedIds.size;
  const totalBooks = books.length;
  const pct = totalBooks ? Math.round((placedCount / totalBooks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Progresso censimento ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #C89010, #d4a15e)" }} />
        </div>
        <span className="font-ui text-[11px] text-text-muted whitespace-nowrap">
          Censiti <span className="text-gold font-medium">{placedCount}</span> di {totalBooks} <span className="opacity-60">({pct}%)</span>
        </span>
      </div>

      {/* Filtri attivi: evidenziazione sugli scaffali */}
      {filtersActive && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(212,161,94,0.08)", border: "1px solid rgba(212,161,94,0.2)" }}>
          <Search size={13} className="text-gold" />
          <span className="font-ui text-[12px] text-gold">
            Filtri attivi: evidenzio <strong>{matchIds?.size ?? 0}</strong> libri che corrispondono — gli altri sono sfumati sugli scaffali.
          </span>
        </div>
      )}

      {/* ── Vassoio "Da collocare" ── */}
      <div
        onDragOver={e => { e.preventDefault(); setOverKey("tray"); }}
        onDragLeave={() => setOverKey(prev => prev === "tray" ? null : prev)}
        onDrop={() => { if (dragId) c.unplaceBook(dragId); setDragId(null); setOverKey(null); }}
        className="rounded-xl p-4 border transition-colors"
        style={{
          background: overKey === "tray" ? "rgba(212,161,94,0.08)" : "rgba(255,255,255,0.02)",
          borderColor: overKey === "tray" ? "rgba(212,161,94,0.4)" : "rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Inbox size={14} className="text-text-muted" />
          <p className="font-ui text-[11px] uppercase tracking-[0.18em] text-text-muted">Da collocare</p>
          <span className="font-mono text-[11px] text-text-muted">{unplaced.length}</span>

          <button onClick={() => { setSelectMode(m => !m); setSelected(new Set()); setTarget(null); }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-ui text-[11px] border transition-colors ${selectMode ? "border-gold/40 bg-gold/12 text-gold" : "border-white/[0.08] text-text-muted hover:text-text-sec"}`}>
            <CheckSquare size={12} /> {selectMode ? "Selezione attiva" : "Seleziona"}
          </button>

          {/* Copertine / Dorsi (di profilo) */}
          <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden" title="Mostra copertine o dorsi">
            <button onClick={() => setSpine(false)} className={azToggle(!spine)}><ImageIcon size={12} /> Copertine</button>
            <button onClick={() => setSpine(true)} className={azToggle(spine)}><GalleryVerticalEnd size={12} /> Dorsi</button>
          </div>

          <div className="relative ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input value={traySearch} onChange={e => setTraySearch(e.target.value)}
              placeholder="Cerca per titolo o autore…"
              className="w-[200px] bg-surface-2 border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 font-ui text-[12px] text-text-warm placeholder:text-text-muted outline-none focus:border-gold/30" />
          </div>
        </div>

        {/* banner riempimento rapido */}
        {target && !selectMode && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(212,161,94,0.10)", border: "1px solid rgba(212,161,94,0.25)" }}>
            <span className="font-ui text-[12px] text-gold">
              Riempimento rapido → <strong>{shelfName(target.shelfId)} · {ROW_LABEL[target.row]}</strong>: clicca i libri per collocarli.
            </span>
            <button onClick={() => setTarget(null)} className="ml-auto flex items-center gap-1 font-ui text-[11px] text-text-muted hover:text-text-warm"><X size={12} /> Fine</button>
          </div>
        )}
        {/* banner selezione multipla — con azione esplicita "Colloca in…" */}
        {selectMode && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg flex-wrap" style={{ background: "rgba(212,161,94,0.08)", border: "1px solid rgba(212,161,94,0.2)" }}>
            <span className="font-ui text-[12px] text-gold"><strong>{selected.size}</strong> selezionati</span>
            {selected.size > 0 ? (
              <>
                <select defaultValue=""
                  onChange={e => {
                    const [sid, row] = e.target.value.split("|");
                    if (sid) { c.placeMany(Array.from(selected), sid, row as ShelfRow); setSelected(new Set()); }
                    e.currentTarget.value = "";
                  }}
                  className="bg-surface-3 border border-gold/30 rounded-md px-2.5 py-1 font-ui text-[12px] text-gold outline-none cursor-pointer">
                  <option value="">Colloca in…</option>
                  {c.bookcases.flatMap(bc => bc.shelves.flatMap(sh =>
                    rowsFor(sh.row_depth).map(r => (
                      <option key={`${sh.id}-${r}`} value={`${sh.id}|${r}`} className="bg-surface-2 text-text-warm">
                        {bc.name} · {sh.name} · {ROW_LABEL[r]}
                      </option>
                    ))
                  ))}
                </select>
                <span className="font-ui text-[11px] text-text-muted">oppure clicca una fila</span>
                <button onClick={() => setSelected(new Set())} className="ml-auto font-ui text-[11px] text-text-muted hover:text-text-warm">Deseleziona</button>
              </>
            ) : <span className="font-ui text-[12px] text-text-muted">clicca i libri da selezionare</span>}
          </div>
        )}

        {unplaced.length === 0 ? (
          <p className="font-ui text-[12px] text-text-muted/60 italic">{traySearch ? "Nessun libro trovato." : "Tutti i libri sono stati collocati ✓"}</p>
        ) : (
          <div className="flex items-end gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {unplaced.slice(0, 120).map(b => <TrayCover key={b.id} book={b} />)}
            {unplaced.length > 120 && <span className="font-ui text-[11px] text-text-muted self-center px-3 whitespace-nowrap">+{unplaced.length - 120} — affina con la ricerca</span>}
          </div>
        )}
      </div>

      {/* ── Librerie ── */}
      {c.bookcases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Library size={30} className="text-gold/40" />
          <p className="font-display text-xl italic text-text-muted">Nessuna libreria ancora</p>
          <p className="font-ui text-[13px] text-text-muted max-w-sm">
            Crea la prima libreria, aggiungi i ripiani (anche a 3 file: davanti, centro, dietro) e colloca i tuoi libri come a casa tua.
          </p>
          <button onClick={() => c.addBookcase("La mia libreria")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold text-void font-ui text-[12px] font-semibold uppercase tracking-wide hover:bg-amber transition-colors">
            <Plus size={14} /> Crea la prima libreria
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {c.bookcases.map((bc, bi) => {
            const bcShelfIds = new Set(bc.shelves.map(s => s.id));
            const bcCount = Object.values(c.placements).filter(p => bcShelfIds.has(p.shelf_id)).length;
            return (
            <motion.div key={bc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-white/[0.06] overflow-hidden"
              style={{ background: "linear-gradient(180deg, rgba(31,18,10,0.6) 0%, rgba(20,12,6,0.6) 100%)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] flex-wrap">
                {/* riordino librerie */}
                <div className="flex flex-col -my-1">
                  <button onClick={() => c.moveBookcase(bc.id, -1)} disabled={bi === 0}
                    className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors leading-none"><ChevronUp size={13} /></button>
                  <button onClick={() => c.moveBookcase(bc.id, 1)} disabled={bi === c.bookcases.length - 1}
                    className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors leading-none"><ChevronDown size={13} /></button>
                </div>
                <Library size={14} className="text-gold shrink-0" />
                <input defaultValue={bc.name}
                  onBlur={e => { const v = e.target.value.trim(); if (v && v !== bc.name) c.renameBookcase(bc.id, v); }}
                  className="bg-transparent font-display text-[16px] font-semibold text-text-warm outline-none focus:text-gold min-w-[100px] max-w-[260px]" />
                <span className="font-ui text-[11px] text-text-muted">· {bcCount} {bcCount === 1 ? "libro" : "libri"}</span>
                <div className="flex-1" />
                <button onClick={() => c.addShelf(bc.id)} title="Aggiungi ripiano"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md font-ui text-[11px] text-gold/80 hover:text-gold border border-gold/20 hover:border-gold/40 transition-colors">
                  <Plus size={12} /> Ripiano
                </button>
                <button onClick={() => { if (confirm("Creare 26 ripiani A–Z in questa libreria?")) c.addShelvesBulk(bc.id, AZ); }}
                  title="Crea ripiani A–Z in un colpo"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md font-ui text-[11px] text-gold/80 hover:text-gold border border-gold/20 hover:border-gold/40 transition-colors">
                  <ListOrdered size={12} /> A–Z
                </button>
                <button onClick={() => { if (confirm(`Eliminare "${bc.name}" e i suoi ripiani?`)) c.deleteBookcase(bc.id); }}
                  title="Elimina libreria" className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {bc.shelves.length === 0 ? (
                  <p className="font-ui text-[12px] text-text-muted/60 italic px-1">Nessun ripiano — aggiungine uno con “+ Ripiano” o genera A–Z.</p>
                ) : bc.shelves.map((sh, si) => {
                  const rows = rowsFor(sh.row_depth);
                  return (
                    <div key={sh.id} className="rounded-lg" style={{ background: "rgba(0,0,0,0.18)" }}>
                      <div className="flex items-center gap-2 px-3 pt-2.5">
                        <div className="flex flex-col -my-0.5">
                          <button onClick={() => c.moveShelf(bc.id, sh.id, -1)} disabled={si === 0}
                            className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors leading-none"><ChevronUp size={11} /></button>
                          <button onClick={() => c.moveShelf(bc.id, sh.id, 1)} disabled={si === bc.shelves.length - 1}
                            className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors leading-none"><ChevronDown size={11} /></button>
                        </div>
                        <input defaultValue={sh.name}
                          onBlur={e => { const v = e.target.value.trim(); if (v && v !== sh.name) c.renameShelf(sh.id, v); }}
                          placeholder="Nome ripiano (es. A–C, King, Narrativa…)"
                          className="flex-1 bg-transparent font-ui text-[12px] uppercase tracking-[0.12em] text-text-sec outline-none focus:text-gold min-w-0 placeholder:normal-case placeholder:tracking-normal placeholder:text-text-muted/50" />
                        <div className="flex items-center rounded-md border border-white/[0.08] overflow-hidden" title="File del ripiano">
                          <Layers size={11} className="text-text-muted mx-1.5" />
                          {[2, 3].map(d => (
                            <button key={d} onClick={() => c.setShelfDepth(sh.id, d)} className={cnDepth(sh.row_depth === d)}>{d} file</button>
                          ))}
                        </div>
                        <button onClick={() => { if (confirm(`Eliminare "${sh.name}"?`)) c.deleteShelf(sh.id); }}
                          title="Elimina ripiano" className="p-1 rounded text-text-muted hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="px-3 pt-1 pb-0 space-y-0.5">
                        {rows.map(r => <Row key={r} shelfId={sh.id} row={r} />)}
                      </div>
                      <div className="mx-3 mt-1 mb-3" style={{
                        height: 12,
                        background: "linear-gradient(180deg, #7B4820 0%, #5A3212 30%, #3E2210 70%, #221306 100%)",
                        borderRadius: 2, boxShadow: "0 5px 18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,210,110,0.12)",
                      }} />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ); })}

          <button onClick={() => c.addBookcase()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-white/[0.12] text-text-muted hover:text-gold hover:border-gold/30 font-ui text-[12px] transition-colors">
            <Plus size={14} /> Aggiungi un'altra libreria
          </button>
        </div>
      )}
    </div>
  );
}

function cnDepth(active: boolean): string {
  return ["px-2 py-1 font-ui text-[10px] uppercase tracking-wide transition-colors", active ? "bg-gold/15 text-gold" : "text-text-muted hover:text-text-sec"].join(" ");
}

function azToggle(active: boolean): string {
  return ["flex items-center gap-1 px-2 py-1 font-ui text-[11px] transition-colors", active ? "bg-gold/15 text-gold" : "text-text-muted hover:text-text-sec"].join(" ");
}
