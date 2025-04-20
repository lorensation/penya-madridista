"use client"

import { useEffect } from "react"
import { initializeAnalytics } from "@/lib/analytics"

// Replace with your actual GA measurement ID
const GA_MEASUREMENT_ID = "G-XXXXXXXXXX" // TODO: Replace with your actual Google Analytics ID

export default function AnalyticsProvider() {
  useEffect(() => {
    // Initialize analytics with consent mode
    initializeAnalytics(GA_MEASUREMENT_ID)
  }, [])
  
  // This component doesn't render anything
  return null
}