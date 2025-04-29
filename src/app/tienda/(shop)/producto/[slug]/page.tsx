import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

import { AddToCartForm } from "@/components/shop/add-to-cart-form";
import { formatShopPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ProductVariant {
  id: string;
  sku: string;
  price_cents: number;
  inventory: number;
  stripe_price_id: string;
  option: Record<string, string>;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  category: string;
  product_variants: ProductVariant[];
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  category: string;
  min_price_cents: number | null;
}

type PageProps = {
  params: Promise<{ slug: string }>; // params is a **Promise**
};

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const { slug } = await params;          // await first!
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Producto no encontrado",
      description:
        "El producto que estás buscando no existe o no está disponible.",
    };
  }

  return {
    title: `${product.name} - Tienda Peña Lorenzo Sanz`,
    description:
      product.description ||
      "Producto oficial de la Peña Madridista Lorenzo Sanz",
  };
}

async function getProduct(slug: string): Promise<Product | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_variants(
        id,
        sku,
        price_cents,
        inventory,
        stripe_price_id,
        option,
        active
      )
    `
    )
    .eq("slug", slug)
    //.eq("active", true)
    .single();

  if (error || !data) return null;

  const variants = (data.product_variants || [])
    .filter((v: ProductVariant) => v.active)
    .map((v: ProductVariant) => ({ ...v, option: v.option || {} }));

  return { ...data, product_variants: variants };
}

async function getRelatedProducts(
  productId: string,
  category: string
): Promise<RelatedProduct[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,
      image_url,
      category,
      min_price_cents:product_variants(min(price_cents))
    `
    )
    //.eq("active", true)
    .eq("category", category)
    .neq("id", productId)
    .limit(4);

  if (error || !data) return [];

  return data.map((p) => ({
    ...p,
    min_price_cents:
      typeof p.min_price_cents?.[0]?.min === "number"
        ? p.min_price_cents[0].min
        : null,
  })) as RelatedProduct[];
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;          // await first!
  const product = await getProduct(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category
  );

  const optionTypes = product.product_variants.reduce(
    (types: string[], v: ProductVariant) =>
      [...new Set([...types, ...Object.keys(v.option || {})])],
    []
  );

  const lowestPrice = Math.min(
    ...product.product_variants.map((v) => v.price_cents)
  );
  const isOutOfStock = product.product_variants.every(
    (v) => v.inventory <= 0
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* ——— Back button ——— */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link
            href="/tienda"
            className="flex items-center text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Tienda
          </Link>
        </Button>

        {/* ——— Product ——— */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="aspect-square relative bg-white rounded-lg overflow-hidden border">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Details */}
          <div>
            <div className="mb-2">
              <Badge variant="outline" className="mb-2">
                {product.category}
              </Badge>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-2xl font-bold text-primary mt-2">
                {formatShopPrice(lowestPrice)}
              </p>
            </div>

            <Separator className="my-6" />

            {isOutOfStock && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                Producto agotado temporalmente
              </div>
            )}

            <div className="prose prose-stone max-w-none mb-6">
              <p>{product.description}</p>
            </div>

            <AddToCartForm
              product={product}
              variants={product.product_variants}
              optionTypes={optionTypes}
            />
          </div>
        </div>
      </div>

      {/* ——— Related products ——— */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Productos Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {relatedProducts.map((r) => (
              <Link
                key={r.id}
                href={`/tienda/producto/${r.slug}`}
                className="group"
              >
                <div className="aspect-square relative bg-white rounded-lg overflow-hidden border mb-3">
                  <Image
                    src={r.image_url}
                    alt={r.name}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <h3 className="font-medium group-hover:text-primary transition-colors">
                  {r.name}
                </h3>
                {r.min_price_cents && (
                  <p className="text-sm font-bold text-primary">
                    {formatShopPrice(r.min_price_cents)}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
