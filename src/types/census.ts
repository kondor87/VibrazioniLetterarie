// Censimento fisico della libreria: Librerie → Ripiani → file Davanti/Centro/Dietro
export type ShelfRow = "davanti" | "centro" | "dietro";

export interface Shelf {
  id: string;
  bookcase_id: string;
  name: string;
  sort_order: number;
  row_depth: number; // 2 = davanti/dietro · 3 = davanti/centro/dietro
}

export interface Bookcase {
  id: string;
  name: string;
  sort_order: number;
  shelves: Shelf[];
}

export interface Placement {
  user_book_id: string;
  shelf_id: string;
  shelf_row: ShelfRow;
  position: number;
}

export const ROW_LABEL: Record<ShelfRow, string> = {
  dietro: "Dietro",
  centro: "Centro",
  davanti: "Davanti",
};

// File da mostrare per un ripiano, dall'alto (dietro) al basso (davanti)
export function rowsFor(depth: number): ShelfRow[] {
  if (depth >= 3) return ["dietro", "centro", "davanti"];
  if (depth <= 1) return ["davanti"];
  return ["dietro", "davanti"];
}
