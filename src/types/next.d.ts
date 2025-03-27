// src/types/next.d.ts
import "next"
//import * as NextAll from "next"

// Reopen the "next" module and re-export everything:
declare module "next" {
  //export * from NextAll

  // Then augment or override only what you need:
  interface PageProps {
    params?: {
      [key: string]: string | string[]
    }
    searchParams?: {
      [key: string]: string | string[] | undefined
    }
  }
}
