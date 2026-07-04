// Tipi generati manualmente per ora — puoi rigenerare con:
// npx supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          google_books_id: string | null;
          open_library_id: string | null;
          isbn_13: string | null;
          isbn_10: string | null;
          title: string;
          subtitle: string | null;
          authors: string[];
          publisher: string | null;
          published_year: number | null;
          language: string;
          page_count: number | null;
          genres: string[];
          cover_url: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          google_books_id?: string | null;
          open_library_id?: string | null;
          isbn_13?: string | null;
          isbn_10?: string | null;
          title: string;
          subtitle?: string | null;
          authors: string[];
          publisher?: string | null;
          published_year?: number | null;
          language?: string;
          page_count?: number | null;
          genres?: string[];
          cover_url?: string | null;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["books"]["Insert"]>;
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: "da_leggere" | "in_corso" | "letto" | "abbandonato" | "rileggendo";
          format: "ebook" | "cartaceo" | "audio";
          rating: number | null;
          review: string | null;
          is_favorite: boolean;
          started_at: string | null;
          finished_at: string | null;
          reading_time_h: number | null;
          reread_count: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status: "da_leggere" | "in_corso" | "letto" | "abbandonato" | "rileggendo";
          format?: "ebook" | "cartaceo" | "audio";
          rating?: number | null;
          review?: string | null;
          is_favorite?: boolean;
          started_at?: string | null;
          finished_at?: string | null;
          reading_time_h?: number | null;
          reread_count?: number;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_books"]["Insert"]>;
      };
      quotes: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          content: string;
          page_number: number | null;
          location: string | null;
          chapter: string | null;
          note: string | null;
          is_favorite: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          content: string;
          page_number?: number | null;
          location?: string | null;
          chapter?: string | null;
          note?: string | null;
          is_favorite?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
      };
    };
    Views: {
      user_library: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          google_books_id: string | null;
          open_library_id: string | null;
          isbn_13: string | null;
          isbn_10: string | null;
          title: string;
          subtitle: string | null;
          authors: string[];
          publisher: string | null;
          published_year: number | null;
          language: string;
          page_count: number | null;
          genres: string[];
          cover_url: string | null;
          description: string | null;
          status: "da_leggere" | "in_corso" | "letto" | "abbandonato" | "rileggendo";
          format: "ebook" | "cartaceo" | "audio";
          rating: number | null;
          review: string | null;
          is_favorite: boolean;
          started_at: string | null;
          finished_at: string | null;
          reading_time_h: number | null;
          reread_count: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: Record<string, never>;
  };
}
