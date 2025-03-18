"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setupSupabaseWebhook } from "@/app/actions/setup-webhooks"

export default function WebhooksSetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData(e.currentTarget)
      const response = await setupSupabaseWebhook(formData)

      if (response.error) {
        throw new Error(response.error)
      }

      setResult(response)
    } catch (error: any) {
      setError(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-primary mb-8">Supabase Webhook Setup</h1>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Configure Webhook</CardTitle>
              <CardDescription>
                Set up a webhook to handle Supabase events like user creation, updates, and deletions.
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
                    <p>{result.message}</p>
                    <div className="mt-2 p-2 bg-gray-100 rounded font-mono text-sm break-all">
                      SUPABASE_WEBHOOK_SECRET={result.webhookSecret}
                    </div>
                    <p className="mt-2">
                      Add this to your environment variables in your Vercel project settings or .env.local file.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input id="webhookUrl" name="webhookUrl" defaultValue={`${baseUrl}/api/webhooks/supabase`} required />
                  <p className="text-sm text-gray-500">This is the URL that Supabase will send webhook events to.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
                  <Input id="webhookSecret" name="webhookSecret" placeholder="Leave blank to generate one" />
                  <p className="text-sm text-gray-500">
                    A secret key used to verify webhook requests. If left blank, one will be generated for you.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Setting up..." : "Set Up Webhook"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-gray-500">
                <h3 className="font-medium mb-2">Manual Setup Instructions:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    Go to your Supabase project dashboard and navigate to{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">Project Settings &gt; API</span>.
                  </li>
                  <li>
                    Scroll down to the <span className="font-mono bg-gray-100 px-1 rounded">Webhooks</span> section and
                    click <span className="font-mono bg-gray-100 px-1 rounded">Create webhook</span>.
                  </li>
                  <li>
                    Enter the webhook URL:{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">{`${baseUrl}/api/webhooks/supabase`}</span>
                  </li>
                  <li>
                    Select the events you want to trigger the webhook (e.g.,{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">user.created</span>).
                  </li>
                  <li>
                    Generate a webhook secret and add it to your environment variables as{" "}
                    <span className="font-mono bg-gray-100 px-1 rounded">SUPABASE_WEBHOOK_SECRET</span>.
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

