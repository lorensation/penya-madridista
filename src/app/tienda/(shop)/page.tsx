import { Metadata } from "next"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase"
import { ProductCard } from "@/components/shop/product-card"
import { Badge } from "@/components/ui/badge"
import { formatShopPrice } from "@/lib/utils"

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Tienda - Peña Lorenzo Sanz",
  description: "Descubre la colección oficial de productos de la Peña Madridista Lorenzo Sanz",
}

// Define a mapping for category display names
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'Tshirt': 'Camisetas',
  'Polo': 'Polos',
  'Accesories': 'Accesorios',
  'Pants': 'Pantalones',
  'Banners': 'Banderas',
  // Add other mappings as needed
};

// Helper function to get display name for a category
function getCategoryDisplayName(dbCategory: string): string {
  return CATEGORY_DISPLAY_NAMES[dbCategory] || dbCategory;
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  category: string
  min_price_cents: number | null
}

async function getProducts(category?: string): Promise<Product[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Build query to fetch products
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        image_url,
        category,
        created_at
      `)
    
    // Apply category filter if specified
    if (category) {
      query = query.eq('category', category)
    }
    
    // Execute the query
    const { data: productsData, error: productsError } = await query.order('created_at', { ascending: false })
    
    if (productsError) {
      console.error('Error fetching products:', productsError)
      return []
    }

    // For each product, get the minimum price from its variants
    const productsWithPrices = await Promise.all(
      productsData.map(async (product) => {
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('price_cents')
          .eq('product_id', product.id)
          .order('price_cents', { ascending: true })
          .limit(1)
        
        const minPrice = variantsError || !variantsData || variantsData.length === 0
          ? null
          : variantsData[0].price_cents
        
        return {
          ...product,
          min_price_cents: minPrice
        }
      })
    )
    
    return productsWithPrices
  } catch (error) {
    console.error('Error in getProducts:', error)
    return []
  }
}

async function getCategories(): Promise<string[]> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Fetch distinct categories from the products table
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .order('category')
      
    if (error) {
      console.error('Error fetching categories:', error)
      return ["Tshirt", "Polo", "Accesories", "Pants", "Banners"]
    }
    
    // Extract unique categories
    const categories = Array.from(new Set(data.map(item => item.category)))
    
    // If no categories found, return default list
    if (categories.length === 0) {
      return ["Tshirt", "Polo", "Accesories", "Pants", "Banners"]
    }
    
    return categories
  } catch (error) {
    console.error('Error in getCategories:', error)
    return ["Tshirt", "Polo", "Accesories", "Pants", "Banners"]
  }
}

// Use the ReadonlyURLSearchParams type for searchParams
export default async function ShopPage({ 
// `searchParams` is now a *Promise* in Next 15
  searchParams,
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; 
}) {
  // Unwrap the promise *before* using `.category`
  const params = await searchParams;
  const categoryRaw = params?.category;
  const selectedCategory = Array.isArray(categoryRaw) 
      ? categoryRaw[0] 
      : categoryRaw;
  
  const [products, categories] = await Promise.all([
    getProducts(selectedCategory),
    getCategories(),
  ]);
  
  return (
    <div className="space-y-8">
      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/tienda" className="no-underline">
            <Badge variant={!selectedCategory ? "secondary" : "outline"} className="hover:bg-primary/10 cursor-pointer">
              Todos
            </Badge>
          </Link>
          {categories.map(category => (
            <Link key={category} href={`/tienda?category=${encodeURIComponent(category)}`} className="no-underline">
              <Badge 
                variant={selectedCategory === category ? "secondary" : "outline"} 
                className="hover:bg-primary/10 cursor-pointer"
              >
                {getCategoryDisplayName(category)}
              </Badge>
            </Link>
          ))}
        </div>
      )}
      
      {/* Products Grid */}
      <div id="products">
        <h2 className="text-2xl font-bold mb-6">
          {selectedCategory ? getCategoryDisplayName(selectedCategory) : 'Nuestros Productos'}
        </h2>
        {products.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-gray-500">No hay productos disponibles{selectedCategory ? ` en ${getCategoryDisplayName(selectedCategory)}` : ''} actualmente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                description={product.description}
                imageUrl={product.image_url}
                price={product.min_price_cents !== null ? formatShopPrice(product.min_price_cents) : 'Agotado'}
                category={getCategoryDisplayName(product.category)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}