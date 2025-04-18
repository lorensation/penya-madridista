export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          is_member: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          is_member?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          is_member?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      miembros: {
        Row: {
          user_id: number
          user_uuid: string | null
          dni_pasaporte: string
          name: string
          apellido1: string
          apellido2: string | null
          telefono: number
          email: string
          fecha_nacimiento: string
          es_socio_realmadrid: boolean
          num_socio: number | null
          socio_carnet_madridista: boolean
          num_carnet: number | null
          direccion: string
          direccion_extra: string | null
          poblacion: string | null
          cp: number | null
          provincia: string | null
          pais: string | null
          nacionalidad: string
          cargo_directivo: string | null
          created_at: string
          auth_id: string
          role: string | null
          subscription_status: string | null
          subscription_plan: string | null
          subscription_id: string | null
          subscription_updated_at: string | null
          stripe_customer_id: string | null
          last_four: string | null
          email_notifications: boolean | null
          marketing_emails: boolean | null
        }
        Insert: {
          user_id: number
          user_uuid?: string | null
          dni_pasaporte: string
          name: string
          apellido1: string
          apellido2?: string | null
          telefono: number
          email: string
          fecha_nacimiento: string
          es_socio_realmadrid: boolean
          num_socio?: number | null
          socio_carnet_madridista: boolean
          num_carnet?: number | null
          direccion: string
          direccion_extra?: string | null
          poblacion?: string | null
          cp?: number | null
          provincia?: string | null
          pais?: string | null
          nacionalidad: string
          cargo_directivo?: string | null
          created_at?: string
          auth_id: string
          role?: string | null
          subscription_status?: string | null
          subscription_plan?: string | null
          subscription_id?: string | null
          subscription_updated_at?: string | null
          stripe_customer_id?: string | null
          last_four?: string | null
          email_notifications?: boolean | null
          marketing_emails?: boolean | null
        }
        Update: {
          user_id?: number
          user_uuid?: string | null
          dni_pasaporte?: string
          name?: string
          apellido1?: string
          apellido2?: string | null
          telefono?: number
          email?: string
          fecha_nacimiento?: string
          es_socio_realmadrid?: boolean
          num_socio?: number | null
          socio_carnet_madridista?: boolean
          num_carnet?: number | null
          direccion?: string
          direccion_extra?: string | null
          poblacion?: string | null
          cp?: number | null
          provincia?: string | null
          pais?: string | null
          nacionalidad?: string
          cargo_directivo?: string | null
          created_at?: string
          auth_id?: string
          role?: string | null
          subscription_status?: string | null
          subscription_plan?: string | null
          subscription_id?: string | null
          subscription_updated_at?: string | null
          stripe_customer_id?: string | null
          last_four?: string | null
          email_notifications?: boolean | null
          marketing_emails?: boolean | null
        }
      }
      checkout_sessions: {
        Row: {
          id: string
          created_at: string | null
          user_id: string
          user_uuid: string | null
          session_id: string
          price_id: string
          plan_type: string
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          user_id: string
          user_uuid?: string | null
          session_id: string
          price_id: string
          plan_type: string
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          user_id?: string
          user_uuid?: string | null
          session_id?: string
          price_id?: string
          plan_type?: string
          status?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          status: string
          price_id: string
          quantity: number
          cancel_at_period_end: boolean
          created_at: string
          current_period_start: string
          current_period_end: string
          ended_at: string | null
          cancel_at: string | null
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
        }
        Insert: {
          id: string
          user_id: string
          status: string
          price_id: string
          quantity?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          price_id?: string
          quantity?: number
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_start?: string
          current_period_end?: string
          ended_at?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
        }
      }
      posts: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          title: string
          slug: string
          content: string
          excerpt: string | null
          author: string
          category: string
          image_url: string | null
          published: boolean
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          title: string
          slug: string
          content: string
          excerpt?: string | null
          author: string
          category: string
          image_url?: string | null
          published?: boolean
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          author?: string
          category?: string
          image_url?: string | null
          published?: boolean
        }
      }
      events: {
        Row: {
          id: string
          created_at: string | null
          updated_at: string | null
          title: string
          description: string | null
          date: string
          time: string | null
          location: string | null
          capacity: number | null
          available: number | null
          image_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          title: string
          description?: string | null
          date: string
          time?: string | null
          location?: string | null
          capacity?: number | null
          available?: number | null
          image_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          updated_at?: string | null
          title?: string
          description?: string | null
          date?: string
          time?: string | null
          location?: string | null
          capacity?: number | null
          available?: number | null
          image_url?: string | null
        }
      }
      newsletter_subscribers: {
        Row: {
          id: string
          created_at: string | null
          email: string
          name: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          email: string
          name?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          email?: string
          name?: string | null
          status?: string | null
        }
      }
      junta_directiva: {
        Row: {
          user_id: number
          user_uuid: string | null
          name: string
          apellido1: string
          apellido2: string
          dni_pasaporte: string
          cargo: string
        }
        Insert: {
          user_id: number
          user_uuid?: string | null
          name: string
          apellido1: string
          apellido2: string
          dni_pasaporte: string
          cargo: string
        }
        Update: {
          user_id?: number
          user_uuid?: string | null
          name?: string
          apellido1?: string
          apellido2?: string
          dni_pasaporte?: string
          cargo?: string
        }
      }
    }
  }
}

