"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import Image from "next/image"

export default function PetitionPopup() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  
  // Delay showing the popup initially
  useEffect(() => {
    // Check if the popup has been shown before
    const hasShownBefore = localStorage.getItem("petitionPopupShown")
    
    if (!hasShownBefore) {
      const timer = setTimeout(() => {
        setShowPopup(true)
        setOpen(true)
      }, 3000) // Show popup after 3 seconds
      
      return () => clearTimeout(timer)
    } else {
      setShowPopup(true)
      setMinimized(true)
    }
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    
    // If closing the dialog, set to minimized mode
    if (!newOpen) {
      setMinimized(true)
      localStorage.setItem("petitionPopupShown", "true")
    }
  }

  const handleMinimizedClick = () => {
    setMinimized(false)
    setOpen(true)
  }

  const handleSignPetition = () => {
    // Open change.org petition in a new tab
    window.open("https://change.org/calle-lorenzosanz", "_blank")
    
    // Close the popup
    setOpen(false)
    setMinimized(true)
    localStorage.setItem("petitionPopupShown", "true")
  }

  if (!showPopup) return null

  return (
    <>
      {/* Full popup dialog */}
      <Dialog open={open && !minimized} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
          <div className="relative w-full h-40 bg-gradient-to-r from-primary to-secondary">
            <Image 
              src="/lorenzosanz-bufanda.jpg" 
              alt="Lorenzo Sanz" 
              fill
              className="object-cover mix-blend-soft-light opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-2xl font-bold text-white text-center px-4">
                Calle Lorenzo Sanz
              </h2>
            </div>
          </div>
          
          <div className="p-6 text-center">
            <p className="text-lg mb-6">
              Ayúdanos a conseguir una calle en Madrid en honor a Lorenzo Sanz, para perpetuar el legado y nombre de un gran presidente y una gran persona que hizo tanto por nosotros.
            </p>
            
            <Button 
              onClick={handleSignPetition}
              className="w-full bg-primary hover:bg-white hover:text-primary hover:border hover:border-black transition-all py-6 text-lg font-medium"
            >
              Firma la petición en Change.org
            </Button>
            
            <p className="text-xs text-gray-500 mt-4">
              Tu apoyo es importante para honrar su legado
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Minimized floating button */}
      {minimized && !open && (
        <button
          onClick={handleMinimizedClick}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          title="Apoya nuestra petición"
        >
          <FileText className="h-6 w-6 text-white" />
        </button>
      )}
    </>
  )
}