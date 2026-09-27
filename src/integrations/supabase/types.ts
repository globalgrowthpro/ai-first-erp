export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_parent: boolean
          name_ar: string
          name_en: string
          opening_balance: number
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_parent?: boolean
          name_ar: string
          name_en: string
          opening_balance?: number
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_parent?: boolean
          name_ar?: string
          name_en?: string
          opening_balance?: number
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
        ]
      }
      ai_modules: {
        Row: {
          code: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          is_enabled: boolean
          name_ar: string
          name_en: string
          requires_approval: boolean
          scope: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_enabled?: boolean
          name_ar: string
          name_en: string
          requires_approval?: boolean
          scope?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_enabled?: boolean
          name_ar?: string
          name_en?: string
          requires_approval?: boolean
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          module_id: string | null
          prompt: string
          requested_by: string | null
          status: Database["public"]["Enums"]["ai_run_status"]
          suggestion: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          module_id?: string | null
          prompt: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          suggestion?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          module_id?: string | null
          prompt?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          suggestion?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "ai_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
          source: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          source?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          source?: string
        }
        Relationships: []
      }
      bom_lines: {
        Row: {
          bom_id: string
          component_id: string
          created_at: string
          id: string
          quantity: number
          waste_percent: number
        }
        Insert: {
          bom_id: string
          component_id: string
          created_at?: string
          id?: string
          quantity?: number
          waste_percent?: number
        }
        Update: {
          bom_id?: string
          component_id?: string
          created_at?: string
          id?: string
          quantity?: number
          waste_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      boms: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          output_quantity: number
          product_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          output_quantity?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          output_quantity?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boms_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name_ar: string
          name_en: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address_ar: string | null
          address_en: string | null
          commercial_register: string | null
          created_at: string
          currency: string
          email: string | null
          fiscal_year_start: string
          id: string
          logo_url: string | null
          name_ar: string
          name_en: string
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          fiscal_year_start?: string
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          commercial_register?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          fiscal_year_start?: string
          id?: string
          logo_url?: string | null
          name_ar?: string
          name_en?: string
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          manager_id: string | null
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          base_salary: number
          code: string | null
          created_at: string
          department_id: string | null
          email: string | null
          hire_date: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          national_id: string | null
          phone: string | null
          position_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_salary?: number
          code?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          national_id?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_salary?: number
          code?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          national_id?: string | null
          phone?: string | null
          position_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          entry_date: string
          entry_no: string
          id: string
          is_posted: boolean
          posted_at: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          entry_date?: string
          entry_no: string
          id?: string
          is_posted?: boolean
          posted_at?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          entry_date?: string
          entry_no?: string
          id?: string
          is_posted?: boolean
          posted_at?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          line_no: number
          memo: string | null
          partner_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          line_no?: number
          memo?: string | null
          partner_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          line_no?: number
          memo?: string | null
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trial_balance"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          balance: number
          code: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number
          email: string | null
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
          phone: string | null
          tax_number: string | null
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance?: number
          code?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
          phone?: string | null
          tax_number?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance?: number
          code?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
          phone?: string | null
          tax_number?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id: string
          method: string
          notes: string | null
          paid_at: string
          partner_id: string | null
          payment_no: string
          purchase_bill_id: string | null
          sales_invoice_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["payment_direction"]
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          partner_id?: string | null
          payment_no: string
          purchase_bill_id?: string | null
          sales_invoice_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["payment_direction"]
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          partner_id?: string | null
          payment_no?: string
          purchase_bill_id?: string | null
          sales_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_purchase_bill_id_fkey"
            columns: ["purchase_bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_posted: boolean
          period_month: string
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_posted?: boolean
          period_month: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_posted?: boolean
          period_month?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          created_at: string
          deductions: number
          employee_id: string
          gross: number
          id: string
          net: number
          payroll_run_id: string
        }
        Insert: {
          created_at?: string
          deductions?: number
          employee_id: string
          gross?: number
          id?: string
          net?: number
          payroll_run_id: string
        }
        Update: {
          created_at?: string
          deductions?: number
          employee_id?: string
          gross?: number
          id?: string
          net?: number
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          code: string | null
          created_at: string
          department_id: string | null
          id: string
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_raw_material: boolean
          name_ar: string
          name_en: string
          reorder_level: number
          sale_price: number
          sku: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_raw_material?: boolean
          name_ar: string
          name_en: string
          reorder_level?: number
          sale_price?: number
          sku: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_raw_material?: boolean
          name_ar?: string
          name_en?: string
          reorder_level?: number
          sale_price?: number
          sku?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string | null
          full_name_ar: string
          full_name_en: string
          id: string
          is_active: boolean
          phone: string | null
          position_id: string | null
          sidebar_visible: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name_ar?: string
          full_name_en?: string
          id: string
          is_active?: boolean
          phone?: string | null
          position_id?: string | null
          sidebar_visible?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name_ar?: string
          full_name_en?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          position_id?: string | null
          sidebar_visible?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_position_fk"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bill_lines: {
        Row: {
          bill_id: string
          created_at: string
          description: string | null
          discount: number
          id: string
          line_total: number
          product_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          bill_id?: string
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "purchase_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bill_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_bills: {
        Row: {
          balance: number
          bill_date: string
          bill_no: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          partner_id: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          balance?: number
          bill_date?: string
          bill_no: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          balance?: number
          bill_date?: string
          bill_no?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_bills_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_bills_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_lines: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          id: string
          invoice_id: string
          line_total: number
          product_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_no: string
          journal_entry_id: string | null
          notes: string | null
          partner_id: string | null
          status: Database["public"]["Enums"]["doc_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_no?: string
          journal_entry_id?: string | null
          notes?: string | null
          partner_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_moves: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          move_no: string | null
          move_type: Database["public"]["Enums"]["stock_move_type"]
          moved_at: string
          product_id: string
          quantity: number
          reference: string | null
          to_warehouse_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          move_no?: string | null
          move_type: Database["public"]["Enums"]["stock_move_type"]
          moved_at?: string
          product_id: string
          quantity: number
          reference?: string | null
          to_warehouse_id?: string | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          move_no?: string | null
          move_type?: Database["public"]["Enums"]["stock_move_type"]
          moved_at?: string
          product_id?: string
          quantity?: number
          reference?: string | null
          to_warehouse_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_pages: {
        Row: {
          created_at: string
          id: string
          page_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          manager_id: string | null
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          manager_id?: string | null
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_stages: {
        Row: {
          created_at: string
          done_at: string | null
          id: string
          is_done: boolean
          name_ar: string
          name_en: string
          sequence: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          name_ar: string
          name_en: string
          sequence?: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          name_ar?: string
          name_en?: string
          sequence?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_stages_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          bom_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          order_no: string
          planned_date: string | null
          product_id: string
          quantity: number
          status: Database["public"]["Enums"]["work_order_status"]
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          bom_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_no: string
          planned_date?: string | null
          product_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["work_order_status"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          bom_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_no?: string
          planned_date?: string | null
          product_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["work_order_status"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "boms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trial_balance: {
        Row: {
          account_id: string | null
          balance: number | null
          code: string | null
          name_ar: string | null
          name_en: string | null
          total_credit: number | null
          total_debit: number | null
          type: Database["public"]["Enums"]["account_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      ai_run_status: "suggested" | "approved" | "rejected" | "executed"
      app_role: "admin" | "cfo" | "kitchen" | "sales" | "warehouse" | "ai"
      doc_status: "draft" | "partial" | "paid" | "overdue" | "cancelled"
      leave_status: "pending" | "approved" | "rejected"
      partner_type: "customer" | "supplier" | "both"
      payment_direction: "inbound" | "outbound"
      stock_move_type: "in" | "out" | "transfer" | "adjustment"
      work_order_status:
        | "planned"
        | "in_progress"
        | "quality_check"
        | "done"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      ai_run_status: ["suggested", "approved", "rejected", "executed"],
      app_role: ["admin", "cfo", "kitchen", "sales", "warehouse", "ai"],
      doc_status: ["draft", "partial", "paid", "overdue", "cancelled"],
      leave_status: ["pending", "approved", "rejected"],
      partner_type: ["customer", "supplier", "both"],
      payment_direction: ["inbound", "outbound"],
      stock_move_type: ["in", "out", "transfer", "adjustment"],
      work_order_status: [
        "planned",
        "in_progress",
        "quality_check",
        "done",
        "cancelled",
      ],
    },
  },
} as const
