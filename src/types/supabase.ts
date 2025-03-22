export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      webusers: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      miembros: {
        Row: {
          id: string
          user_id: string
          dni_pasaporte: string
          name: string
          apellido1: string
          apellido2?: string
          telefono: string
          email: string
          fecha_nacimiento: string
          es_socio_realmadrid: boolean
          num_socio?: string
          socio_carnet_madrid?: string
          num_carnet?: string
          direccion: string
          direccion_extra?: string
          poblacion: string
          cp: string
          provincia: string
          pais: string
          nacionalidad: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dni_pasaporte: string
          name: string
          apellido1: string
          apellido2?: string
          telefono: string
          email: string
          fecha_nacimiento: string
          es_socio_realmadrid: boolean
          num_socio?: string
          socio_carnet_madrid?: string
          num_carnet?: string
          direccion: string
          direccion_extra?: string
          poblacion: string
          cp: string
          provincia: string
          pais: string
          nacionalidad: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dni_pasaporte?: string
          name?: string
          apellido1?: string
          apellido2?: string
          telefono?: string
          email?: string
          fecha_nacimiento?: string
          es_socio_realmadrid?: boolean
          num_socio?: string
          socio_carnet_madrid?: string
          num_carnet?: string
          direccion?: string
          direccion_extra?: string
          poblacion?: string
          cp?: string
          provincia?: string
          pais?: string
          nacionalidad?: string
          created_at?: string
          updated_at?: string
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
    }
  }
}

