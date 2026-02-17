// DEPRECATED: Stripe subscription management replaced by RedSys.
// TODO: Delete this file and directory

import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Stripe subscription management has been replaced by RedSys recurring payments." },
    { status: 410 }
  )
}

