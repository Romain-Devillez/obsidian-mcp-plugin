# Vault MCP — Rewrite propre

> Fork de jlevere/obsidian-mcp-plugin avec rewrite complet vers une architecture testée et explicite.

---

## Principes

1. **Explicite > Magique** : tout outil destructif a un nom qui le dit (delete, replace, append).
2. **Idempotent par défaut** : appeler 2× le même tool = même résultat (modulo timestamp).
3. **Frontmatter-aware** : tous les outils savent qu'un `.md` Obsidian peut commencer par YAML.
4. **Rollback systématique** : chaque opération destructive sauvegarde l'état précédent.
5. **Tests sur les golden cases** : 1 test par bug rencontré dans la vraie vie.
6. **API discoverable** : descriptions des tools claires pour qu'un LLM sache quand utiliser quoi.

---

## Surface API

### Lecture (inchangé vs upstream)

| Tool | Rôle |
|------|------|
| `vault-mcp-read-file` | Lire le contenu d'un fichier |
| `vault-mcp-list-files` | Lister files/folders avec depth |
| `vault-mcp-search-contents` | Recherche fuzzy contenu |
| `vault-mcp-search-filenames` | Recherche fuzzy filenames |

### Écriture (NOUVEAU — explicite)

| Tool | Rôle | Erreur si |
|------|------|-----------|
| `vault-mcp-create-file` | Créer un nouveau fichier | Le fichier existe déjà |
| `vault-mcp-replace-file` | Remplacer entièrement le contenu d'un fichier existant | Le fichier n'existe pas |
| `vault-mcp-append-to-file` | Append à la fin d'un fichier | Le fichier n'existe pas |
| `vault-mcp-prepend-to-file` | Préfixer (utile pour ajouter du frontmatter) | Le fichier n'existe pas |
| `vault-mcp-edit-file` | Diff-edit unifié frontmatter-aware | Diff ne s'applique pas |
| `vault-mcp-rollback-edit` | Restaurer la dernière version | Pas de rollback dispo |

### Gestion fichier (NOUVEAU)

| Tool | Rôle |
|------|------|
| `vault-mcp-delete-file` | Supprimer un fichier (avec rollback) |
| `vault-mcp-move-file` | Déplacer/renommer (préserve les liens via Obsidian API) |

### Frontmatter dédié (NOUVEAU)

| Tool | Rôle |
|------|------|
| `vault-mcp-read-frontmatter` | Lire le YAML structuré comme JSON |
| `vault-mcp-update-frontmatter` | Modifier des clés YAML sans toucher au corps |

> Les outils frontmatter résolvent l'usage très fréquent "ajouter un tag" / "marquer comme archived" sans risquer de corrompre le markdown.

---

## Bugs upstream → tests à passer

### Bug 1 : diff-edit confond YAML `---` avec headers de diff

**Test golden** : appliquer un diff qui supprime des lignes contenant un bloc YAML doit fonctionner.

**Fix** : ne plus se baser sur `line.startsWith("---")` pour détecter le multi-file. À la place :
- Compter exactement 2 lignes de header au début (`---` puis `+++`).
- Tout `---` après doit obligatoirement être suivi d'une ligne `+++` pour être considéré comme un nouveau fichier.
- Plus simple : refuser le format `--- file\n+++ file` sans fence et imposer plutôt un format avec préfixe explicite.

### Bug 2 : upsert silencieusement append sur fichier existant

**Test golden** : appeler `vault-mcp-upsert-file` 2× sur le même path crée un doublon.

**Fix** : on supprime carrément `upsert`. À la place :
- `create-file` (échoue si existe)
- `replace-file` (échoue si n'existe pas)
- `append-to-file` (échoue si n'existe pas)

L'agent choisit explicitement.

### Bug 3 : pas de delete

**Fix** : ajouter `vault-mcp-delete-file` avec rollback systématique.

### Bug 4 : pas de move/rename

**Fix** : ajouter `vault-mcp-move-file` qui utilise `app.fileManager.renameFile` (préserve les wikilinks Obsidian).

---

## Architecture code

```
src/
├── main.ts                      # Plugin entry point (inchangé)
├── managers/
│   ├── ServerManager.ts         # MCP server lifecycle (inchangé)
│   └── ToolManager.ts           # Registers all tools
├── tools/                       # Un fichier par tool, signature uniforme
│   ├── read-file.ts
│   ├── list-files.ts
│   ├── search-contents.ts
│   ├── search-filenames.ts
│   ├── create-file.ts           # NEW
│   ├── replace-file.ts          # NEW
│   ├── append-to-file.ts        # NEW
│   ├── prepend-to-file.ts       # NEW
│   ├── edit-file.ts             # ex diff-edit, fixé
│   ├── rollback-edit.ts
│   ├── delete-file.ts           # NEW
│   ├── move-file.ts             # NEW
│   ├── read-frontmatter.ts      # NEW
│   └── update-frontmatter.ts    # NEW
├── lib/
│   ├── frontmatter.ts           # NEW — split YAML / body, parse YAML
│   ├── diff.ts                  # NEW — applyDiff frontmatter-aware
│   ├── rollback-store.ts        # Centralisé (était dans helpers)
│   └── path-utils.ts
└── types.ts
```

---

## Compatibilité MCP

Pour ne pas casser brutalement la session en cours, on garde les anciens noms en deprecated avec un alias :
- `obsidian-mcp-upsert-file` → renvoie une erreur explicite "deprecated, use create-file or replace-file"
- `obsidian-mcp-diff-edit-file` → alias vers `vault-mcp-edit-file` (avec fix)
- `obsidian-mcp-rollback-edit` → alias vers `vault-mcp-rollback-edit`

Optionnel — à voir si besoin de migration douce.

---

## Roadmap

### Phase 1 — Fork + setup (15 min)
- [x] Identifier le repo upstream
- [ ] Créer le fork sur Romain-Devillez/obsidian-mcp-plugin
- [ ] Cloner le fork
- [ ] Vérifier que le build upstream passe localement

### Phase 2 — Tests golden (1h)
- [ ] Écrire les tests qui reproduisent les 4 bugs
- [ ] Confirmer que les tests échouent sur l'upstream actuel

### Phase 3 — Refactor + nouveaux tools (4-5h)
- [ ] Restructurer src/ vers la nouvelle architecture
- [ ] Implémenter les 5 nouveaux tools (create, replace, append, delete, move)
- [ ] Fixer le bug diff-edit YAML
- [ ] Ajouter les outils frontmatter

### Phase 4 — Tests + CI (1h)
- [ ] Tous les tests passent
- [ ] Lint propre
- [ ] GitHub Actions sur les PRs

### Phase 5 — Release + install BRAT (30 min)
- [ ] Tag v1.0.0 sur le fork
- [ ] manifest.json avec ID = `vault-mcp-romain` (pour ne pas conflicter)
- [ ] Documentation README adaptée
- [ ] Install via BRAT côté ton Obsidian

### Phase 6 — Migration (15 min)
- [ ] Désactiver l'ancien plugin
- [ ] Activer le nouveau
- [ ] Vérifier que la connexion MCP côté Computer fonctionne (même tunnel Cloudflare)
- [ ] Test smoke : create + replace + edit + delete + rollback

**Total estimé** : 7-8h. Réalisable en un week-end split en 2-3 sessions.

