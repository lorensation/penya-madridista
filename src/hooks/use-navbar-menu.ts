"use client"

import { create } from 'zustand'

interface NavbarMenuState {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggle: () => void
}

// Create a store to manage the navbar menu state
export const useNavbarMenu = create<NavbarMenuState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))