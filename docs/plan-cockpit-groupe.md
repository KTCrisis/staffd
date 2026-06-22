# Plan : staffd vers cockpit de groupe connectd

Document de conception. Rédigé le 2026-06-22. Statut : en design, rien décidé côté code.

## 1. Objectif

Faire évoluer staffd, aujourd'hui un PSA mono-société, vers un outil à deux usages sur la même base de données :

1. **PSA opérationnel** : staffing, missions, TJM, marge, timesheets, factures (le métier actuel).
2. **Suivi financier de groupe** : graphe d'entités (holding, filiales, SASU des fondateurs), refacturation intercompany, remontée mère-fille, simulation de dividendes.

Cible : les 4 fondateurs de connectd (Seb ~50 %, Marc / Yohann / Xavier ~16,67 % chacun). Le projet va jusqu'au bout (phases 0 à 5).

**Périmètre simplifié au lancement** : deux types de contrat seulement (freelance, CDI). Le CDD est reporté (prime de précarité et date de fin non modélisées pour l'instant).

## 2. Principe directeur

Une seule colonne vertébrale (le graphe d'entités), lue sous deux lentilles et selon deux scopes de vue :

* **Lentilles** : opérationnelle (qui staffe qui, à quelle marge) et financière (CA par entité, résultat, dividendes).
* **Vues** : vue fondateur (centrée associé, capital) et vue filiale (centrée entité, opérations).

Tant que les deux lentilles partagent le graphe, c'est un produit à deux vues. Le jour où elles divergent, ce sont deux outils scotchés. C'est la seule discipline à tenir.

**Hors périmètre, définitivement** : la comptabilité légale (TVA déclarative, écritures, bilan, liasse fiscale) reste du ressort de l'expert-comptable. staffd est un cockpit de pilotage et de simulation, pas un grand livre légal.

## 3. État du code existant (vérifié 2026-06-22)

Ce qui est déjà en place et réutilisable :

* `companies` porte un `billing_settings` par société (SIRET, TVA, IBAN). Chaque SASU est donc déjà une entité capable d'émettre ses propres factures.
* Entité `Invoice` complète (`components/invoices/`) : `status (draft|sent|paid|overdue|cancelled)`, TVA (`subtotal`, `tva_rate`, `tva_amount`, `total_ttc`), `source_type (timesheet|project|manual)`, période, échéance, retard.
* Modules `financials`, `profitability`, `bids` présents.
* Vues SQL qui calculent les marges : `project_financials`, `consultant_profitability`, `consultant_occupancy`.
* RLS multi-tenant par `company_id` ; JWT `app_metadata` (`user_role`, `company_id`) ; `middleware.ts` vérifie la session via `getUser()` (server-side).
* Rôles : `super_admin > admin > manager > consultant | freelance > viewer`.
* `ContractType = 'employee' | 'freelance'` + champs de coût (`salaireAnnuelBrut`, `chargesPct` défaut 42 %, `joursTravailles` défaut 218).

Deux manques structurels :

* **Le schéma n'est pas versionné.** Aucune migration, pas de dossier `supabase/`, pas de DDL dans le repo. Tables, vues et policies RLS vivent uniquement dans le dashboard Supabase. Bloquant pour toute évolution structurelle.
* **Aucun test.**

## 4. Modèle de données cible

### 4.1 Le graphe : arbre opérationnel et DAG de capital, séparés

Point d'architecture central : la détention n'est pas un arbre. Une SASU peut investir dans la holding **et** directement dans une filiale (double exposition). Il faut donc deux notions distinctes, jamais confondues.

| Notion | Sert à | Structure |
|---|---|---|
| `companies.parent_company_id` | hiérarchie opérationnelle (quelle filiale relève de quelle holding) | arbre, un parent |
| table `ownership(owner_company_id, owned_company_id, pct)` | capital et dividendes | DAG, arêtes multiples pondérées |

Les dividendes se calculent en parcourant les arêtes `ownership`, jamais `parent_company_id`. Modéliser les dividendes sur l'arbre rendrait la double exposition invisible et fausserait le calcul.

Extensions de `companies` :

```
companies
  + entity_type      : 'holding' | 'filiale' | 'sasu'   (défaut conserve le comportement actuel)
  + parent_company_id : uuid null  (arbre opérationnel)
  + group_id          : uuid       (scoping RLS au niveau groupe)
```

Nouvelle table :

```
ownership
  owner_company_id : uuid   (le détenteur : une SASU, ou la holding)
  owned_company_id : uuid   (le détenu : une filiale, ou la holding)
  pct              : numeric (quote-part de capital)
```

### 4.2 Contraintes d'intégrité (à poser dès le schéma)

1. **DAG acyclique.** Une SASU ne peut être détenue par une entité qu'elle détient (sinon boucle infinie de dividendes). À contraindre côté application et, si possible, par trigger.
2. **Cap table complète.** Pour chaque entité détenue, somme des `pct` entrants = 100 %, **pool d'equity consultants inclus** (les filiales ouvrent leur capital aux consultants pour les fidéliser : c'est un actionnaire-puits réel, pas un oubli).
3. **Seuil mère-fille.** La remontée à 95 % exonérée suppose une détention >= 5 %. La simulation doit flaguer les participations éligibles. À valider avec l'expert-comptable (au même titre que l'IP box art. 238 sur les licences logicielles).

