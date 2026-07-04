"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Bookcase, Shelf, Placement, ShelfRow } from "@/types/census";

interface CensusApi {
  bookcases: Bookcase[];
  placements: Record<string, Placement>; // by user_book_id
  loading: boolean;
  reload: () => Promise<void>;
  addBookcase: (name?: string) => Promise<void>;
  renameBookcase: (id: string, name: string) => Promise<void>;
  deleteBookcase: (id: string) => Promise<void>;
  moveBookcase: (id: string, dir: -1 | 1) => Promise<void>;
  moveShelf: (bookcaseId: string, id: string, dir: -1 | 1) => Promise<void>;
  addShelf: (bookcaseId: string, name?: string) => Promise<void>;
  addShelvesBulk: (bookcaseId: string, names: string[]) => Promise<void>;
  renameShelf: (id: string, name: string) => Promise<void>;
  setShelfDepth: (id: string, depth: number) => Promise<void>;
  deleteShelf: (id: string) => Promise<void>;
  placeBook: (userBookId: string, shelfId: string, row: ShelfRow) => Promise<void>;
  placeMany: (userBookIds: string[], shelfId: string, row: ShelfRow) => Promise<void>;
  setRowOrder: (shelfId: string, row: ShelfRow, orderedBookIds: string[]) => Promise<void>;
  unplaceBook: (userBookId: string) => Promise<void>;
}

