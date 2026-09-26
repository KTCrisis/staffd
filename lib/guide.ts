/**
 * lib/guide.ts
 * In-app user guide (/guide): what each page does today, what it does not do
 * yet, and how a month runs from deal to invoice. Written for any tenant: no
 * company name here, the page injects the tenant's own. French only for now.
 *
 * Keep it in step with the code: a limit lifted in a release comes out of
 * `notYet` in the same commit.
 */

export interface GuidePage {
  title:  string
  route:  string
  who:    string
  does:   string[]
  notYet: string[]
}

export interface GuideGroup {
  id:    string
  title: string
  pages: GuidePage[]
}

export const GUIDE_BASICS: Array<{ title: string; text: string }> = [
  {
    title: 'Se connecter',
    text:  "Un lien d'activation, valable une heure, généré par un admin depuis votre fiche. Vous choisissez ensuite votre mot de passe. Mot de passe perdu : demandez un nouveau lien à quelqu'un dont le rôle est au-dessus du vôtre.",
  },
  {
    title: 'Les rôles',
    text:  "Admin voit tout, y compris les salaires et les marges. Manager gère son équipe, valide CRA et congés. Consultant et freelance voient leur fiche, leurs CRA et leurs congés.",
  },
  {
    title: 'Confidentialité',
    text:  "Salaires, coûts, honoraires et marges ne sont lisibles que par les admins et les managers, y compris par l'API. Un consultant ne voit que l'annuaire de ses collègues, sans montant.",
  },
  {
    title: 'La version',
    text:  "En bas du menu : version, commit et date du build. Pour signaler un problème, indiquez le commit affiché.",
  },
]

export const GUIDE_FLOW: Array<{ step: string; detail: string }> = [
  { step: 'Une affaire entre dans le pipeline',        detail: 'Affaires : donneur d’ordre, client final, régie ou forfait, TJM et jours estimés, probabilité.' },
  { step: "L'affaire est gagnée, le projet se crée",   detail: 'Marquer « gagnée » crée le projet avec son mode (régie ou forfait) et son client final.' },
  { step: 'On affecte les consultants',                detail: 'Projets ou Staffing : qui, sur quel projet, à quel pourcentage et sur quelle période.' },
  { step: 'Chacun saisit son CRA',                     detail: 'CRA : une demi-journée ou une journée par jour ouvré, puis soumission en fin de semaine ou de mois.' },
  { step: 'Le manager ou un admin valide',             detail: 'Un jour validé est verrouillé ; il ne se modifie plus sans réouverture.' },
  { step: 'La facture se génère depuis les CRA validés', detail: 'Factures : import des jours du mois au TJM vendu, ou montant du forfait ; TVA et délai de paiement tirés des réglages.' },
  { step: 'On émet la facture',                        detail: 'Le numéro est attribué à l’émission, sans trou ni doublon ; la facture est alors verrouillée.' },
]

