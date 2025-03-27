// Common types used throughout the application

// User profile type
export interface UserProfile {
  id: string
  email?: string
  name?: string
  role?: string
  subscription_status?: string
  created_at?: string
  updated_at?: string
  user_metadata?: {
    name?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

// API response type
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Form submission result
export interface FormResult {
  success: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

// Blog post type
export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  author?: string
  category?: string
  created_at: string
  updated_at?: string
  image_url?: string
  [key: string]: unknown
}

// Event type
export interface Event {
  id: string
  title: string
  description: string
  date: string
  location?: string
  image_url?: string
  created_at: string
  [key: string]: unknown
}

// Stripe session type
export interface StripeSession {
  id: string
  url: string
  [key: string]: unknown
}

// Webhook event type
export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: {
      id: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