export function useCensus(): CensusApi {
  const { userId } = useAuth();
  const sb = createClient();
  const [bookcases, setBookcases] = useState<Bookcase[]>([]);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const [bcRes, shRes, plRes] = await Promise.all([
      sb.from("bookcases").select("id, name, sort_order").eq("user_id", userId).order("sort_order"),
      sb.from("shelves").select("id, bookcase_id, name, sort_order, row_depth").eq("user_id", userId).order("sort_order"),
      sb.from("book_placements").select("user_book_id, shelf_id, shelf_row, position").eq("user_id", userId),
    ]);
    const shelves = (shRes.data ?? []) as Shelf[];
    const bcs = (bcRes.data ?? []).map(bc => ({
      ...bc, shelves: shelves.filter(s => s.bookcase_id === bc.id),
    })) as Bookcase[];
    const plMap: Record<string, Placement> = {};
    (plRes.data ?? []).forEach(p => { plMap[(p as Placement).user_book_id] = p as Placement; });
    setBookcases(bcs);
    setPlacements(plMap);
    setLoading(false);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload(); }, [reload]);

  const addBookcase = useCallback(async (name = "Nuova libreria") => {
    if (!userId) return;
    await sb.from("bookcases").insert({ user_id: userId, name, sort_order: bookcases.length });
    await reload();
  }, [userId, bookcases.length, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameBookcase = useCallback(async (id: string, name: string) => {
    setBookcases(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    await sb.from("bookcases").update({ name }).eq("id", id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteBookcase = useCallback(async (id: string) => {
    await sb.from("bookcases").delete().eq("id", id);
    await reload();
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveBookcase = useCallback(async (id: string, dir: -1 | 1) => {
    const ordered = [...bookcases];
    const idx = ordered.findIndex(b => b.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ordered.length) return;
    [ordered[idx], ordered[j]] = [ordered[j], ordered[idx]];
    setBookcases(ordered.map((b, i) => ({ ...b, sort_order: i }))); // ottimistico
    await Promise.all(ordered.map((b, i) => sb.from("bookcases").update({ sort_order: i }).eq("id", b.id)));
  }, [bookcases]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveShelf = useCallback(async (bookcaseId: string, id: string, dir: -1 | 1) => {
    const bc = bookcases.find(b => b.id === bookcaseId);
    if (!bc) return;
    const sh = [...bc.shelves];
    const idx = sh.findIndex(s => s.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sh.length) return;
    [sh[idx], sh[j]] = [sh[j], sh[idx]];
    const reordered = sh.map((s, i) => ({ ...s, sort_order: i }));
    setBookcases(prev => prev.map(b => b.id === bookcaseId ? { ...b, shelves: reordered } : b)); // ottimistico
    await Promise.all(reordered.map((s, i) => sb.from("shelves").update({ sort_order: i }).eq("id", s.id)));
  }, [bookcases]); // eslint-disable-line react-hooks/exhaustive-deps

  const addShelf = useCallback(async (bookcaseId: string, name?: string) => {
    if (!userId) return;
    const count = bookcases.find(b => b.id === bookcaseId)?.shelves.length ?? 0;
    await sb.from("shelves").insert({
      user_id: userId, bookcase_id: bookcaseId, name: name ?? `Ripiano ${count + 1}`, sort_order: count, row_depth: 2,
    });
    await reload();
  }, [userId, bookcases, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const addShelvesBulk = useCallback(async (bookcaseId: string, names: string[]) => {
    if (!userId || names.length === 0) return;
    const start = bookcases.find(b => b.id === bookcaseId)?.shelves.length ?? 0;
    const rows = names.map((name, i) => ({ user_id: userId, bookcase_id: bookcaseId, name, sort_order: start + i, row_depth: 2 }));
    await sb.from("shelves").insert(rows);
    await reload();
  }, [userId, bookcases, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameShelf = useCallback(async (id: string, name: string) => {
    setBookcases(prev => prev.map(b => ({ ...b, shelves: b.shelves.map(s => s.id === id ? { ...s, name } : s) })));
    await sb.from("shelves").update({ name }).eq("id", id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setShelfDepth = useCallback(async (id: string, depth: number) => {
    // riducendo la profondità, sposta le file orfane su "davanti"
    if (depth <= 2) await sb.from("book_placements").update({ shelf_row: "davanti" }).eq("shelf_id", id).eq("shelf_row", "centro");
    if (depth <= 1) await sb.from("book_placements").update({ shelf_row: "davanti" }).eq("shelf_id", id).eq("shelf_row", "dietro");
    await sb.from("shelves").update({ row_depth: depth }).eq("id", id);
    await reload();
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteShelf = useCallback(async (id: string) => {
    await sb.from("shelves").delete().eq("id", id);
    await reload();
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeBook = useCallback(async (userBookId: string, shelfId: string, row: ShelfRow) => {
    if (!userId) return;
    const position = Object.values(placements).filter(p => p.shelf_id === shelfId && p.shelf_row === row).length;
    const next: Placement = { user_book_id: userBookId, shelf_id: shelfId, shelf_row: row, position };
    setPlacements(prev => ({ ...prev, [userBookId]: next })); // ottimistico
    await sb.from("book_placements").upsert(
      { user_id: userId, user_book_id: userBookId, shelf_id: shelfId, shelf_row: row, position, updated_at: new Date().toISOString() },
      { onConflict: "user_book_id" },
    );
  }, [userId, placements]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeMany = useCallback(async (userBookIds: string[], shelfId: string, row: ShelfRow) => {
    if (!userId || userBookIds.length === 0) return;
    let position = Object.values(placements).filter(p => p.shelf_id === shelfId && p.shelf_row === row).length;
    const now = new Date().toISOString();
    const rows = userBookIds.map(id => ({ user_id: userId, user_book_id: id, shelf_id: shelfId, shelf_row: row, position: position++, updated_at: now }));
    setPlacements(prev => { // ottimistico
      const n = { ...prev };
      rows.forEach(r => { n[r.user_book_id] = { user_book_id: r.user_book_id, shelf_id: shelfId, shelf_row: row, position: r.position }; });
      return n;
    });
    await sb.from("book_placements").upsert(rows, { onConflict: "user_book_id" });
  }, [userId, placements]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRowOrder = useCallback(async (shelfId: string, row: ShelfRow, orderedBookIds: string[]) => {
    if (!userId) return;
    const now = new Date().toISOString();
    const rows = orderedBookIds.map((id, i) => ({ user_id: userId, user_book_id: id, shelf_id: shelfId, shelf_row: row, position: i, updated_at: now }));
    setPlacements(prev => { // ottimistico
      const n = { ...prev };
      rows.forEach(r => { n[r.user_book_id] = { user_book_id: r.user_book_id, shelf_id: shelfId, shelf_row: row, position: r.position }; });
      return n;
    });
    await sb.from("book_placements").upsert(rows, { onConflict: "user_book_id" });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const unplaceBook = useCallback(async (userBookId: string) => {
    setPlacements(prev => { const n = { ...prev }; delete n[userBookId]; return n; }); // ottimistico
    await sb.from("book_placements").delete().eq("user_book_id", userBookId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    bookcases, placements, loading, reload,
    addBookcase, renameBookcase, deleteBookcase, moveBookcase, moveShelf,
    addShelf, addShelvesBulk, renameShelf, setShelfDepth, deleteShelf,
    placeBook, placeMany, setRowOrder, unplaceBook,
  };
}