export const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'pilotage', title: 'Tableau de bord',
    pages: [{
      title: 'Dashboard', route: '/dashboard', who: 'chaque rôle a le sien',
      does: [
        'Admin : consultants actifs, occupation moyenne, projets actifs, congés en attente ; projets et consultants cliquables.',
        'Manager : son équipe, les CRA à valider, les congés en attente.',
        'Consultant : sa semaine, ses congés, ses projets.',
        'Calendrier du mois : jours fériés, congés approuvés, échéances de projets.',
      ],
      notYet: [
        '« Activité récente » ne montre que les actions de la console IA : ce n’est pas un journal complet.',
        'Le statut « En mission » ou « Partiel » d’un consultant est saisi à la main, pas calculé depuis ses affectations.',
      ],
    }],
  },
  {
    id: 'equipe', title: 'Équipe',
    pages: [
      {
        title: 'Consultants', route: '/consultants', who: 'admin, manager',
        does: [
          'Liste de l’équipe, tiroir de consultation rapide, lien Fiche complète.',
          'Contrat (salarié ou freelance), statut fondateur, fonction (dirigeant, commercial ou support ne facturent pas), grade.',
          'Coûts : salaire et charges, ou honoraires ; TJM cible et facturé.',
          'Création d’un consultant avec les CP, RTT et jours travaillés par défaut de la société.',
          'Lien d’activation ou de connexion du compte, avec le rôle choisi : seulement pour un compte de rôle inférieur au vôtre.',
        ],
        notYet: [
          'Pas de gestion des compétences ni de CV.',
          'Le changement d’adresse d’un compte existant passe par la suppression du compte, puis un nouveau lien.',
        ],
      },
      {
        title: 'Staffing', route: '/availability', who: 'admin, manager',
        does: [
          'Disponibilités et affectations de l’équipe, pour voir qui est libre et quand.',
          'Création et modification des affectations.',
        ],
        notYet: ['Pas de proposition automatique d’équipe pour une affaire.'],
      },
      {
        title: 'Congés', route: '/leaves', who: 'tous',
        does: [
          'Demande de congé : CP, RTT, sans solde, absence autorisée, avec le décompte des jours ouvrés hors jours fériés.',
          'Une demande naît toujours « en attente » ; validation ou refus par un admin ou un manager.',
          'Soldes de CP et RTT tenus par la base : une approbation décompte, un refus ou une suppression après approbation rend les jours, quel que soit le chemin (écran ou console IA).',
          'Approbation automatique (réglage RH) : un CP ou un RTT couvert par le solde est approuvé à la demande.',
          'Un freelance n’a que sans solde et absence autorisée.',
        ],
        notYet: ['Le nombre de jours est calculé dans le navigateur ; la base ne le recalcule pas.'],
      },
      {
        title: 'CRA', route: '/timesheets', who: 'tous',
        does: [
          'Saisie à la semaine, par projet : demi-journée ou journée, un jour au plus par jour.',
          'Jours fériés et congés approuvés affichés dans la grille.',
          'Soumission, puis validation par un manager ou un admin ; un jour validé est verrouillé, réouverture possible.',
        ],
        notYet: [
          'La date limite de soumission (réglage RH) n’est qu’indicative : pas de rappel ni de blocage.',
          'Pas de clôture formelle de période.',
        ],
      },
    ],
  },
  {
    id: 'business', title: 'Business',
    pages: [
      {
        title: 'Affaires', route: '/bids', who: 'admin, manager',
        does: [
          'Pipeline par étape ; montant ouvert, pondéré, gagné, taux de transformation.',
          'Affaire en régie, forfait ou sourcing, avec estimation TJM × jours.',
          'Gagnée : le projet est créé et relié. Perdue : motif obligatoire. Réouverture possible.',
          'Onglet « À faire » : relances en retard, du jour, de la semaine, et clôtures dépassées.',
        ],
        notYet: [
          'Pas de rattachement d’une affaire à une offre d’un catalogue.',
          'Étapes et vocabulaire du pipeline non modifiables dans les réglages.',
        ],
      },
      {
        title: 'Clients', route: '/clients', who: 'admin, manager',
        does: [
          'Fiche client avec son type, ses contacts (rôle d’achat, contact principal) et ses projets.',
          'Journal des échanges avec relances datées.',
        ],
        notYet: ['Pas de contrats-cadres ni de référencements (grille négociée, échéance).'],
      },
      {
        title: 'Projets', route: '/projects', who: 'admin, manager ; consultant : les siens',
        does: [
          'Projet en régie ou au forfait, client et client final, TJM vendu, budget, dates, avancement.',
          'Affectations des consultants depuis le tiroir du projet.',
          'Les liens venant d’un client ou d’une affaire ouvrent directement le bon projet.',
        ],
        notYet: ['Un projet archivé disparaît de la liste et ne peut pas être désarchivé depuis l’écran.'],
      },
      {
        title: 'Timeline', route: '/timeline', who: 'admin, manager',
        does: ['Planning mensuel : qui est sur quoi, mois par mois.'],
        notYet: ['Planning en lecture : les affectations se modifient dans Projets ou Staffing.'],
      },
    ],
  },
  {
    id: 'finance', title: 'Finance',
    pages: [
      {
        title: 'Finances', route: '/financials', who: 'admin',
        does: [
          'Marges et TJM par projet, CA des régies et des forfaits.',
          'EBITDA courant : compte de résultat mensuel (CA, honoraires, charges d’exploitation).',
        ],
        notYet: [
          'Les marges sont calculées sur les affectations, pas encore sur les CRA validés.',
          'Pas de comparaison prévu / réalisé avec un budget.',
        ],
      },
      {
        title: 'Rentabilité', route: '/profitability', who: 'admin',
        does: ['Rentabilité par consultant : coût, CA, marge, avec la légende des seuils (25 % et 15 %).'],
        notYet: ['L’occupation réelle n’est pas encore calculée depuis les CRA.'],
      },
      {
        title: 'Simu embauche', route: '/simulator', who: 'admin',
        does: [
          'Salaire proposable : à partir d’un TJM vendu, d’une marge cible et d’une occupation, le brut maximum d’un salarié et le TJM maximum d’un freelance.',
          'Profil contre la grille : un coût annuel et, en option, une occupation réelle, testés contre chaque grade (CA, contribution, part laissée à la société, point mort).',
        ],
        notYet: ['Pas de prix de package par offre.'],
      },
      {
        title: 'Factures', route: '/invoices', who: 'admin, manager ; freelance : les siennes',
        does: [
          'Création depuis les CRA validés du mois, au TJM vendu, ou sur le montant d’un forfait.',
          'TVA, délai de paiement et mentions tirés des réglages de facturation ; échéance calculée.',
          'Numéro attribué à l’émission, facture verrouillée ensuite ; charte de la société ; page imprimable en PDF depuis le navigateur.',
          'Total facturé hors brouillons.',
        ],
        notYet: [
          'Pas d’avoir : une facture émise ne s’annule pas depuis l’écran.',
          'Un brouillon ne se modifie pas : on le supprime ou on l’émet.',
          'Pas de logo, pas d’envoi par e-mail, pas d’export comptable.',
        ],
      },
    ],
  },
  {
    id: 'reglages', title: 'Paramètres et IA',
    pages: [
      {
        title: 'Paramètres', route: '/settings', who: 'admin',
        does: [
          'Entreprise : identité et charte.',
          'Équipes : équipes et managers, membres et rôles.',
          'RH : pays (jours fériés), CP et RTT par défaut, jours travaillés, approbation automatique des congés.',
          'Grille : par grade, TJM cible, occupation cible, coût chargé.',
          'Facturation : identité légale, TVA, délai, mentions.',
          'IA & MCP : modèle, adresse et interrupteur « Agents » de la console.',
        ],
        notYet: ['Dans RH, la date limite des CRA est enregistrée mais pas encore appliquée.'],
      },
      {
        title: 'IA agentique', route: '/ai', who: 'admin',
        does: [
          'Répond à des questions sur les données de la société, avec vos droits.',
          'Avec « Agents » activé : propose une action (valider un congé, changer le statut d’un projet), exécutée seulement après votre confirmation.',
        ],
        notYet: [
          'Elle appelle le fournisseur réglé dans Paramètres › IA, par défaut un hébergeur tiers : à laisser éteinte tant que ce choix n’est pas validé.',
          'Les agents autonomes ne sont pas encore construits.',
        ],
      },
    ],
  },
]

export const GUIDE_OUTSIDE: Array<{ title: string; text: string }> = [
  { title: 'Comptabilité légale', text: 'déclarations, bilan, liasse, chez l’expert-comptable.' },
  { title: 'Trésorerie complète', text: 'locaux, assurances, marketing restent dans votre tableur.' },
  { title: 'Projections pluriannuelles', text: 'c’est le rôle du business plan.' },
  { title: 'Table de capitalisation', text: 'un tableur suffit.' },
]
