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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_by: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          reason_type: Database["public"]["Enums"]["block_reason_type"]
          user_id: string
        }
        Insert: {
          blocked_by: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          reason_type?: Database["public"]["Enums"]["block_reason_type"]
          user_id: string
        }
        Update: {
          blocked_by?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          reason_type?: Database["public"]["Enums"]["block_reason_type"]
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          qty: number
          variant_id: string
        }
        Insert: {
          cart_id: string
          qty: number
          variant_id: string
        }
        Update: {
          cart_id?: string
          qty?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          metadata: Json | null
          price_id: string | null
          session_id: string
          status: string | null
          subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          metadata?: Json | null
          price_id?: string | null
          session_id?: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          metadata?: Json | null
          price_id?: string | null
          session_id?: string
          status?: string | null
          subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          available: number | null
          capacity: number | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          available?: number | null
          capacity?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          available?: number | null
          capacity?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_log: {
        Row: {
          created_at: string | null
          id: string
          quantity_change: number
          reason: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity_change: number
          reason?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity_change?: number
          reason?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      junta_directiva: {
        Row: {
          apellido1: string
          apellido2: string
          cargo: string
          dni_pasaporte: string
          name: string
          user_id: number
          user_uuid: string | null
        }
        Insert: {
          apellido1?: string
          apellido2?: string
          cargo?: string
          dni_pasaporte?: string
          name?: string
          user_id?: number
          user_uuid?: string | null
        }
        Update: {
          apellido1?: string
          apellido2?: string
          cargo?: string
          dni_pasaporte?: string
          name?: string
          user_id?: number
          user_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "junta_directiva_user_id_dni_pasaporte_fkey"
            columns: ["user_id", "dni_pasaporte"]
            isOneToOne: false
            referencedRelation: "miembros"
            referencedColumns: ["user_id", "dni_pasaporte"]
          },
          {
            foreignKeyName: "junta_directiva_user_uuid_fkey"
            columns: ["user_uuid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_type: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invitation_type: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_type?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      miembros: {
        Row: {
          apellido1: string
          apellido2: string | null
          cargo_directivo: string | null
          cp: number | null
          created_at: string
          direccion: string
          direccion_extra: string | null
          dni_pasaporte: string
          email: string
          email_notifications: boolean | null
          es_socio_realmadrid: boolean
          fecha_nacimiento: string
          id: string
          last_four: string | null
          marketing_emails: boolean | null
          nacionalidad: string
          name: string
          num_carnet: number | null
          num_socio: number | null
          pais: string | null
          poblacion: string | null
          provincia: string | null
          redsys_token: string | null
          redsys_token_expiry: string | null
          role: string | null
          socio_carnet_madridista: boolean
          subscription_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          subscription_updated_at: string | null
          telefono: number
          user_id: number
          user_uuid: string | null
        }
        Insert: {
          apellido1?: string
          apellido2?: string | null
          cargo_directivo?: string | null
          cp?: number | null
          created_at?: string
          direccion?: string
          direccion_extra?: string | null
          dni_pasaporte?: string
          email?: string
          email_notifications?: boolean | null
          es_socio_realmadrid: boolean
          fecha_nacimiento: string
          id?: string
          last_four?: string | null
          marketing_emails?: boolean | null
          nacionalidad?: string
          name?: string
          num_carnet?: number | null
          num_socio?: number | null
          pais?: string | null
          poblacion?: string | null
          provincia?: string | null
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          role?: string | null
          socio_carnet_madridista: boolean
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          telefono: number
          user_id?: number
          user_uuid?: string | null
        }
        Update: {
          apellido1?: string
          apellido2?: string | null
          cargo_directivo?: string | null
          cp?: number | null
          created_at?: string
          direccion?: string
          direccion_extra?: string | null
          dni_pasaporte?: string
          email?: string
          email_notifications?: boolean | null
          es_socio_realmadrid?: boolean
          fecha_nacimiento?: string
          id?: string
          last_four?: string | null
          marketing_emails?: boolean | null
          nacionalidad?: string
          name?: string
          num_carnet?: number | null
          num_socio?: number | null
          pais?: string | null
          poblacion?: string | null
          provincia?: string | null
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          role?: string | null
          socio_carnet_madridista?: boolean
          subscription_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          telefono?: number
          user_id?: number
          user_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miembros_user_uuid_fkey"
            columns: ["user_uuid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          order_id: string
          price_cents: number | null
          product_name: string | null
          qty: number | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          order_id: string
          price_cents?: number | null
          product_name?: string | null
          qty?: number | null
          variant_id: string
        }
        Update: {
          created_at?: string | null
          order_id?: string
          price_cents?: number | null
          product_name?: string | null
          qty?: number | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          redsys_order: string | null
          shipping: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          redsys_order?: string | null
          shipping?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          redsys_order?: string | null
          shipping?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number
          cof_txn_id: string | null
          context: string
          created_at: string
          currency: string
          ds_authorization_code: string | null
          ds_card_brand: string | null
          ds_card_country: string | null
          ds_response: string | null
          id: string
          is_mit: boolean
          last_four: string | null
          member_id: string | null
          metadata: Json | null
          order_id: string | null
          redsys_order: string
          redsys_token: string | null
          redsys_token_expiry: string | null
          status: string
          subscription_id: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          cof_txn_id?: string | null
          context?: string
          created_at?: string
          currency?: string
          ds_authorization_code?: string | null
          ds_card_brand?: string | null
          ds_card_country?: string | null
          ds_response?: string | null
          id?: string
          is_mit?: boolean
          last_four?: string | null
          member_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          redsys_order: string
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          cof_txn_id?: string | null
          context?: string
          created_at?: string
          currency?: string
          ds_authorization_code?: string | null
          ds_card_brand?: string | null
          ds_card_country?: string | null
          ds_response?: string | null
          id?: string
          is_mit?: boolean
          last_four?: string | null
          member_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          redsys_order?: string
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author: string
          category: string
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          inventory: number | null
          option: Json | null
          price_cents: number
          product_id: string | null
          sku: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          inventory?: number | null
          option?: Json | null
          price_cents: number
          product_id?: string | null
          sku?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          inventory?: number | null
          option?: Json | null
          price_cents?: number
          product_id?: string | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_thumb"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          contact_email: string | null
          created_at: string | null
          enable_blog: boolean | null
          enable_subscriptions: boolean | null
          favicon_url: string | null
          footer_text: string | null
          id: number
          logo_url: string | null
          maintenance_mode: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          primary_color: string | null
          secondary_color: string | null
          site_description: string | null
          site_name: string
          support_email: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          enable_blog?: boolean | null
          enable_subscriptions?: boolean | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_description?: string | null
          site_name: string
          support_email?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          enable_blog?: boolean | null
          enable_subscriptions?: boolean | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: number
          logo_url?: string | null
          maintenance_mode?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_description?: string | null
          site_name?: string
          support_email?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          end_date: string | null
          id: string
          member_id: string
          payment_type: string
          plan_type: string
          redsys_cof_txn_id: string | null
          redsys_last_order: string | null
          redsys_token: string | null
          redsys_token_expiry: string | null
          renewal_failures: number | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id: string
          payment_type: string
          plan_type: string
          redsys_cof_txn_id?: string | null
          redsys_last_order?: string | null
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          renewal_failures?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string
          payment_type?: string
          plan_type?: string
          redsys_cof_txn_id?: string | null
          redsys_last_order?: string | null
          redsys_token?: string | null
          redsys_token_expiry?: string | null
          renewal_failures?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "miembros"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_member: boolean
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_member?: boolean
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_member?: boolean
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      cart_items_with_prices: {
        Row: {
          cart_id: string | null
          image_url: string | null
          price_cents: number | null
          product_name: string | null
          qty: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      products_with_thumb: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          min_price_cents: number | null
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          min_price_cents?: never
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          min_price_cents?: never
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_user_profile: {
        Args: { user_email: string; user_id: string; user_name?: string }
        Returns: undefined
      }
      create_user_safely: {
        Args: { user_email: string; user_name?: string; user_uuid: string }
        Returns: boolean
      }
      create_user_with_transaction: {
        Args: { user_email: string; user_name?: string; user_uuid: string }
        Returns: boolean
      }
      decrement_inventory: {
        Args: { qty: number; variant_id: string }
        Returns: undefined
      }
      get_auth_user_by_id: {
        Args: { user_id: string }
        Returns: {
          confirmed_at: string
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_auth_users: {
        Args: {
          page_number?: number
          page_size?: number
          search_query?: string
        }
        Returns: Database["public"]["Tables"]["users"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_auth_users_count: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      migrate_webusers_to_users: { Args: never; Returns: undefined }
      register_member: {
        Args: {
          subscription_id: string
          subscription_plan: string
          user_id: string
        }
        Returns: undefined
      }
      update_checkout_sessions: { Args: never; Returns: undefined }
      update_member_subscription: {
        Args: { status: string; subscription_id: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      block_reason_type:
        | "spam"
        | "inappropriate_behavior"
        | "violation_of_terms"
        | "security_risk"
        | "other"
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
      block_reason_type: [
        "spam",
        "inappropriate_behavior",
        "violation_of_terms",
        "security_risk",
        "other",
      ],
    },
  },
} as const
