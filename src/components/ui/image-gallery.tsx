"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

export interface ImageItem {
  name: string;
  url: string;
  thumbnailUrl?: string;
}

export interface ImageGalleryProps {
  bucketName: string;
  folderPath: string;
  title?: string;
  description?: string;
}

export function ImageGallery({ bucketName, folderPath, title, description }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function loadImages() {
      try {
        setLoading(true)
        // Only create the Supabase client when running in the browser
        const supabase = createBrowserSupabaseClient()

        // List all files from the specified bucket and folder
        const { data, error } = await supabase
          .storage
          .from(bucketName)
          .list(folderPath, {
            sortBy: { column: 'name', order: 'asc' }
          })

        if (error) {
          throw new Error(`Error loading images: ${error.message}`)
        }

        // Filter only image files and map them to our format
        const imageFiles = data
          ?.filter(file => !file.id.endsWith('/') && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map(file => {
            const publicUrl = supabase.storage
              .from(bucketName)
              .getPublicUrl(`${folderPath}/${file.name}`).data.publicUrl

            return {
              name: file.name,
              url: publicUrl,
              thumbnailUrl: publicUrl // Could use a thumbnail-specific URL if you have those
            }
          }) || []

        setImages(imageFiles)
      } catch (err) {
        console.error('Error loading gallery images:', err)
        setError('No se pudieron cargar las imágenes. Por favor, inténtalo de nuevo más tarde.')
      } finally {
        setLoading(false)
      }
    }

    loadImages()
  }, [bucketName, folderPath])

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index)
    setIsOpen(true)
  }

  const closeLightbox = useCallback(() => {
    setIsOpen(false)
  }, []);

  const goToPrevious = useCallback(() => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length)
  }, [selectedImageIndex, images.length])

  const goToNext = useCallback(() => {
    if (selectedImageIndex === null) return
    setSelectedImageIndex((selectedImageIndex + 1) % images.length)
  }, [selectedImageIndex, images.length])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'Escape':
          closeLightbox()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, goToPrevious, goToNext, closeLightbox])

  if (loading) {
    return (
      <div className="w-full min-h-[300px] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-gray-500">Cargando imágenes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full min-h-[200px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="w-full min-h-[200px] flex items-center justify-center">
        <p className="text-gray-500">No se encontraron imágenes en esta galería.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && <h2 className="text-2xl font-semibold mb-2">{title}</h2>}
      {description && <p className="text-gray-500 mb-6">{description}</p>}
      
      {/* Grid thumbnail view */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.name}
            className="relative aspect-square overflow-hidden rounded-md cursor-pointer transform transition-transform hover:scale-[1.02]"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={image.thumbnailUrl || image.url}
              alt={`Imagen histórica ${index + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-cover"
              priority={index < 4} // Prioritize loading the first 4 images
            />
          </div>
        ))}
      </div>

      {/* Lightbox View */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTitle className="sr-only">
          Galería de imágenes históricas
        </DialogTitle>
        <DialogContent 
          className="max-w-screen-lg w-screen h-[80vh] sm:h-[80vh] p-0 sm:p-1 border-none"
          aria-describedby="gallery-dialog-description"
        >
          <div id="gallery-dialog-description" className="sr-only">
            Visor de imágenes de la colección histórica. Use las flechas para navegar entre las imágenes.
          </div>
          <div className="relative w-full h-full flex flex-col bg-black/80">
            {/* Close button */}
            <Button 
              onClick={closeLightbox} 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 top-2 z-50 bg-black/30 text-white hover:bg-black/50 hover:text-white"
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Main image */}
            <div className="flex-grow flex items-center justify-center w-full h-full">
              {selectedImageIndex !== null && (
                <div className="relative w-full h-full">
                  <Image
                    src={images[selectedImageIndex].url}
                    alt={`Imagen histórica ${selectedImageIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 80vw"
                    priority
                  />
                </div>
              )}
            </div>
            
            {/* Navigation controls */}
            <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none">
              <Button 
                onClick={goToPrevious}
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white pointer-events-auto"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button 
                onClick={goToNext}
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white pointer-events-auto"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </div>
            
            {/* Caption/counter */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {selectedImageIndex !== null && (
                <span className="px-3 py-1 bg-black/50 rounded-full text-sm">
                  {selectedImageIndex + 1} / {images.length}
                </span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}