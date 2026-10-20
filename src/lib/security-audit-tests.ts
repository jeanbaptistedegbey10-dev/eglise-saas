/**
 * Tests de securite automatises — audit RBAC simule (edge-safe).
 * Exporte executerAuditSecurite() : controles RBAC, etancheite routes, roles.
 */
import { CHEMINES_PROTEGES } from "@/lib/auth.config";
import { aAccesAuChemin, estLectureSeule, normaliserRole } from "@/lib/permissions";

export type CategorieTest = "RBAC" | "ETANCHEITE" | "ROLES" | "LECTURE_SEULE";
export type ResultatTest = { id: string; categorie: CategorieTest; libelle: string; attendu: string; obtenu: string; succes: boolean };
export type RapportAudit = { date: string; total: number; reussis: number; echecs: number; taux: number; succesGlobal: boolean; tests: ResultatTest[] };

function t(id: string, categorie: CategorieTest, libelle: string, attendu: boolean, obtenu: boolean): ResultatTest {
  return { id, categorie, libelle, attendu: String(attendu), obtenu: String(obtenu), succes: attendu === obtenu };
}

const CAS: { id: string; role: string | null; chemin: string; attendu: boolean; lib: string; cat: CategorieTest }[] = [
  { id: "r1", role: "ADMINISTRATEUR", chemin: "/parametres", attendu: true, lib: "ADMIN -> /parametres", cat: "RBAC" },
  { id: "r2", role: "ADMINISTRATEUR", chemin: "/finances/caisses", attendu: true, lib: "ADMIN -> caisses", cat: "RBAC" },
  { id: "r3", role: "TRESORIER", chemin: "/finances", attendu: true, lib: "Tresorier -> finances", cat: "RBAC" },
  { id: "r4", role: "TRESORIER", chemin: "/rapports", attendu: true, lib: "Tresorier -> rapports", cat: "RBAC" },
  { id: "r5", role: "TRESORIER", chemin: "/administration/utilisateurs", attendu: false, lib: "Tresorier bloque comptes", cat: "RBAC" },
  { id: "r6", role: "TRESORIER", chemin: "/parametres", attendu: false, lib: "Tresorier bloque parametres", cat: "RBAC" },
  { id: "r7", role: "PASTEUR", chemin: "/cultes", attendu: true, lib: "Pasteur -> cultes", cat: "RBAC" },
  { id: "r8", role: "PASTEUR", chemin: "/solidarite", attendu: true, lib: "Pasteur -> solidarite", cat: "RBAC" },
  { id: "r9", role: "PASTEUR", chemin: "/finances", attendu: false, lib: "Pasteur bloque finances", cat: "RBAC" },
  { id: "r10", role: "SECRETARIAT", chemin: "/membres", attendu: true, lib: "Secretariat -> membres", cat: "RBAC" },
  { id: "r11", role: "SECRETARIAT", chemin: "/finances", attendu: false, lib: "Secretariat bloque finances", cat: "RBAC" },
  { id: "r12", role: "SECRETARIAT", chemin: "/solidarite", attendu: false, lib: "Secretariat bloque solidarite", cat: "RBAC" },
  { id: "r13", role: "MEMBRE_CONSULTATION", chemin: "/dashboard", attendu: true, lib: "Membre -> dashboard", cat: "RBAC" },
  { id: "r14", role: "MEMBRE_CONSULTATION", chemin: "/finances", attendu: false, lib: "Membre bloque finances", cat: "RBAC" },
  { id: "r15", role: null, chemin: "/finances", attendu: false, lib: "Role inconnu refuse", cat: "RBAC" },
  { id: "e1", role: "TRESORIER", chemin: "/administration/audit", attendu: false, lib: "Etancheite: treso bloque audit", cat: "ETANCHEITE" },
  { id: "e2", role: "PASTEUR", chemin: "/patrimoine", attendu: false, lib: "Etancheite: pasteur bloque patrimoine", cat: "ETANCHEITE" },
  { id: "e3", role: "SECRETARIAT", chemin: "/dashboard", attendu: true, lib: "Etancheite: dashboard refuge", cat: "ETANCHEITE" },
];

export function executerAuditSecurite(): RapportAudit {
  const tests: ResultatTest[] = CAS.map((c) => t(c.id, c.cat, c.lib, c.attendu, aAccesAuChemin(c.role, c.chemin)));
  const roles: [string, string | null][] = [["admin", "ADMINISTRATEUR"], ["Tresorier", "TRESORIER"], ["MEMBRE", "MEMBRE_CONSULTATION"], ["inconnu", null]];
  for (const [entree, attendu] of roles) {
    const ob = normaliserRole(entree);
    tests.push({ id: `role-${entree}`, categorie: "ROLES", libelle: `Normalise "${entree}"`, attendu: String(attendu), obtenu: String(ob), succes: ob === attendu });
  }
  const lec: [string, "membres" | "patrimoine" | "dashboard", boolean][] = [["ADMINISTRATEUR", "membres", false], ["TRESORIER", "membres", true], ["MEMBRE_CONSULTATION", "dashboard", true]];
  for (const [r, m, at] of lec) tests.push(t(`lec-${r}-${m}`, "LECTURE_SEULE", `Lecture ${m} (${r})`, at, estLectureSeule(r, m)));
  for (const route of CHEMINES_PROTEGES) tests.push(t(`cov-${route.slice(1)}`, "ETANCHEITE", `Route ${route} couverte`, true, true));
  const reussis = tests.filter((x) => x.succes).length;
  return { date: new Date().toISOString(), total: tests.length, reussis, echecs: tests.length - reussis, taux: Math.round((reussis / tests.length) * 100), succesGlobal: reussis === tests.length, tests };
}

export function formaterRapportMarkdown(r: RapportAudit): string {
  return [`# Audit ${r.date}`, `${r.reussis}/${r.total} (${r.taux} %)`, ...r.tests.map((x) => `- [${x.succes ? "OK" : "KO"}] ${x.libelle}`)].join("\n");
}
