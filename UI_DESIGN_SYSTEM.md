# UI_DESIGN_SYSTEM.md — Charte Visuelle SaaS

## Thème Sombre Officiel

Le projet utilise un thème sombre par défaut avec les variables CSS suivantes — **absolument à respecter** :

### Modeclair (`:root`)
- `--background`: `#f8f7fc`
- `--foreground`: `#1a1330`
- `--card`: `#ffffff`
- `--border`: `214.3 31.8% 85%`
- `--card-border`: `rgb(109 40 217 / 0.45)`
- `--primary`: `#7c3aed`
- `--primary-foreground`: `#ffffff`
- `--accent`: `#7c3aed`
- `--muted`: `#efedfb`
- `--muted-foreground`: `#5b5478`

### Mode sombre (`.dark`)
- `--background`: `#0b0716`
- `--foreground`: `#ece9f8`
- `--card`: `#151026`
- `--border`: `214.3 27.9% 20% / 0.8`
- `--card-border`: `rgb(139 92 246 / 0.55)`
- `--primary`: `#8b5cf6`
- `--primary-foreground`: `#ffffff`
- `--accent`: `#a78bfa`
- `--muted`: `#1d1735`
- `--muted-foreground`: `#a39bc7`

### Classes Tailwind obligatoires sur tous les composants de carte
- `bg-card` — Fond de la carte (doit mapper à `--card`)
- `border-card-border` — Bordure de la carte (doit mapper à `--card-border`)
- `text-card-foreground` — Texte dans la carte (doit mapper à `--card-foreground`)

**Interdiction** : Remplacer ces classes par des équivalents non prévus ou modifier les noms de variables CSS `--card`, `--border`, `--card-border`, `--foreground`, `--primary`, `--primary-foreground`, `--accent`, `--muted`, `--muted-foreground`.

## Agencement des Listes d'Événements

Les listes d'événements (cultes, tâches, etc.) doivent utiliser une grille responsive pleine largeur :

```html
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
```

**Pattern confirmé :** Grille qui s'adapte de 1 colonne sur mobile à 3 colonnes sur grand écran, avec un espacement constant de `gap-4`.

### Pattern d'onglets-pilules

Le module événementiel utilise un pattern d'onglets-pilules pour la navigation entre les vues :

- **Événements** (par défaut) – Affiche la grille de cultes
- **Tâches** – Affiche le déroulé des tâches associées
- **Configuration** – Affiche les paramètres de types de tâches

Chaque onglet est un bouton interactif avec :
- Fond `bg-primary` / texte `text-primary-foreground` lorsqu'actif
- Couleur `text-muted-foreground` lorsqu'inactif
- Effet hover `hover:bg-primary/90` ou `hover:bg-card/50`
- Icônes `lucide-react` distinctes pour chaque vue (CalendarDays, List, Settings2)
- Responsivité et cohérence visuelle avec le thème sombre

**Exemple d'implémentation** (référence : `CultesClient.tsx`) :
Les onglets sont implémentés comme des boutons `p-2 rounded-lg` dans une barre `flex items-center justify-between`, avec une classe conditionnelle qui applique le style actif/désactivé en fonction de l'état `ongletActif`.

Tous les boutons d'action sur les cartes de cultes/événements doivent suivre ce modèle visuel :

| Bouton | Icône | Classe / Style |
|--------|-------|----------------|
| **Aperçu** | Œil (`Eye`) | Bouton secondaire, icône œil |
| **Modifier** | Crayon (`Pencil`) | Bouton secondaire ou primary, icône crayon |
| **Supprimer** | Poubelle (`Trash`) | Bouton destructif (red), icône poubelle |

### Composants attendus

- `Aperçu` — Ouvre le `ProgrammePdfModal` ou imprime le PDF
- `Modifier` — Ouvre la modal de formulaire de modification (remplit les champs existants)
- `Supprimer` — Déclenche la suppression avec garde d'accés (`exigerAccesChemin`), affichage d'un dialogue de confirmation

Toutes les cartes contenant ces boutons doivent respecter l'agencement vertical : l'aperçu en haut, modifier au milieu, supprimer en bas, ou selon l'agencement défini par le composant parent, mais en utilisant toujours les icônes et les catégories spécifiées ci-dessus.