### 4.3 Contrats

```
contract_type : 'employee' | 'freelance'   (inchangé pour l'instant)
```

On garde les deux valeurs existantes. Pas de renommage `employee` vers `cdi` au lancement (décision Marc 2026-06-22), pour ne pas toucher la colonne ni les données.

* **employee** : coût paie = `salaireAnnuelBrut * (1 + chargesPct) / joursTravailles` (déjà codé).
* **freelance** : pas un coût de paie. Le freelance facture la filiale. C'est une charge fournisseur dans le P&L de la filiale, gérée par la facture intercompany (voir 4.4). Le freelance apparaît donc deux fois : émetteur (son CA) et charge (résultat de la filiale).
* **CDD** : reporté. Quand il reviendra : un renommage `employee` vers `cdi` plus une valeur `cdd` avec date de fin et coefficient de précarité (~10 %) sur le coût.

### 4.4 Facture intercompany

```
invoices
  + issuer_company_id : uuid  (l'émetteur, entité interne ou société de l'utilisateur)
  + payer_company_id  : uuid null  (le payeur, si entité interne ; sinon client externe via client_id)
  + commission_rate   : numeric null  (commission de structure selon l'apporteur)
```

Refacturation = facture dont le payeur est une entité interne. La commission de structure est différenciée selon l'apporteur de la mission : ~10 % si le fondateur apporte lui-même, ~20-30 % si connectd apporte. Le fondateur garde ~80 % net dans sa SASU.

Note : dès aujourd'hui, sans cette extension, la refacturation fonctionne en modélisant la holding comme un `Client`. L'extension `payer_company_id` ne fait que rendre la relation propre et interrogeable.

## 5. Les deux vues : matrice RLS à deux axes

La RLS actuelle isole par `company_id`. Le groupe impose une isolation par `group_id`, avec un scoping fin selon deux axes de permission indépendants :

| Axe | Source | Donne le droit de |
|---|---|---|
| **capital** (détention) | arêtes `ownership` du fondateur | **lire** le roll-up financier d'une entité |
| **opérationnel** (rôle) | `user_role` dans l'entité | **gérer** le staffing de cette entité |

Conséquence :

* **Vue fondateur** : un associé voit sa SASU en entier, plus ses participations (holding et filiales en direct), ses remontées de dividendes et ses missions facturées. Lecture sur le consolidé qu'il ne pilote pas.
* **Vue filiale** : opérationnelle et P&L, centrée sur une entité. Staffing (freelance/CDI), CA, coûts, résultat. Écriture sur les missions par ceux qui la pilotent.

