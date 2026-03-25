import { redirect } from "next/navigation";

export default function Home() {
  // PRD के हिसाब से main entrypoint `/dashboard` है.
  redirect("/dashboard");
}
