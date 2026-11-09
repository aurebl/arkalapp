# Site vitrine Arkal — arkalapp.com

Site statique (HTML, CSS, JavaScript), sans framework ni dépendance.

| Page | Anglais | Français |
|---|---|---|
| Accueil | `/` | `/fr/` |
| Conditions | `/terms` | `/fr/conditions` |
| Confidentialité | `/privacy` | `/fr/confidentialite` |

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Les liens App Store / Google Play | `src/site.config.mjs` → `STORE_LINKS` |
| Les textes de l'accueil, les titres et descriptions des pages | `src/site.config.mjs` → `TEXT` |
| Les conditions d'utilisation | `src/content/terms.md` |
| La politique de confidentialité | `src/content/privacy-policy.md` |
| Le style (couleurs, tailles, boutons) | `src/assets/site.css` |
| L'orbe et son apparition en fondu | `src/assets/home.js` |
| Le favicon et l'icône de l'app | `src/public/` (voir ci-dessous) |

Les fichiers `.md` contiennent l'anglais (section `## English`) puis le français (section `## Français`) : le site les sépare automatiquement.

### Icônes

Les icônes sont générées à partir de l'icône de l'app (`src/app-icon.jpg`, 1024 × 1024). Pour la changer, remplace ces fichiers en gardant **les mêmes noms et tailles** :

| Fichier | Taille | Usage |
|---|---|---|
| `src/public/favicon.png` | 48 × 48 | onglet du navigateur |
| `src/public/apple-touch-icon.png` | 180 × 180 | raccourci sur l'écran d'accueil iPhone |
| `src/public/icon-192.png`, `icon-512.png` | 192 et 512 | Android, onglet en haute définition |
| `src/public/og-image-en.jpg`, `og-image-fr.jpg` | 2000 × 1050 | aperçu lors d'un partage (WhatsApp, LinkedIn…), une image par langue |

## Prévisualiser sur ton ordinateur

Il faut [Node.js](https://nodejs.org) (version 18 ou plus). Dans un terminal, depuis ce dossier :

```bash
npm start
```

Puis ouvre http://localhost:4321.

## Générer le site

```bash
node src/build.mjs
```

Le site prêt à publier est créé dans `site/`. Sur GitHub, c'est fait automatiquement à chaque envoi (`.github/workflows/deploy.yml`).

Mise en ligne : voir [MISE-EN-LIGNE.md](MISE-EN-LIGNE.md).
