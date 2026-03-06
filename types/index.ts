export type Theme = 'dark' | 'light'

export type ContractType    = 'employee' | 'freelance'
export type ConsultantStatus = 'available' | 'assigned' | 'leave' | 'partial'
export type LeaveStatus      = 'pending' | 'approved' | 'refused'
export type LeaveType        = 'CP' | 'RTT' | 'Sans solde' | 'Absence autorisée'
export type ProjectStatus    = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'
export type AvatarColor      = 'green' | 'pink' | 'cyan' | 'gold' | 'purple'

export interface Consultant {
  id:                string
  user_id?:          string | null
  company_id?:       string | null
  country_code?: string | null
  teamId?:          string | null
  name:              string
  initials:          string
  role:              string
  status:            ConsultantStatus
  avatarColor:       AvatarColor
  currentProject?:   string
  currentProjectId?: string
  availableFrom?:    string
  leaveDaysLeft:     number
  leaveDaysTotal?:   number
  occupancyRate:     number
  email?:            string
  stack?:            string[]
  // RTT
  rttTotal?:         number
  rttTaken?:         number
  rttLeft?:          number
  // ── Contrat ────────────────────────────────────────────────
  contractType?:     ContractType   // 'employee' | 'freelance'
  // TJM
  tjm?:              number         // fallback legacy
  tjmFacture?:       number         // freelance : tarif facturé
  tjmCible?:         number         // objectif commercial (analysable par IA)
  tjmCoutReel?:      number         // calculé par la vue SQL (lecture seule)
  // Employee — base de calcul du coût réel
  salaireAnnuelBrut?: number        // ex : 55000
  chargesPct?:        number        // charges patronales — défaut 42%
  joursTravailles?:   number        // jours ouvrés/an — défaut 218
}

export interface Project {
  id:            string
  name:          string
  client:        string
  consultantIds: string[]
  team?:         { id: string; name: string; initials: string; avatarColor: string }[]
  progress:      number
  endDate?:      string
  status:        ProjectStatus
  startDate?:    string
  clientName?:   string
  clientId?:     string
  reference?:    string
  description?:  string
  budgetTotal?:  number
  tjmVendu?:     number
  joursVendus?:  number
  isInternal?:   boolean
  companyId?:    string
}

export interface Client {
  id:              string
  companyId:       string
  name:            string
  sector?:         string
  website?:        string
  contactName?:    string
  contactEmail?:   string
  contactPhone?:   string
  notes?:          string
  activeProjects?: number
  totalProjects?:  number
}

export interface LeaveRequest {
  id:             string
  consultantId:   string
  consultantName: string
  type:           LeaveType
  motif?:         string
  startDate:      string
  endDate:        string
  days:           number
  status:         LeaveStatus
  impactWarning?: string
}

export interface AbsenceMotif {
  value: string
  label: string
  days:  number
}

export const ABSENCE_MOTIFS: AbsenceMotif[] = [
  { value: 'mariage_salarie',   label: 'Mariage / Pacs salarié',       days: 4  },
  { value: 'mariage_enfant',    label: "Mariage d'un enfant",           days: 1  },
  { value: 'naissance',         label: 'Naissance',                     days: 3  },
  { value: 'deces_conjoint',    label: 'Décès conjoint',                days: 3  },
  { value: 'deces_enfant',      label: 'Décès enfant',                  days: 5  },
  { value: 'deces_pere_mere',   label: 'Décès père/mère',               days: 3  },
  { value: 'deces_ascendant',   label: 'Décès autre ascendant',         days: 1  },
  { value: 'deces_frere_soeur', label: 'Décès frère/sœur',             days: 3  },
  { value: 'deces_beau_parent', label: 'Décès beau-père / belle-mère', days: 3  },
  { value: 'paternite',         label: 'Paternité',                     days: 11 },
  { value: 'paternite_gemeaux', label: 'Paternité gémellaire',          days: 25 },
]

export interface KpiData {
  activeConsultants: number
  totalConsultants:  number
  activeProjects:    number
  pendingLeaves:     number
  occupancyRate:     number
}

export interface ActivityItem {
  id:      string
  type:    'leave' | 'assignment' | 'milestone' | 'alert'
  message: string
  time:    string
  read:    boolean
}

export interface AvailabilityCell {
  consultantId: string
  date:         string
  status:       'free' | 'busy' | 'partial' | 'leave' | 'weekend'
  projectName?: string
  percentage?:  number
}

export interface ProjectConsultant {
  id:          string
  name:        string
  initials:    string
  avatarColor: string
}