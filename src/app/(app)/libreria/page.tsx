import { redirect } from "next/navigation";

// La vista a scaffali è stata unificata dentro /libri (selettore Lista/Griglia/Scaffali).
export default function LibreriaPage() {
  redirect("/libri");
}
