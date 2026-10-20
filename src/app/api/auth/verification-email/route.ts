import { NextResponse } from "next/server";

import { consignerAudit } from "@/lib/audit";
import { verifierJetonVerification } from "@/lib/jetons";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET /api/auth/verification-email?jeton=...
// Active le compte correspondant au jeton de confirmation (HMAC + expiration,
// voir src/lib/jetons.ts) puis redirige vers /login avec un message.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jeton = searchParams.get("jeton");
  const base = new URL(request.url).origin;

  const email = verifierJetonVerification(jeton);
  if (!email) {
    return NextResponse.redirect(
      new URL(
        "/login?message=" +
          encodeURIComponent("Lien de confirmation invalide ou expiré."),
        base,
      ),
    );
  }

  try {
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, nomComplet: true, actif: true },
    });

    if (utilisateur && !utilisateur.actif) {
      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { actif: true },
      });
      await consignerAudit({
        action: "CONFIRMATION_EMAIL",
        entite: "Utilisateur",
        entiteId: utilisateur.id,
        auteurNom: utilisateur.nomComplet,
        details: `Adresse e-mail confirmée pour « ${utilisateur.nomComplet} » (${email}) — compte activé.`,
      });
    }

    return NextResponse.redirect(
      new URL(
        "/login?message=" +
          encodeURIComponent(
            "Adresse e-mail confirmée ! Vous pouvez maintenant vous connecter.",
          ),
        base,
      ),
    );
  } catch (erreur) {
    console.error("Erreur serveur (confirmation d'e-mail) :", erreur);
    return NextResponse.redirect(
      new URL(
        "/login?message=" +
          encodeURIComponent(
            "Une erreur est survenue lors de la confirmation. Réessayez.",
          ),
        base,
      ),
    );
  }
}