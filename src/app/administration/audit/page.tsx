import { ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { JournalAuditTable } from "./JournalAuditTable";

export const metadata = {
  title: "Journal d'Audit & Traçabilité",
  description: "Historique des actions administratives (création, modification, suppression, clôture, virement).",
};

export default async function AuditPage() {
  const entrees = await prisma.journalAudit.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Journal d'Audit</h1>
          <p className="text-sm text-muted-foreground">
            Traçabilité des actions : qui a fait quoi, quand et sur quelle entité.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          <span>Journal d'audit &amp; traçabilité</span>
        </div>
      </div>

      <JournalAuditTable entrees={entrees} />
    </div>
  );
}
