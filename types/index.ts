export type Theme = 'dark' | 'light'

export type ConsultantStatus = 'available' | 'assigned' | 'leave' | 'partial'

export type LeaveStatus = 'pending' | 'approved' | 'refused'

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'archived'

export type AvatarColor = 'green' | 'pink' | 'cyan' | 'gold' | 'purple'

export interface Consultant {
  id: string
  name: string
  initials: string
  role: string
  status: ConsultantStatus
  avatarColor: AvatarColor
  currentProject?: string
  currentProjectId?: string
  availableFrom?: string
  leaveDaysLeft: number
  occupancyRate: number
  email?: string
  tjm?: number
  stack?: string[]
  leaveDaysTotal?: number
}

export interface Project {
  id: string
  name: string
  client: string
  consultantIds: string[]
  team?: { id: string; name: string; initials: string; avatarColor: string }[]
  progress: number
  endDate?: string
  status: ProjectStatus
  startDate?:   string
  clientName?:  string
  clientId?:    string
  reference?:   string
  description?: string
  budgetTotal?: number
  tjmVendu?:    number
  joursVendus?: number
  isInternal?:  boolean
  companyId?:   string
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
  id: string
  consultantId: string
  consultantName: string
  type: 'CP' | 'RTT' | 'Sans solde'
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  impactWarning?: string
}

export interface KpiData {
  activeConsultants: number
  totalConsultants: number
  activeProjects: number
  pendingLeaves: number
  occupancyRate: number
}

export interface ActivityItem {
  id: string
  type: 'leave' | 'assignment' | 'milestone' | 'alert'
  message: string
  time: string
  read: boolean
}

export interface AvailabilityCell {
  consultantId: string
  date: string
  status: 'free' | 'busy' | 'partial' | 'leave' | 'weekend'
  projectName?: string
  percentage?: number
}

export interface ProjectConsultant {
  id:          string
  name:        string
  initials:    string
  avatarColor: string
}