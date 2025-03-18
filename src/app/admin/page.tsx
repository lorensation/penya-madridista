import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>Set up and manage Supabase webhooks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Configure webhooks to handle events from Supabase, such as user creation, updates, and deletions.
            </p>
            <Link href="/admin/webhooks">
              <Button>Manage Webhooks</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage users and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">View, edit, and manage user accounts and their permissions.</p>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>Manage blog posts and events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Create, edit, and publish blog posts and events for your website.</p>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

