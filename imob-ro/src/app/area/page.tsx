import { redirect } from "next/navigation";

/**
 * /area is linked from a few internal UIs; the city/zone hub lives at /bucuresti and /zona/[slug].
 */
export default function AreaIndexPage() {
  redirect("/bucuresti");
}
