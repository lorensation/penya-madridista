"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Phone } from "lucide-react"
import Image from "next/image"

// You should create a .env.local file with your Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'

interface CityManagerProps {
  name: string
  city: string
  whatsapp: string
  mapUrl: string
  countryCode: string
}

const cityManagers: CityManagerProps[] = [
  {
    name: "Hugo de Vicente",
    city: "Londres",
    whatsapp: "447387550544",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=London,UK&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|London,UK`,
    countryCode: "🇬🇧"
  },
  {
    name: "Tomás Giovanetti",
    city: "Buenos Aires",
    whatsapp: "549116832-6743",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=Buenos+Aires,Argentina&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|Buenos+Aires,Argentina`,
    countryCode: "🇦🇷"
  },
  {
    name: "Manuel Izquierdo",
    city: "Qatar",
    whatsapp: "971552047375",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=Doha,Qatar&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|Doha,Qatar`,
    countryCode: "🇶🇦"
  },
  {
    name: "Malula Sanz",
    city: "Dubái",
    whatsapp: "971507453300",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=Dubai,UAE&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|Dubai,UAE`,
    countryCode: "🇦🇪"
  },
  {
    name: "Alex Ponte",
    city: "Miami",
    whatsapp: "1305215-5049",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=Miami,USA&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|Miami,USA`,
    countryCode: "🇺🇸"
  },
  {
    name: "Jaime Homedes",
    city: "Paris",
    whatsapp: "34630394156",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=Paris,France&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|Paris,France`,
    countryCode: "🇫🇷"
  },
  {
    name: "Marcos Rollan",
    city: "Nueva York",
    whatsapp: "19172257557",
    mapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=New+York,USA&zoom=11&size=300x200&key=${GOOGLE_MAPS_API_KEY}&markers=color:red|New+York,USA`,
    countryCode: "🇺🇸"
  }
]

const CityManagerCard = ({ manager }: { manager: CityManagerProps }) => {
  const [mapLoadFailed, setMapLoadFailed] = useState(false)
  const showMapFallback = GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY' || mapLoadFailed

  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-[300px] h-[200px] rounded-md overflow-hidden">
          {showMapFallback ? (
            // Fallback when API key is missing or Google rejects map loading
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-gray-400" />
              <span className="absolute text-2xl">{manager.countryCode}</span>
            </div>
          ) : (
            <Image 
              src={manager.mapUrl} 
              alt={`Map of ${manager.city}`} 
              fill 
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              className="object-cover"
              priority
              unoptimized
              onError={() => setMapLoadFailed(true)}
            />
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-primary mb-1">{manager.city} {manager.countryCode}</h3>
          <p className="text-gray-600 mb-3">{manager.name}</p>
          
          <div className="flex items-center justify-center md:justify-start">
            <Phone className="h-4 w-4 text-primary mr-2" />
            <a 
              href={`https://wa.me/${manager.whatsapp}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CityManagers() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-2xl font-bold text-primary text-center">Contactos Internacionales</h2>
      <p className="text-gray-600 text-center mb-6 max-w-2xl mx-auto">
        Nuestra peña tiene representantes en diferentes ciudades del mundo. Contacta con el responsable de tu zona para más información.
      </p>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 w-full mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="europe">Europa</TabsTrigger>
          <TabsTrigger value="america">América</TabsTrigger>
          <TabsTrigger value="middle-east">Oriente Medio</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          {cityManagers.map((manager) => (
            <CityManagerCard key={manager.city} manager={manager} />
          ))}
        </TabsContent>
        <TabsContent value="europe" className="space-y-4">
          {cityManagers
            .filter(manager => ["Londres", "Paris"].includes(manager.city))
            .map((manager) => (
              <CityManagerCard key={manager.city} manager={manager} />
            ))}
        </TabsContent>
        <TabsContent value="america" className="space-y-4">
          {cityManagers
            .filter(manager => ["Buenos Aires", "Miami", "Nueva York"].includes(manager.city))
            .map((manager) => (
              <CityManagerCard key={manager.city} manager={manager} />
            ))}
        </TabsContent>
        <TabsContent value="middle-east" className="space-y-4">
          {cityManagers
            .filter(manager => ["Qatar", "Dubái"].includes(manager.city))
            .map((manager) => (
              <CityManagerCard key={manager.city} manager={manager} />
            ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
