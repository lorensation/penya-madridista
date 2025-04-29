import Link from "next/link"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingBag, BarChart3, ClipboardList } from "lucide-react"

// This prevents static rendering attempts by Next.js
export const dynamic = "force-dynamic";

async function getProductCount() {
  const supabase = createServerComponentClient({ cookies })
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('Error getting product count:', error)
    return 0
  }
  
  return count || 0
}

async function getOrderCount() {
  const supabase = createServerComponentClient({ cookies })
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('Error getting order count:', error)
    return 0
  }
  
  return count || 0
}

async function getRecentOrders() {
  const supabase = createServerComponentClient({ cookies })
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error getting recent orders:', error)
    return []
  }
  
  return data || []
}

async function getLowInventoryProducts() {
  const supabase = createServerComponentClient({ cookies })
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, products(*)')
    .lt('inventory', 5)
    .order('inventory', { ascending: true })
    .limit(5)
  
  if (error) {
    console.error('Error getting low inventory products:', error)
    return []
  }
  
  return data || []
}

export default async function ShopAdminPage() {
  const productCount = await getProductCount()
  const orderCount = await getOrderCount()
  const recentOrders = await getRecentOrders()
  const lowInventoryProducts = await getLowInventoryProducts()
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Administración de Tienda</h1>
        
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/shop/products">
              Ver Productos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/shop/products/new">
              Nuevo Producto
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">
              productos en catalogo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCount}</div>
            <p className="text-xs text-muted-foreground">
              pedidos totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Ventas Mes Actual</CardTitle>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              pendiente de implementación
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Inventario Bajo</CardTitle>
            <ClipboardList className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowInventoryProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              productos con stock bajo
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Pedidos Recientes</TabsTrigger>
          <TabsTrigger value="inventory">Inventario Bajo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recientes</CardTitle>
              <CardDescription>
                Los últimos 5 pedidos realizados en la tienda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                    <div>ID</div>
                    <div>Fecha</div>
                    <div>Estado</div>
                    <div className="text-right">Importe</div>
                  </div>
                  
                  {recentOrders.map((order) => (
                    <div key={order.id} className="grid grid-cols-4 text-sm">
                      <div className="font-medium">
                        <Link href={`/admin/shop/orders/${order.id}`} className="text-blue-600 hover:underline">
                          #{order.id.substring(0, 8)}
                        </Link>
                      </div>
                      <div>{new Date(order.created_at).toLocaleDateString()}</div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'paid' ? 'Pagado' :
                           order.status === 'pending' ? 'Pendiente' :
                           order.status === 'fulfilled' ? 'Enviado' :
                           order.status === 'refunded' ? 'Reembolsado' : 
                           order.status}
                        </span>
                      </div>
                      <div className="text-right font-medium">
                        {((order.amount_cents || 0) / 100).toFixed(2)} €
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No hay pedidos recientes
                </p>
              )}
              
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/shop/orders">
                    Ver todos los pedidos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos con Inventario Bajo</CardTitle>
              <CardDescription>
                Productos con menos de 5 unidades en stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowInventoryProducts.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                    <div>Producto</div>
                    <div>Variante</div>
                    <div>SKU</div>
                    <div className="text-right">Stock</div>
                  </div>
                  
                  {lowInventoryProducts.map((variant) => (
                    <div key={variant.id} className="grid grid-cols-4 text-sm">
                      <div className="font-medium">
                        <Link href={`/admin/shop/products/${variant.products?.slug}`} className="text-blue-600 hover:underline">
                          {variant.products?.name}
                        </Link>
                      </div>
                      <div>
                        {variant.option?.size} 
                        {variant.option?.color && ` / ${variant.option.color}`}
                      </div>
                      <div>{variant.sku}</div>
                      <div className="text-right font-medium">
                        <span className={`${variant.inventory <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {variant.inventory}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No hay productos con inventario bajo
                </p>
              )}
              
              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/shop/products">
                    Ver todos los productos
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}