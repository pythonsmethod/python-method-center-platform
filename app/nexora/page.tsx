import { redirect } from "next/navigation";
/** Public visual shell. All private data and AI endpoints enforce owner authentication. */
export default function NexoraPage(){redirect("/nexora-hub/index.html");}
