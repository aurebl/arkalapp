# Mettre arkalapp.com en ligne (gratuitement)

## Quel hébergeur, et pourquoi : GitHub Pages

| | GitHub Pages | Cloudflare Pages | Netlify |
|---|---|---|---|
| Prix | Gratuit, sans limite gênante pour un site vitrine | Gratuit | Gratuit, mais avec un quota mensuel de « crédits » |
| Le DNS reste chez OVH | **Oui** | Non : il faut confier le domaine entier à Cloudflare | Oui |
| HTTPS automatique | Oui | Oui | Oui |
| `www` → `arkalapp.com` automatique | **Oui** | À configurer | Oui |
| Adresses sans `.html` (`/terms`) | Oui | Oui | Oui |

**On choisit GitHub Pages** : c'est gratuit et durable, tes réglages DNS restent chez OVH (donc **ton adresse mail hello@arkalapp.com n'est pas touchée**), et le site se reconstruit tout seul à chaque modification.

Seule condition : le dépôt GitHub doit être **public** (le code du site sera visible, ce qui ne pose pas de problème pour un site vitrine).

Dans ce guide, ton identifiant GitHub est **aurebl**. Remplace-le si tu en utilises un autre.

---

## Étape 1 — Envoyer le site sur GitHub

1. Crée un compte sur https://github.com si ce n'est pas déjà fait.
2. Installe **GitHub Desktop** (https://desktop.github.com) et connecte-toi avec ton compte.
3. Dans GitHub Desktop : menu **File → Add Local Repository…**, choisis le dossier `arkalapp`.
   Il propose de « create a repository » : clique dessus, laisse le nom `arkalapp`, puis **Create Repository**.
4. Clique sur **Publish repository** (en haut). **Décoche « Keep this code private »**, puis **Publish Repository**.

> Si tu préfères, je peux faire cette étape à ta place depuis le terminal : demande-le-moi.

## Étape 2 — Activer GitHub Pages

1. Sur https://github.com/aurebl/arkalapp, clique sur **Settings** (onglet en haut à droite du dépôt).
2. Dans le menu de gauche : **Pages**.
3. Dans **Build and deployment → Source**, choisis **GitHub Actions**.
4. Va dans l'onglet **Actions** du dépôt : un travail « Publier le site » tourne. Attends qu'il devienne vert (≈ 1 minute). S'il n'a pas démarré, clique sur « Publier le site » puis **Run workflow**.

> L'adresse provisoire `aurebl.github.io/arkalapp` s'affiche mal (styles manquants) : c'est normal, le site est prévu pour être à la racine d'un domaine. Tout sera correct sur arkalapp.com.

## Étape 3 — Vérifier ton domaine auprès de GitHub (recommandé, sécurité)

Cela empêche quelqu'un d'autre d'utiliser ton domaine sur GitHub.

1. Clique sur ta photo de profil (en haut à droite) → **Settings** → menu de gauche **Pages** → **Add a domain**.
2. Tape `arkalapp.com` → **Add domain**.
3. GitHub affiche un enregistrement **TXT** à créer, du type :
   - nom : `_github-pages-challenge-aurebl`
   - valeur : une suite de lettres et de chiffres
4. Garde cette page ouverte : tu ajouteras ce TXT chez OVH à l'étape suivante, puis tu reviendras cliquer sur **Verify**.

## Étape 4 — Configurer le DNS chez OVH

1. Connecte-toi sur https://www.ovh.com/manager.
2. En haut : **Web Cloud**. Dans le menu de gauche : **Noms de domaine** → **arkalapp.com**.
3. Ouvre l'onglet **Zone DNS**.

### 4a. Supprimer les anciennes entrées du site

Supprime (icône **…** au bout de la ligne → **Supprimer l'entrée**) **uniquement** :
- les lignes de type **A** dont le « Domaine » est exactement `arkalapp.com.` (souvent `213.186.33.5`, la page d'attente OVH) ;
- les lignes de type **AAAA** sur `arkalapp.com.` s'il y en a ;
- les lignes de type **A**, **AAAA** ou **CNAME** dont le domaine est `www.arkalapp.com.`.

⚠️ **Ne touche pas** aux lignes **MX**, ni aux lignes **TXT** qui contiennent `v=spf1` ou `dkim` : elles servent à tes e-mails.

> Si tu as une « Redirection » configurée dans l'onglet **Redirection** d'OVH pour ce domaine, supprime-la aussi.

### 4b. Ajouter les nouvelles entrées

Clique sur **Ajouter une entrée** pour chaque ligne ci-dessous. Laisse le **sous-domaine vide** quand c'est indiqué, et le TTL par défaut.

| Type | Sous-domaine | Cible |
|---|---|---|
| A | *(vide)* | `185.199.108.153` |
| A | *(vide)* | `185.199.109.153` |
| A | *(vide)* | `185.199.110.153` |
| A | *(vide)* | `185.199.111.153` |
| AAAA | *(vide)* | `2606:50c0:8000::153` |
| AAAA | *(vide)* | `2606:50c0:8001::153` |
| AAAA | *(vide)* | `2606:50c0:8002::153` |
| AAAA | *(vide)* | `2606:50c0:8003::153` |
| CNAME | `www` | `aurebl.github.io.` (avec le point final) |
| TXT | `_github-pages-challenge-aurebl` | la valeur donnée par GitHub à l'étape 3 |

À chaque ajout : **Suivant**, puis **Valider**.

## Étape 5 — Brancher le domaine sur le site

1. Retourne dans **Settings → Pages** du dépôt `arkalapp`.
2. Dans **Custom domain**, tape `arkalapp.com` et clique sur **Save**.
3. GitHub vérifie le DNS (« DNS check in progress »). Quand c'est bon, il affiche **DNS check successful**.
4. Reviens sur la page de l'étape 3 et clique sur **Verify** pour le TXT.

## Étape 6 — Activer le HTTPS

Toujours dans **Settings → Pages** : dès que la case **Enforce HTTPS** est cliquable, coche-la.
Elle peut rester grisée de quelques minutes à 24 heures, le temps que GitHub obtienne le certificat de sécurité. Recharge la page de temps en temps.

## Étape 7 — `www.arkalapp.com` → `arkalapp.com`

Rien à faire : grâce à l'entrée CNAME `www` et au domaine `arkalapp.com` saisi à l'étape 5, GitHub redirige automatiquement `www.arkalapp.com` vers `arkalapp.com`.

---

## Combien de temps ça prend ?

- Le site est publié sur GitHub en **1 à 2 minutes**.
- Les changements DNS chez OVH prennent en général **1 heure**, parfois jusqu'à **24 heures** (rarement 48 h).
- Le certificat HTTPS arrive ensuite, en général en **moins d'une heure**.

## Comment vérifier que tout fonctionne

1. Sur https://dnschecker.org, cherche `arkalapp.com` (type **A**) : les 4 adresses `185.199.10x.153` doivent apparaître un peu partout dans le monde.
2. Ouvre ces adresses, avec le cadenas 🔒 dans la barre d'adresse :
   - https://arkalapp.com
   - https://arkalapp.com/fr/
   - https://arkalapp.com/terms et https://arkalapp.com/fr/conditions
   - https://arkalapp.com/privacy et https://arkalapp.com/fr/confidentialite
3. Tape `www.arkalapp.com` : tu dois arriver sur `https://arkalapp.com`.
4. Teste le lien « Français / English » en bas de chaque page.
5. Aperçu de partage : colle `https://arkalapp.com` sur https://www.opengraph.xyz pour voir l'image et le texte affichés sur les réseaux.

---

## Mettre le site à jour plus tard

**Le plus simple, directement sur github.com** (aucun logiciel) :
1. Ouvre le fichier à modifier dans le dépôt (par exemple `src/site.config.mjs` pour les liens App Store / Google Play, ou `src/content/terms.md`).
2. Clique sur l'icône **crayon** ✏️, fais ta modification, puis **Commit changes…** → **Commit changes**.
3. Le site se reconstruit et se met à jour tout seul en 1 à 2 minutes (suivi dans l'onglet **Actions**).

**Avec GitHub Desktop** (pour remplacer des images, par exemple les icônes dans `src/public/`) :
1. Modifie ou remplace les fichiers dans le dossier `arkalapp` sur ton ordinateur.
2. Dans GitHub Desktop : écris un petit résumé en bas à gauche, clique sur **Commit to main**, puis **Push origin**.

**Quand l'app sera publiée**, remplace dans `src/site.config.mjs` :

```js
export const STORE_LINKS = {
  appStore: '#app-store',     // ← lien App Store
  googlePlay: '#google-play', // ← lien Google Play
};
```
