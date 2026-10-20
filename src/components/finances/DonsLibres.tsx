"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Wallet } from "lucide-react";

import { enregistrerDonLibreCaisse } from "@/actions/caisse";
import { initialCaisseFormState } from "@/types/caisse";
import { formatDateISO, formatMontant } from "@/lib/membre";
import type { CaisseResume, MouvementCaisseLigne } from "@/lib/caisse";

const INPUT =
  "flex h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

const MODES_PAIEMENT: { value: string; label: string }[] = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
];

type Props = {
  caisses: CaisseResume[];
  membres: { id: string; nom: string; prenoms: string }[];
  dons: MouvementCaisseLigne[];
  totalCumule: number;
};

export default function DonsLibres({ caisses, membres, dons, totalCumule }: Props) {
  const router = useRouter();

  const [etatDon, actionDon, donEnCours] = useActionState(
    (_e: unknown, fd: FormData) => enregistrerDonLibreCaisse(fd),
    initialCaisseFormState,
  );

  // Donateur : "membre" | "tiers"
  const [typeDonateur, setTypeDonateur] = useState<"membre" | "tiers">("membre");
  // Sélection membre
  const [membreSelectionne, setMembreSelectionne] = useState<{
    id: string;
    nom: string;
    prenoms: string;
  } | null>(null);
  // Recherche membre
  const [rechercheMembre, setRechercheMembre] = useState("");
  const [listeMembreOuverte, setListeMembreOuverte] = useState(false);
  const membreInputRef = useRef<HTMLInputElement>(null);
  // Nom tiers
  const [nomTiers, setNomTiers] = useState("");

  const membresFiltres = useMemo(
    () =>
      membres.filter(
        (m) =>
          `${m.prenoms} ${m.nom}`
            .toLowerCase()
            .includes(rechercheMembre.toLowerCase()),
      ),
    [membres, rechercheMembre],
  );

  const selectionnerMembre = useCallback(
    (m: { id: string; nom: string; prenoms: string }) => {
      setMembreSelectionne(m);
      setRechercheMembre(`${m.prenoms} ${m.nom}`);
      setListeMembreOuverte(false);
      if (membreInputRef.current) membreInputRef.current.blur();
    },
    [],
  );

  useEffect(() => {
    if (etatDon.success) {
      router.refresh();
    }
  }, [etatDon, router]);
  return (
    <section aria-label="Dons libres et offrandes" className="flex flex-col gap-4">
      <div className="rounded-xl border border-card-border bg-card shadow-sm p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" aria-hidden /> Nouveau don libre
            </h2>
            <p className="text-xs text-muted-foreground">
              Don spontané hors barème / cotisation, crédité sur une caisse.
            </p>
          </div>
        </div>
        <form action={actionDon} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">Montant (FCFA) *</label>
            <input
              name="montant"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0,00"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">Date effective *</label>
            <input
              name="dateMouvement"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-4">
            <label className="text-xs font-medium text-foreground">
              Caisse réceptrice *
            </label>
            <select name="caisseId" required className={INPUT}>
              <option value="">Sélectionner une caisse…</option>
              {caisses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({formatMontant(c.soldeActuel)} FCFA)
                </option>
              ))}
            </select>
          </div>

          {/* Donateur */}
          <div className="flex flex-col gap-2 sm:col-span-4">
            <label className="text-xs font-medium text-foreground">Donateur *</label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-card-border bg-background px-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="donateurType"
                  value="membre"
                  defaultChecked
                  onChange={() => setTypeDonateur("membre")}
                  className="form-radio"
                />
                Membre enregistré
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-card-border bg-background px-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="donateurType"
                  value="tiers"
                  onChange={() => setTypeDonateur("tiers")}
                  className="form-radio"
                />
                Donateur Anonyme / Tiers
              </label>
            </div>
          </div>

          {typeDonateur === "membre" ? (
            <div className="flex flex-col gap-1.5 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">
                Rechercher un membre
              </label>
              <div className="relative">
                <input
                  ref={membreInputRef}
                  name="rechercheMembre"
                  type="text"
                  value={rechercheMembre}
                  onChange={(e) => {
                    setRechercheMembre(e.target.value);
                    setListeMembreOuverte(true);
                  }}
                  onFocus={() => setListeMembreOuverte(true)}
                  placeholder="Nom du membre…"
                  className={INPUT}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                {membreSelectionne && (
                  <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-2 py-1.5 text-xs text-blue-700 border border-blue-100">
                    <User className="h-3.5 w-3.5" aria-hidden />
                    {membreSelectionne.prenoms} {membreSelectionne.nom}
                    <button
                      type="button"
                      onClick={() => {
                        setMembreSelectionne(null);
                        setRechercheMembre("");
                      }}
                      className="ml-2 p-0.5 text-blue-500 hover:text-blue-700"
                      aria-label="Retirer le membre"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {listeMembreOuverte && !membreSelectionne && membresFiltres.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-48 rounded-xl border border-card-border bg-card shadow-lg overflow-auto">
                    {membresFiltres.slice(0, 8).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectionnerMembre(m)}
                        className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted"
                      >
                        {m.prenoms} {m.nom}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input name="membreId" type="hidden" defaultValue={membreSelectionne?.id ?? ""} />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 sm:col-span-4">
              <label className="text-xs font-medium text-foreground">
                Nom du donateur / tiers *
              </label>
              <input
                name="donateurTiers"
                type="text"
                value={nomTiers}
                onChange={(e) => setNomTiers(e.target.value)}
                placeholder="Ex. Visiteur du culte"
                maxLength={150}
                className={INPUT}
              />
              <input name="membreId" type="hidden" defaultValue="" />
            </div>
          )}

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">Mode de paiement *</label>
            <select name="modePaiement" defaultValue="ESPECES" className={INPUT}>
              {MODES_PAIEMENT.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-foreground">
              N° de reçu / pièce justificative
            </label>
            <input
              name="numeroPiece"
              type="text"
              maxLength={80}
              placeholder="Référence (facultatif)"
              className={INPUT}
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-4">
            <label className="text-xs font-medium text-foreground">Motif</label>
            <input
              name="motif"
              type="text"
              maxLength={300}
              placeholder="Ex. Offrande du dimanche, don libre…"
              className={INPUT}
            />
          </div>
          {!etatDon.success && etatDon.message && (
            <p className="col-span-4 text-xs text-red-400">{etatDon.message}</p>
          )}
          {etatDon.success && (
            <p className="col-span-4 text-xs text-emerald-400">{etatDon.message}</p>
          )}
          <div className="col-span-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.refresh()}
              disabled={donEnCours}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={donEnCours}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {donEnCours ? "Enregistrement…" : "Enregistrer le don"}
            </button>
          </div>
        </form>
      </div>

      {/* Grand livre chronologique des dons libres */}
      <div className="rounded-xl border border-card-border bg-card shadow-sm">
        <div className="border-b border-card-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            Grand livre des dons libres
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Caisse</th>
                <th className="px-3 py-2">Donateur</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Montant (FCFA)</th>
                <th className="px-3 py-2">Pièce / Motif</th>
              </tr>
            </thead>
            <tbody>
              {dons.map((d) => (
                <tr key={d.id} className="border-t border-card-border">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateISO(d.dateMouvement)}
                  </td>
                  <td className="px-3 py-2 text-xs">{d.caisseNom ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {d.membreNom ?? d.donateurTiers ?? "Anonyme"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {d.modePaiement}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600">
                    +{formatMontant(d.montant)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {d.numeroPiece ?? d.motif}
                  </td>
                </tr>
              ))}
              {dons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun don libre enregistré pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-card-border font-semibold bg-muted/50">
                <td colSpan={4} className="px-3 py-2 text-right">
                  Total cumulé (exercice en cours)
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                  +{formatMontant(totalCumule)}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}
