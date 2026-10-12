"use client";

import { jsPDF } from "jspdf";

import { formatMontant } from "@/lib/finance";
import type { VersementRecu } from "@/types/rapport";

// ---------------------------------------------------------------------------
// Reçu PDF individuel — génération 100 % côté client via `jspdf`
// ---------------------------------------------------------------------------

export type DonneesRecu = {
  membreNom: string;
  membrePrenoms: string;
  membreTelephone: string;
  exerciceLibelle: string;
  exerciceAnnee: number;
  cotisationLibelle: string | null;
  classeLibelle: string | null;
  montantAttendu: number | null;
  totalVerse: number;
  resteAPayer: number | null;
  versements: VersementRecu[];
};

function formaterDate(dateISO: string): string {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return dateISO;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Génère et télécharge le reçu PDF d'un membre pour un exercice donné.
 * Appelé depuis le bouton « Reçu PDF » de chaque ligne du tableau.
 */
export function telechargerRecuPDF(donnees: DonneesRecu): void {
  const doc = new jsPDF();
  let y = 20;

  // En-tête.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Reçu de cotisation", 15, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(`${donnees.exerciceLibelle} — Église SaaS`, 15, y);
  doc.setTextColor(0);
  y += 12;

  // Bénéficiaire.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Membre", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${donnees.membrePrenoms} ${donnees.membreNom}`, 15, y);
  y += 6;
  doc.text(`Tél. : ${donnees.membreTelephone}`, 15, y);
  y += 10;

  // Synthèse.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Synthèse", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lignesSynthese = [
    `Cotisation : ${donnees.cotisationLibelle ?? "Toutes cotisations"}`,
    `Classe : ${donnees.classeLibelle ?? "—"}`,
    `Attendu : ${donnees.montantAttendu !== null ? formatMontant(donnees.montantAttendu) : "—"}`,
    `Total versé : ${formatMontant(donnees.totalVerse)}`,
    `Reste à payer : ${donnees.resteAPayer !== null ? formatMontant(donnees.resteAPayer) : "—"}`,
  ];
  for (const ligne of lignesSynthese) {
    doc.text(ligne, 15, y);
    y += 6;
  }
  y += 4;

  // Détail des versements.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Versements (${donnees.versements.length})`, 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (donnees.versements.length === 0) {
    doc.text("Aucun versement enregistré sur cette période.", 15, y);
    y += 6;
  } else {
    for (const versement of donnees.versements) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const ligne =
        `${formaterDate(versement.datePaiement)} · ${versement.typeLibelle} · ` +
        `${formatMontant(versement.montant)} (${versement.modePaiement})`;
      doc.text(ligne, 15, y);
      y += 6;
      if (versement.commentaire) {
        doc.setFontSize(9);
        doc.setTextColor(110);
        doc.text(`  ${versement.commentaire.slice(0, 90)}`, 15, y);
        doc.setTextColor(0);
        doc.setFontSize(10);
        y += 5;
      }
    }
  }

  // Pied de page.
  y += 6;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    `Édité le ${new Date().toLocaleDateString("fr-FR")} — Exercice ${donnees.exerciceAnnee} (document généré localement).`,
    15,
    y,
  );

  // Nom de fichier stable et explicite.
  const nomFichier =
    `recu-${donnees.exerciceAnnee}-${donnees.membreNom}-${donnees.membrePrenoms}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase() + ".pdf";

  doc.save(nomFichier);
}
