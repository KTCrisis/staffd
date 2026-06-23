export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allocation: number | null
          company_id: string | null
          consultant_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          project_id: string | null
          start_date: string | null
          tjm_facture_override: number | null
        }
        Insert: {
          allocation?: number | null
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          start_date?: string | null
          tjm_facture_override?: number | null
        }
        Update: {
          allocation?: number | null
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          project_id?: string | null
          start_date?: string | null
          tjm_facture_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          company_id: string | null
          consultant_id: string | null
          created_at: string | null
          date: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "availability_overrides_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          sector: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          sector?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          sector?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_settings: Json | null
          billing_settings: Json | null
          created_at: string | null
          entity_type: string
          hr_settings: Json | null
          id: string
          mode: string
          name: string
          parent_company_id: string | null
          slug: string | null
        }
        Insert: {
          ai_settings?: Json | null
          billing_settings?: Json | null
          created_at?: string | null
          entity_type?: string
          hr_settings?: Json | null
          id?: string
          mode?: string
          name: string
          parent_company_id?: string | null
          slug?: string | null
        }
        Update: {
          ai_settings?: Json | null
          billing_settings?: Json | null
          created_at?: string | null
          entity_type?: string
          hr_settings?: Json | null
          id?: string
          mode?: string
          name?: string
          parent_company_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consultants: {
        Row: {
          avatar_color: string | null
          charges_pct: number | null
          company_id: string | null
          contract_type: string
          country_code: string | null
          created_at: string | null
          email: string | null
          id: string
          initials: string | null
          jours_travailles: number | null
          leave_days_taken: number | null
          leave_days_total: number | null
          name: string
          occupancy_rate: number | null
          role: string | null
          rtt_taken: number | null
          rtt_total: number | null
          salaire_annuel_brut: number | null
          stack: string[] | null
          status: string | null
          team_id: string | null
          tjm: number | null
          tjm_cible: number | null
          tjm_facture: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          charges_pct?: number | null
          company_id?: string | null
          contract_type?: string
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          initials?: string | null
          jours_travailles?: number | null
          leave_days_taken?: number | null
          leave_days_total?: number | null
          name: string
          occupancy_rate?: number | null
          role?: string | null
          rtt_taken?: number | null
          rtt_total?: number | null
          salaire_annuel_brut?: number | null
          stack?: string[] | null
          status?: string | null
          team_id?: string | null
          tjm?: number | null
          tjm_cible?: number | null
          tjm_facture?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          charges_pct?: number | null
          company_id?: string | null
          contract_type?: string
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          initials?: string | null
          jours_travailles?: number | null
          leave_days_taken?: number | null
          leave_days_total?: number | null
          name?: string
          occupancy_rate?: number | null
          role?: string | null
          rtt_taken?: number | null
          rtt_total?: number | null
          salaire_annuel_brut?: number | null
          stack?: string[] | null
          status?: string | null
          team_id?: string | null
          tjm?: number | null
          tjm_cible?: number | null
          tjm_facture?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          company_id: string
          description: string
          detail: string | null
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          sort_order: number | null
          timesheet_ref: Json | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          company_id: string
          description: string
          detail?: string | null
          id?: string
          invoice_id: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          timesheet_ref?: Json | null
          unit?: string | null
          unit_price: number
        }
        Update: {
          company_id?: string
          description?: string
          detail?: string | null
          id?: string
          invoice_id?: string
          line_total?: number | null
          quantity?: number
          sort_order?: number | null
          timesheet_ref?: Json | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          client_snapshot: Json | null
          company_id: string
          consultant_id: string | null
          created_at: string | null
          due_date: string | null
          emitter_snapshot: Json | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          payment_terms: number | null
          project_id: string | null
          source_period_end: string | null
          source_period_start: string | null
          source_type: string | null
          status: string
          subtotal: number
          total_ttc: number
          tva_amount: number
          tva_rate: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          client_snapshot?: Json | null
          company_id: string
          consultant_id?: string | null
          created_at?: string | null
          due_date?: string | null
          emitter_snapshot?: Json | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: number | null
          project_id?: string | null
          source_period_end?: string | null
          source_period_start?: string | null
          source_type?: string | null
          status?: string
          subtotal?: number
          total_ttc?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          client_snapshot?: Json | null
          company_id?: string
          consultant_id?: string | null
          created_at?: string | null
          due_date?: string | null
          emitter_snapshot?: Json | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          payment_terms?: number | null
          project_id?: string | null
          source_period_end?: string | null
          source_period_start?: string | null
          source_type?: string | null
          status?: string
          subtotal?: number
          total_ttc?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "invoices_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string | null
          consultant_id: string | null
          created_at: string | null
          days: number
          end_date: string
          id: string
          impact_warning: string | null
          motif: string | null
          reviewed_at: string | null
          start_date: string
          status: string
          type: string
        }
        Insert: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          days: number
          end_date: string
          id?: string
          impact_warning?: string | null
          motif?: string | null
          reviewed_at?: string | null
          start_date: string
          status?: string
          type: string
        }
        Update: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          days?: number
          end_date?: string
          id?: string
          impact_warning?: string | null
          motif?: string | null
          reviewed_at?: string | null
          start_date?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "leave_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_total: number | null
          client_id: string | null
          client_name: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_activity_type: boolean
          is_internal: boolean
          jours_vendus: number | null
          name: string
          progress: number | null
          reference: string | null
          start_date: string | null
          status: string
          tjm_vendu: number | null
          updated_at: string | null
        }
        Insert: {
          budget_total?: number | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_activity_type?: boolean
          is_internal?: boolean
          jours_vendus?: number | null
          name: string
          progress?: number | null
          reference?: string | null
          start_date?: string | null
          status?: string
          tjm_vendu?: number | null
          updated_at?: string | null
        }
        Update: {
          budget_total?: number | null
          client_id?: string | null
          client_name?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_activity_type?: boolean
          is_internal?: boolean
          jours_vendus?: number | null
          name?: string
          progress?: number | null
          reference?: string | null
          start_date?: string | null
          status?: string
          tjm_vendu?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          consultant_id: string
          created_at: string | null
          id: string
          team_id: string
        }
        Insert: {
          consultant_id: string
          created_at?: string | null
          id?: string
          team_id: string
        }
        Update: {
          consultant_id?: string
          created_at?: string | null
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "team_members_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: true
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          company_id: string | null
          consultant_id: string | null
          created_at: string | null
          date: string
          id: string
          project_id: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string | null
          consultant_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      consultant_occupancy: {
        Row: {
          avatar_color: string | null
          charges_pct: number | null
          company_id: string | null
          contract_type: string | null
          email: string | null
          id: string | null
          initials: string | null
          jours_travailles: number | null
          leave_days_left: number | null
          leave_days_taken: number | null
          leave_days_total: number | null
          name: string | null
          occupancy_rate: number | null
          project_names: string[] | null
          role: string | null
          rtt_left: number | null
          rtt_taken: number | null
          rtt_total: number | null
          salaire_annuel_brut: number | null
          stack: string[] | null
          status: string | null
          team_id: string | null
          tjm: number | null
          tjm_cible: number | null
          tjm_cout_reel: number | null
          tjm_facture: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      consultant_profitability: {
        Row: {
          avatar_color: string | null
          ca_genere: number | null
          company_id: string | null
          consultant_id: string | null
          contract_type: string | null
          cout_consultant: number | null
          initials: string | null
          jours_generes: number | null
          marge_brute: number | null
          marge_pct: number | null
          name: string | null
          nb_assignments: number | null
          occupancy_rate: number | null
          role: string | null
          status: string | null
          tjm_cible: number | null
          tjm_cout: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consultants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consultants_with_leave: {
        Row: {
          avatar_color: string | null
          charges_pct: number | null
          company_id: string | null
          contract_type: string | null
          country_code: string | null
          created_at: string | null
          email: string | null
          id: string | null
          initials: string | null
          jours_travailles: number | null
          leave_days_left: number | null
          leave_days_taken: number | null
          leave_days_total: number | null
          name: string | null
          occupancy_rate: number | null
          role: string | null
          rtt_left: number | null
          rtt_taken: number | null
          rtt_total: number | null
          salaire_annuel_brut: number | null
          stack: string[] | null
          status: string | null
          team_id: string | null
          tjm: number | null
          tjm_cible: number | null
          tjm_facture: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          charges_pct?: number | null
          company_id?: string | null
          contract_type?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          initials?: string | null
          jours_travailles?: number | null
          leave_days_left?: never
          leave_days_taken?: number | null
          leave_days_total?: number | null
          name?: string | null
          occupancy_rate?: number | null
          role?: string | null
          rtt_left?: never
          rtt_taken?: number | null
          rtt_total?: number | null
          salaire_annuel_brut?: number | null
          stack?: string[] | null
          status?: string | null
          team_id?: string | null
          tjm?: number | null
          tjm_cible?: number | null
          tjm_facture?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          charges_pct?: number | null
          company_id?: string | null
          contract_type?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          initials?: string | null
          jours_travailles?: number | null
          leave_days_left?: never
          leave_days_taken?: number | null
          leave_days_total?: number | null
          name?: string | null
          occupancy_rate?: number | null
          role?: string | null
          rtt_left?: never
          rtt_taken?: number | null
          rtt_total?: number | null
          salaire_annuel_brut?: number | null
          stack?: string[] | null
          status?: string | null
          team_id?: string | null
          tjm?: number | null
          tjm_cible?: number | null
          tjm_facture?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_list: {
        Row: {
          client_name: string | null
          company_id: string | null
          consultant_name: string | null
          created_at: string | null
          days_overdue: number | null
          due_date: string | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          is_overdue: boolean | null
          notes: string | null
          paid_at: string | null
          payment_terms: number | null
          project_name: string | null
          source_period_end: string | null
          source_period_start: string | null
          source_type: string | null
          status: string | null
          subtotal: number | null
          total_ttc: number | null
          tva_amount: number | null
          tva_rate: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financials: {
        Row: {
          client: string | null
          company_id: string | null
          id: string | null
          jours_vendus: number | null
          marge_brute_totale: number | null
          marge_par_jour: number | null
          marge_pct: number | null
          name: string | null
          team_size: number | null
          tjm_reel: number | null
          tjm_vendu: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_details: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          manager_avatar_color: string | null
          manager_id: string | null
          manager_initials: string | null
          manager_name: string | null
          members: Json | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_summary: {
        Row: {
          approved_count: number | null
          company_id: string | null
          consultant_id: string | null
          consultant_name: string | null
          days_logged: number | null
          draft_count: number | null
          project_id: string | null
          project_name: string | null
          submitted_count: number | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_occupancy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultant_profitability"
            referencedColumns: ["consultant_id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "consultants_with_leave"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      increment_leave_taken: {
        Args: { p_consultant_id: string; p_days: number }
        Returns: undefined
      }
      increment_rtt_taken: {
        Args: { p_consultant_id: string; p_days: number }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      merge_ai_settings: {
        Args: { p_company_id: string; p_patch: Json }
        Returns: undefined
      }
      merge_billing_settings: {
        Args: { p_company_id: string; p_patch: Json }
        Returns: undefined
      }
      merge_hr_settings: {
        Args: { p_company_id: string; p_patch: Json }
        Returns: undefined
      }
      my_company_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
      my_team_consultant_ids: { Args: never; Returns: string[] }
      next_invoice_number: { Args: { p_company_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

