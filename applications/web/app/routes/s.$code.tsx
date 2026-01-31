import { redirect } from "react-router";
import type { Route } from "./+types/s.$code";
import { getOriginalUrlUseCase } from "@url-shortener/engine";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { code } = params;

  const url = await getOriginalUrlUseCase.execute(code, request.headers.get("user-agent") || undefined);

  if (!url) {
    throw new Response("Not Found", { status: 404 });
  }

  return redirect(url);
}
