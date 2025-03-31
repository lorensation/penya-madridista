import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Users, Settings, CreditCard, Webhook } from "lucide-react"

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Blog Management
            </CardTitle>
            <CardDescription>Create, edit, and manage blog posts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Manage all blog content including creating new posts, editing existing ones, and removing outdated
              content.
            </p>
            <Link href="/admin/blog">
              <Button>Manage Blog</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>Manage users and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">View, edit, and manage user accounts, roles, and permissions.</p>
            <Link href="/admin/users">
              <Button>Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Webhook className="mr-2 h-5 w-5 text-primary" />
              Webhook Configuration
            </CardTitle>
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
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Subscription Fixes
            </CardTitle>
            <CardDescription>Fix user subscription issues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Manually update subscription status for users when webhooks fail or other issues occur.
            </p>
            <Link href="/admin/fix-subscription">
              <Button>Fix Subscriptions</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              Site Settings
            </CardTitle>
            <CardDescription>Configure website settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Manage global site settings, configurations, and preferences.</p>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

