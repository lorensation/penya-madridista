"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Phone } from "lucide-react"

interface CityManagerProps {
  name: string
  city: string
  whatsapp: string
  lat: number
  lon: number
  countryCode: string
}

function getEmbedUrl(lat: number, lon: number): string {
  const delta = 0.08
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
}

const cityManagers: CityManagerProps[] = [
  {
    name: "Hugo de Vicente",
    city: "Londres",
    whatsapp: "447387550544",
    lat: 51.5074,
    lon: -0.1278,
    countryCode: "🇬🇧"
  },
  {
    name: "Tomás Giovanetti",
    city: "Buenos Aires",
    whatsapp: "549116832-6743",
    lat: -34.6037,
    lon: -58.3816,
    countryCode: "🇦🇷"
  },
  {
    name: "Manuel Izquierdo",
    city: "Qatar",
    whatsapp: "971552047375",
    lat: 25.2854,
    lon: 51.5310,
    countryCode: "🇶🇦"
  },
  {
    name: "Malula Sanz",
    city: "Dubái",
    whatsapp: "971507453300",
    lat: 25.2048,
    lon: 55.2708,
    countryCode: "🇦🇪"
  },
  {
    name: "Alex Ponte",
    city: "Miami",
    whatsapp: "1305215-5049",
    lat: 25.7617,
    lon: -80.1918,
    countryCode: "🇺🇸"
  },
  {
    name: "Jaime Homedes",
    city: "Paris",
    whatsapp: "34630394156",
    lat: 48.8566,
    lon: 2.3522,
    countryCode: "🇫🇷"
  },
  {
    name: "Marcos Rollan",
    city: "Nueva York",
    whatsapp: "19172257557",
    lat: 40.7128,
    lon: -74.0060,
    countryCode: "🇺🇸"
  }
]

const CityManagerCard = ({ manager }: { manager: CityManagerProps }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:w-[300px] h-[200px] rounded-md overflow-hidden">
          <iframe
            src={getEmbedUrl(manager.lat, manager.lon)}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            title={`Map of ${manager.city}`}
            referrerPolicy="no-referrer"
          />
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
