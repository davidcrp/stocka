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
      lead_interactions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          message: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          message?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          follow_up_count: number
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string | null
          proposed_value: number | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          follow_up_count?: number
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          proposed_value?: number | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          follow_up_count?: number
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          proposed_value?: number | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          commission: number | null
          created_at: string
          final_price: number
          id: string
          lead_id: string | null
          notes: string | null
          payment_method: string | null
          sale_date: string
          seller_id: string | null
          vehicle_id: string
        }
        Insert: {
          commission?: number | null
          created_at?: string
          final_price: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_method?: string | null
          sale_date?: string
          seller_id?: string | null
          vehicle_id: string
        }
        Update: {
          commission?: number | null
          created_at?: string
          final_price?: number
          id?: string
          lead_id?: string | null
          notes?: string | null
          payment_method?: string | null
          sale_date?: string
          seller_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_expenses: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          expense_date: string | null
          expense_type: string
          id: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_type: string
          id?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_type?: string
          id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          final_sale_price: number | null
          fipe_code: string | null
          fuel: string | null
          id: string
          listing_price: number | null
          mileage: number | null
          model: string
          notes: string | null
          photos: string[] | null
          plate: string | null
          purchase_price: number
          reconditioning_cost: number | null
          sale_date: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          suggested_price: number | null
          transmission: string | null
          transport_cost: number | null
          updated_at: string
          year_fab: number
          year_model: number
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          final_sale_price?: number | null
          fipe_code?: string | null
          fuel?: string | null
          id?: string
          listing_price?: number | null
          mileage?: number | null
          model: string
          notes?: string | null
          photos?: string[] | null
          plate?: string | null
          purchase_price?: number
          reconditioning_cost?: number | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          suggested_price?: number | null
          transmission?: string | null
          transport_cost?: number | null
          updated_at?: string
          year_fab: number
          year_model: number
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          final_sale_price?: number | null
          fipe_code?: string | null
          fuel?: string | null
          id?: string
          listing_price?: number | null
          mileage?: number | null
          model?: string
          notes?: string | null
          photos?: string[] | null
          plate?: string | null
          purchase_price?: number
          reconditioning_cost?: number | null
          sale_date?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          suggested_price?: number | null
          transmission?: string | null
          transport_cost?: number | null
          updated_at?: string
          year_fab?: number
          year_model?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_user_role: {
        Args: { _new_role: string; _target_user_id: string }
        Returns: undefined
      }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      lead_source:
        | "olx"
        | "facebook"
        | "whatsapp"
        | "loja"
        | "instagram"
        | "indicacao"
        | "outro"
      lead_status:
        | "novo"
        | "contactado"
        | "aguardando"
        | "negociando"
        | "fechado"
        | "perdido"
      vehicle_status: "em_estoque" | "vendido" | "reservado"
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
  public: {
    Enums: {
      lead_source: [
        "olx",
        "facebook",
        "whatsapp",
        "loja",
        "instagram",
        "indicacao",
        "outro",
      ],
      lead_status: [
        "novo",
        "contactado",
        "aguardando",
        "negociando",
        "fechado",
        "perdido",
      ],
      vehicle_status: ["em_estoque", "vendido", "reservado"],
    },
  },
} as const
