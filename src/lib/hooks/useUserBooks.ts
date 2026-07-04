"use client";

import { useAuth } from "./useAuth";
import { useLibrary } from "./useBooks";
import { MY_BOOKS } from "@/lib/books-data";
import type { BookWithReading } from "@/types/book";

export function useUserBooks(): { books: BookWithReading[]; loading: boolean } {
  const { userId } = useAuth();
  const { data, isLoading } = useLibrary(userId);
  return {
    books: data ?? MY_BOOKS,
    loading: isLoading && !!userId,
  };
}
