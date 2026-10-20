import { useState } from "react";

/**
 * Hook partagé : rejoue une fonction de réinitialisation pendant le rendu
 * quand une dépendance change (résultat d'un `useActionState`, par exemple).
 *
 * Appeler `setState` pendant le rendu est le pattern préconisé par React 19
 * pour remettre un formulaire à zéro après une action réussie, car cela
 * évite le rendu intermédiaire provoqué par un `useEffect` qui appelle
 * `setState` après le rendu.
 *
 * @param dependance Valeur surveillée (état retourné par `useActionState`).
 * @param reinitialiser Fonction appelée pendant le rendu quand `dependance` change.
 */
export function useResetAuChangement<T>(
  dependance: T,
  reinitialiser: () => void,
): void {
  const [precedente, setPrecedente] = useState(dependance);
  if (dependance !== precedente) {
    setPrecedente(dependance);
    reinitialiser();
  }
}