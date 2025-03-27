"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setupWebhooks } from "@/app/actions/setup-webhooks"
import type { ApiResponse } from "@/types/common"

// Define a type for the webhook secret data
interface WebhookData {
  webhookSecret: string;
}

export default function WebhooksSetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse<WebhookData> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const baseUrl = "https://www.lorenzosanz.com"
  const webhookUrl = `${baseUrl}/api/webhooks/supabase`

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData(e.currentTarget)
      
      // Call the server action to update the webhook secret
      const response = await setupWebhooks(formData)
      
      if (response.success) {
        // Cast the response to the correct type
        setResult(response as ApiResponse<WebhookData>)
      } else {
        setError(response.error || "Failed to update webhook secret")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8">Supabase Webhook Management</h1>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Manage Webhook Secret</CardTitle>
              <CardDescription>
                Update the secret key used to verify webhook requests from Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result?.success && (
                <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
                  <AlertDescription>
                    <p>{result.message || "Webhook secret updated successfully"}</p>
                    {result.data && (
                      <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-sm break-all">
                        SUPABASE_WEBHOOK_SECRET={result.data.webhookSecret}
                      </div>
                    )}
                    <p className="mt-2">
                      Make sure to update this secret in your Supabase webhook configuration and in your environment variables.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-medium text-blue-800 mb-2">Active Webhook Configuration</h3>
                <p className="text-blue-700 mb-2">
                  Your webhook is configured at:
                </p>
                <div className="p-2 bg-white rounded font-mono text-sm break-all mb-2">
                  {webhookUrl}
                </div>
                <p className="text-blue-700 text-sm">
                  This page allows you to update the webhook secret. After updating, you&apos;ll need to:
                </p>
                <ol className="list-decimal text-blue-700 text-sm ml-5 mt-2">
                  <li>Copy the new secret</li>
                  <li>Update it in your Supabase dashboard (Project Settings → API → Webhooks)</li>
                  <li>Update your environment variable (SUPABASE_WEBHOOK_SECRET)</li>
                </ol>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="webhookUrl" value={webhookUrl} />
                
                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">New Webhook Secret</Label>
                  <Input 
                    id="webhookSecret" 
                    name="webhookSecret" 
                    placeholder="Leave blank to generate a new random secret" 
                  />
                  <p className="text-sm text-gray-500">
                    Enter a specific secret or leave blank to generate a random one.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Update Webhook Secret"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-gray-500">
                <h3 className="font-medium mb-2">How Webhook Verification Works:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Supabase signs each webhook request with the secret you configure in their dashboard.
                  </li>
                  <li>
                    Your API endpoint verifies this signature using the same secret stored in your environment variables.
                  </li>
                  <li>
                    If the signatures match, you know the request is genuinely from Supabase.
                  </li>
                  <li>
                    This prevents malicious actors from sending fake webhook events to your API.
                  </li>
                </ol>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}