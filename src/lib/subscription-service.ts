import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { PostgrestError } from "@supabase/supabase-js"

export type PlanType = 'under25' | 'over25' | 'family';
export type PaymentType = 'monthly' | 'annual' | 'decade';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';

export interface Subscription {
  id: string;
  member_id: string;
  plan_type: PlanType;
  payment_type: PaymentType;
  start_date?: string;
  end_date?: string;
  status: SubscriptionStatus;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
  redsys_token?: string;
  redsys_token_expiry?: string;
  redsys_cof_txn_id?: string;
  redsys_last_order?: string;
  renewal_failures?: number;
  created_at: string;
  updated_at: string;
}

// Define a proper error type for subscription operations
export interface SubscriptionError {
  message: string;
  code?: string;
  details?: unknown;
  originalError?: PostgrestError | Error;
}

// Client-side subscription service
export const subscriptionService = {
  /**
   * Get the current user's active subscription
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    const supabase = createBrowserSupabaseClient()
    
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      console.error('Error getting current user:', userError)
      return null
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', userData.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (error) {
      if (error.code !== 'PGRST116') { // No rows returned
        console.error('Error fetching subscription:', error)
      }
      return null
    }
    
    return data as Subscription
  },
  
  /**
   * Get all subscriptions for the current user
   */
  async getUserSubscriptions(): Promise<Subscription[]> {
    const supabase = createBrowserSupabaseClient()
    
    // Get the current user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      console.error('Error getting current user:', userError)
      return []
    }
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', userData.user.id)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return []
    }
    
    return data as Subscription[]
  },
  
  /**
   * Check if the current user has an active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription()
    return subscription !== null
  },
  
  /**
   * Get subscription details including formatted dates and status information
   */
  async getSubscriptionDetails(): Promise<{
    subscription: Subscription | null,
    isActive: boolean,
    formattedStartDate: string | null,
    formattedEndDate: string | null,
    daysRemaining: number | null,
    planName: string | null,
    paymentTypeName: string | null
  }> {
    const subscription = await this.getCurrentSubscription()
    
    if (!subscription) {
      return {
        subscription: null,
        isActive: false,
        formattedStartDate: null,
        formattedEndDate: null,
        daysRemaining: null,
        planName: null,
        paymentTypeName: null
      }
    }
    
    // Format dates
    const startDate = subscription.start_date ? new Date(subscription.start_date) : null
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null
    
    const formattedStartDate = startDate 
      ? startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
      
    const formattedEndDate = endDate
      ? endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    
    // Calculate days remaining
    const now = new Date()
    const daysRemaining = endDate 
      ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null
    
    // Get plan name
    const planNames: Record<PlanType, string> = {
      'under25': 'Membresía Joven (Menores de 25)',
      'over25': 'Membresía Adulto (Mayores de 25)',
      'family': 'Membresía Familiar'
    }
    
    // Get payment type name
    const paymentTypeNames: Record<PaymentType, string> = {
      'monthly': 'Mensual',
      'annual': 'Anual',
      'decade': 'Década'
    }
    
    return {
      subscription,
      isActive: subscription.status === 'active',
      formattedStartDate,
      formattedEndDate,
      daysRemaining,
      planName: planNames[subscription.plan_type] || null,
      paymentTypeName: paymentTypeNames[subscription.payment_type] || null
    }
  }
}

// Server-side subscription service (for server components and API routes)
export const serverSubscriptionService = {
  /**
   * Get a user's active subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (error) {
      if (error.code !== 'PGRST116') { // No rows returned
        console.error('Error fetching subscription:', error)
      }
      return null
    }
    
    return data as Subscription
  },
  
  /**
   * Get all subscriptions for a user
   */
  async getAllUserSubscriptions(userId: string): Promise<Subscription[]> {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', userId)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return []
    }
    
    return data as Subscription[]
  },
  
  /**
   * Create a new subscription record
   */
  async createSubscription(
    userId: string, 
    planType: PlanType, 
    paymentType: PaymentType,
    redsysData?: {
      token?: string,
      tokenExpiry?: string,
      cofTxnId?: string,
      lastOrder?: string,
    }
  ): Promise<{ success: boolean; error?: SubscriptionError; subscription?: Subscription }> {
    try {
      const supabase = await createServerSupabaseClient()
      
      // Ensure payment type is valid - normalize to one of the allowed values
      const normalizedPaymentType: PaymentType = 
        paymentType === 'annual' ? 'annual' : 
        paymentType === 'decade' ? 'decade' : 'monthly'
      
      // Calculate end date based on payment type
      const startDate = new Date()
      const endDate = new Date()
      
      if (normalizedPaymentType === 'decade') {
        endDate.setFullYear(endDate.getFullYear() + 10)
      } else if (normalizedPaymentType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }
      
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          member_id: userId,
          plan_type: planType,
          payment_type: normalizedPaymentType,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          redsys_token: redsysData?.token,
          redsys_token_expiry: redsysData?.tokenExpiry,
          redsys_cof_txn_id: redsysData?.cofTxnId,
          redsys_last_order: redsysData?.lastOrder,
        })
        .select()
        .single()
        
      if (error) throw error
      
      return { success: true, subscription: data as Subscription }
    } catch (error) {
      console.error('Error creating subscription:', error)
      return { 
        success: false, 
        error: {
          message: 'Failed to create subscription',
          originalError: error instanceof Error ? error : new Error(String(error))
        } 
      }
    }
  },
  
  /**
   * Update a subscription record
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<{ success: boolean; error?: SubscriptionError }> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Error updating subscription:', error)
      return { 
        success: false, 
        error: {
          message: 'Failed to update subscription',
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      }
    }
  },
  
  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; error?: SubscriptionError }> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return { 
        success: false, 
        error: {
          message: 'Failed to cancel subscription',
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      }
    }
  },
  
  /**
   * Check if a user has an active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return !!subscription && subscription.status === 'active'
  }
}