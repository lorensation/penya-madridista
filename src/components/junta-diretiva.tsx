"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BoardMember {
  id: number;
  name: string;
  title: string;
  description: string;
  image: string;
}

export default function JuntaDirectiva() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Board members data
  const boardMembers: BoardMember[] = [
    {
      id: 1,
      name: "Lorenzo Sanz Duran",
      title: "Presidente",
      description: "Lidera la peña con dedicación y pasión por el Real Madrid desde su fundación.",
      image: "/presidente.jpg",
    },
    {
      id: 2,
      name: "Joaquín Napoleón Calderón Barrios",
      title: "Vicepresidente",
      description: "Apoya la dirección estratégica y representa a la peña en eventos.",
      image: "/vicepresidente2.jpg",
    },
    {
      id: 3,
      name: "Luis Yáñez Sanz",
      title: "Secretario",
      description: "Responsable de la documentación oficial y comunicaciones de la peña.",
      image: "/secretario.jpg",
    },
    {
      id: 4,
      name: "Carla Mª Salgado Fernández",
      title: "Tesorera y Vocal",
      description: "Gestiona las finanzas y participa activamente en la toma de decisiones.",
      image: "/tesorera-vocal2.jpg",
    },
    {
      id: 5,
      name: "Diego Calleja de Pinedo",
      title: "Vocal",
      description: "Aporta su visión y experiencia en la planificación de actividades.",
      image: "/vocal1.jpg",
    },
    {
      id: 6,
      name: "Miguel Redondo González",
      title: "Vocal",
      description: "Colabora en la organización de eventos y representa a los socios.",
      image: "/vocal2.jpg",
    },
    {
      id: 7,
      name: "Fabián Blanco Ortiz",
      title: "Vocal",
      description: "Contribuye con nuevas ideas para el crecimiento de la peña.",
      image: "/vocal3.jpg",
    },
    {
       id: 8,
       name: "Rodrigo Sanz Trucharte",
       title: "Director de Actividades",
       description: "Encargado de la planificación y ejecución de eventos y actividades.",
       image: "/director-actividades.jpg",
    },
  ];

  // Check screen size on mount and window resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Calculate visible cards based on screen size
  const visibleCards = isMobile ? 1 : Math.min(3, boardMembers.length);

  // Move to previous slide - wrapped in useCallback
  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? Math.max(0, boardMembers.length - visibleCards) : Math.max(0, prevIndex - 1)
    );
  }, [boardMembers.length, visibleCards]);

  // Move to next slide - wrapped in useCallback
  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= boardMembers.length - visibleCards ? 0 : prevIndex + 1
    );
  }, [boardMembers.length, visibleCards]);

  // Auto-scroll effect (optional, can be removed if not needed)
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <div className="w-full py-8 px-4">
      <h2 className="text-3xl font-bold text-center mb-8">Junta Directiva</h2>
      
      <div className="relative max-w-6xl mx-auto">
        {/* Previous button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white -ml-4 md:-ml-6"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {/* Card slider */}
        <div
          ref={sliderRef}
          className="overflow-hidden py-4"
        >
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
          >
            {boardMembers.map((member) => (
              <div 
                key={member.id} 
                className="w-full px-2 md:px-4"
                style={{ flex: `0 0 ${100 / visibleCards}%` }}
              >
                <Card className="h-full transform transition-all duration-300 hover:scale-105 overflow-hidden">
                  <CardContent className="p-6 flex flex-col items-center h-full">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-2 border-primary">
                      <Image 
                        src={member.image} 
                        alt={member.name}
                        fill
                        sizes="(max-width: 768px) 128px, 128px"
                        className="object-cover"
                        onError={(e) => {
                          // Fallback for missing images
                          const target = e.target as HTMLImageElement;
                          target.src = "/logo-rm-icon.png";
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-center flex-grow justify-between">
                      <div className="flex flex-col items-center">
                        <h3 className="text-xl font-semibold text-center mb-2">{member.name}</h3>
                        <div className="bg-primary text-white px-3 py-1 rounded-full text-sm mb-4">
                          {member.title}
                        </div>
                      </div>
                      <p className="text-center text-gray-600">{member.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white -mr-4 md:-mr-6"
          onClick={nextSlide}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Dots navigation */}
        <div className="flex justify-center mt-6">
          {Array.from({ length: Math.ceil(boardMembers.length / visibleCards) }).map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 mx-1 rounded-full ${
                Math.floor(currentIndex / visibleCards) === index
                  ? "bg-primary"
                  : "bg-gray-300"
              }`}
              onClick={() => setCurrentIndex(index * visibleCards)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}