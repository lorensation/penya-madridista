import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  price: string
  category?: string
  className?: string
  aspectRatio?: "portrait" | "square"
  width?: number
  height?: number
}

export function ProductCard({
  name,
  slug,
  description,
  imageUrl,
  price,
  category,
  className,
  aspectRatio = "square",
}: ProductCardProps) {
  return (
    <Link
      href={`/tienda/producto/${slug}`}
      className={cn("group block space-y-2", className)}
    >
      <div className={cn(
        "relative overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md",
        aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-square"
      )}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain transition-transform group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-100 text-gray-400">
            Sin imagen
          </div>
        )}
        
        {/* Display category badge if available */}
        {category && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
              {category}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Product info */}
      <div className="space-y-1">
        <h3 className="font-medium leading-none group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="font-medium text-primary">{price}</p>
        <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
      </div>
    </Link>
  )
}