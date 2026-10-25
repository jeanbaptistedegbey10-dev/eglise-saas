import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json(
      { error: "Le paramètre de requête « q » est requis." },
      { status: 400 },
    );
  }

  try {
    const url = new URL(NOMINATIM_BASE);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");
    url.searchParams.set("q", q);
    const acceptLanguage = searchParams.get("accept-language");
    if (acceptLanguage) url.searchParams.set("accept-language", acceptLanguage);

    // Requête serveur-à-serveur : le navigateur n'appelle jamais Nominatim
    // directement, donc plus d'erreur CORS / TypeError Failed to fetch.
    const reponse = await fetch(url.toString(), {
      headers: {
        "User-Agent": "eglise-saas/1.0",
        Accept: "application/json",
      },
    });
    if (!reponse.ok) {
      return NextResponse.json(
        { error: "Échec du géocodage auprès du service d'adresses." },
        { status: 502 },
      );
    }
    const donnees = await reponse.json();
    return NextResponse.json(donnees);
  } catch {
    return NextResponse.json(
      { error: "Échec du géocodage (réseau ou service indisponible)." },
      { status: 502 },
    );
  }
}