Un fondateur lit le résultat d'une filiale qu'il ne gère pas (parce qu'il en détient une part) sans en toucher les timesheets. C'est précisément la séparation lecture-capital / écriture-opérations.

**Vigilance sécurité** : cette phase rouvre la couche RLS récemment durcie (commits JWT/tenant-scoping, `getUser()` server-side, correctifs data layer). À traiter au scalpel, avec revue dédiée et tests RLS.

## 6. Calculs

### 6.1 Salaire proposable (inversion de la marge)

Inversion exacte de la vue `consultant_profitability`. On entre le TJM vendu de la mission et la marge cible, on sort le brut annuel maximum à proposer :

```
revenu_jour_dispo = tjmVendu * (1 - margeCible)
brut_max          = revenu_jour_dispo * joursTravailles / (1 + chargesPct)
```

Marge cible par défaut stockée dans `hr_settings` (déjà présent). Aucun changement structurel : c'est le premier incrément, à valeur immédiate.

### 6.2 Roll-up de dividendes (DAG, tri topologique)

```
1. trier les entités en ordre topologique sur le DAG ownership (filiales avant holding avant SASU)
2. pour chaque entite E :
     distribuable(E) = resultat_propre(E) + somme des dividendes recus par E
     dividende_sortant(E) = distribuable(E) * taux_de_distribution(E)
     pour chaque arete sortante (E -> owner, pct) :
         pousser dividende_sortant(E) * pct vers owner
3. les SASU sont des puits (le fondateur sort en salaire ou dividende)
```

Pas de double comptage : les parts qui montent à la holding et les parts qui descendent en direct au fondateur sont des chemins disjoints du DAG. Le `taux_de_distribution` matérialise la politique de distribution (sujet ouvert du pacte d'associés, à fixer post-10/07).

### 6.3 KPI du jalon 3 ans

Le vrai moteur du levier capital n'est pas le CA mais la **marge sur consultants salariés**. KPI dédié : ratio de marge générée par les CDI productifs sur la marge totale, par entité et consolidée. Répond à la question posée pour le jalon des 3 ans : connectd produit-il de la marge sur salariés, ou seulement de la régie entre associés ?

## 7. Plan par phases

| Phase | Contenu | Schéma | Risque | Effort |
|---|---|---|---|---|
| **0. Versionner** | `supabase db pull`, dossier `supabase/migrations/`, commit du baseline (tables, vues, RPC, RLS). Harnais de test minimal. | lecture | nul | S |
| **1. Salaire proposable** | Inversion `tjmCoutReel`, simulateur d'embauche isolé. | non | nul | S |
| **2. Graphe d'entités** | `companies` étendu, table `ownership` (DAG), `group_id`, RLS à deux axes. `contract_type` inchangé. | structurel | élevé | L |
| **3. Facture intercompany** | `issuer_company_id`, `payer_company_id`, commission de structure. | additif | moyen | M |
| **4. Conso + simu dividendes** | Vues `group_financials`, `dividend_simulation` (roll-up topologique), flags mère-fille, KPI jalon-3-ans. | vues | élevé | L |
| **5. Cockpit fondateur** | Dashboard par associé (CA SASU, participation, résultat groupe, simu) + commandes IA `/group`, `/dividende`. | non | moyen | M |

## 8. Séquencement et jalons

* **0, 1, 3** d'abord : livrables sans risque structurel. La phase 3 seule (sans le graphe) permet déjà de suivre le CA de la SASU et la refacturation, en modélisant la holding comme `Client`.
* **2, 4, 5** ensuite : le vrai chantier de groupe, à mener quand la transition de septembre 2026 libère du temps.
* Décision d'ambition affinée à la lumière de l'atelier fondateurs du **10 juillet 2026** (commission de structure et politique de distribution seront alors cadrées).

## 9. Phase 0 détaillée (prête à lancer)

Prérequis : Supabase CLI installé, accès au projet Supabase.

```
# 1. lier le repo au projet Supabase distant
supabase login
supabase link --project-ref <PROJECT_REF>

# 2. extraire le schéma distant dans des migrations versionnées
supabase db pull        # genere supabase/migrations/<timestamp>_remote_schema.sql

# 3. extraire aussi les policies RLS et les definitions de vues/RPC
#    (db pull capture le DDL ; verifier que les vues project_financials,
#     consultant_profitability, consultant_occupancy et les RPC sont incluses)

# 4. commit du baseline
git checkout -b feat/schema-baseline
git add supabase/
git commit -m "chore: version Supabase schema baseline (tables, views, RPC, RLS)"
```

Ensuite seulement : ouvrir les branches `feat/salaire-proposable` (phase 1), puis le chantier structurel.

Harnais de test minimal à poser dans la foulée : au moins un test RLS (un utilisateur d'une entité ne lit pas les données d'une autre hors de son `group_id`) et un test du calcul de salaire proposable.

## 10. Décisions ouvertes (pour mémoire)

* Taux de commission de structure : flat ou différencié selon l'apporteur.
* Politique de distribution (`taux_de_distribution`) : plancher conditionnel, dérogation à majorité qualifiée.
* Pool d'equity consultants : prix d'entrée, taille réservée.
* Éligibilité mère-fille des participations directes en filiale : à valider avec l'expert-comptable.

Ces décisions relèvent du pacte d'associés et de l'atelier du 10/07, pas du code. Le modèle ci-dessus les accueille comme des paramètres, pas comme des hypothèses figées.
