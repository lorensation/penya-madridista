import { NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  buildExportRows,
  buildOperationsWorkbook,
  decodeRedsysCsvBuffer,
  deriveOperationsFileName,
  deriveStoragePath,
  parseRedsysExportCsv,
  REDSYS_OPERATIONS_BUCKET,
  type MiembroIdentity,
  type PaymentTransactionIdentity,
  type UserIdentity,
} from "@/lib/redsys/operations-export"
import type { SupabaseClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

async function ensureRedsysOperationsBucket(admin: SupabaseClient) {
  const { data, error } = await admin.storage.getBucket(REDSYS_OPERATIONS_BUCKET)

  if (data && !error) {
    return
  }

  const { error: createError } = await admin.storage.createBucket(REDSYS_OPERATIONS_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  })

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(`Failed ensuring storage bucket: ${createError.message}`)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return jsonError("Unauthorized", 401)
    }

    const { data: profile, error: profileError } = await supabase
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .maybeSingle()

    if (profileError) {
      return jsonError("Error checking admin permissions", 500)
    }

    if (profile?.role !== "admin") {
      return jsonError("Forbidden: Admin access required", 403)
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonError("CSV file is required", 400)
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return jsonError("Only CSV files are supported", 400)
    }

    const csv = decodeRedsysCsvBuffer(await file.arrayBuffer())
    const operations = parseRedsysExportCsv(csv)

    if (operations.length === 0) {
      return jsonError("No authorized Redsys operations found in the CSV", 400)
    }

    const admin = createAdminSupabaseClient()
    const orders = Array.from(new Set(operations.map((operation) => operation.order).filter(Boolean)))
    const { data: transactions, error: transactionsError } = await admin
      .from("payment_transactions")
      .select("redsys_order, member_id")
      .in("redsys_order", orders)

    if (transactionsError) {
      return jsonError(`Failed loading payment transactions: ${transactionsError.message}`, 500)
    }

    const memberIds = Array.from(
      new Set((transactions ?? []).map((transaction) => transaction.member_id).filter((value): value is string => Boolean(value))),
    )

    const [miembrosResult, usersResult] =
      memberIds.length > 0
        ? await Promise.all([
            admin
              .from("miembros")
              .select("user_uuid, name, apellido1, apellido2, dni_pasaporte, email")
              .in("user_uuid", memberIds),
            admin.from("users").select("id, name, email").in("id", memberIds),
          ])
        : [
            { data: [] as MiembroIdentity[], error: null },
            { data: [] as UserIdentity[], error: null },
          ]

    if (miembrosResult.error) {
      return jsonError(`Failed loading member profiles: ${miembrosResult.error.message}`, 500)
    }

    if (usersResult.error) {
      return jsonError(`Failed loading users: ${usersResult.error.message}`, 500)
    }

    const exportRows = buildExportRows(operations, {
      transactions: (transactions ?? []) as PaymentTransactionIdentity[],
      miembros: (miembrosResult.data ?? []) as MiembroIdentity[],
      users: (usersResult.data ?? []) as UserIdentity[],
    })
    const fileName = deriveOperationsFileName(operations)
    const storagePath = deriveStoragePath(fileName)
    const workbook = await buildOperationsWorkbook(exportRows.rows)

    await ensureRedsysOperationsBucket(admin)

    const { error: uploadError } = await admin.storage.from(REDSYS_OPERATIONS_BUCKET).upload(storagePath, workbook, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) {
      return jsonError(`Failed uploading generated workbook: ${uploadError.message}`, 500)
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from(REDSYS_OPERATIONS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return jsonError(`Failed creating signed download URL: ${signedUrlError?.message ?? "No signed URL returned"}`, 500)
    }

    return NextResponse.json({
      ok: true,
      fileName,
      storagePath,
      signedUrl: signedUrlData.signedUrl,
      rowCount: exportRows.rows.length,
      matchedCount: exportRows.matchedCount,
      fallbackUserCount: exportRows.fallbackUserCount,
      unmatchedCount: exportRows.unmatchedCount,
    })
  } catch (error) {
    console.error("Redsys operations export error:", error)
    return jsonError(error instanceof Error ? error.message : "Internal server error", 500)
  }
}
