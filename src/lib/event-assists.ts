interface DbErrorLike {
  message?: string
}

interface SingleResult<T> {
  data: T | null
  error: DbErrorLike | null
}

interface SelectSingleBuilder<T> {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<SingleResult<T>>
    }
  }
}

interface EventAssistsBuilder {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<SingleResult<{ data_confirmed_at: string | null }>>
    }
  }
  upsert(
    payload: Record<string, unknown>,
    options: { onConflict: string },
  ): Promise<{ error: DbErrorLike | null }>
  update(payload: Record<string, unknown>): {
    eq(column: string, value: string): Promise<{ error: DbErrorLike | null }>
  }
}

export interface EventAssistAdminClient {
  from(table: string): unknown
}

export interface EventAssistTransaction {
  id: string
  event_id: string | null
  member_id: string | null
  redsys_order: string
  amount_cents: number
  currency: string
  status: string
  authorized_at: string | null
  ds_authorization_code: string | null
  last_four: string | null
}

export interface EventAssistMemberProfile {
  email: string | null
  name: string | null
  apellido1: string | null
  apellido2: string | null
  telefono: number | string | null
}

export interface EventAssistUserProfile {
  email: string | null
  name: string | null
}

export interface EventAssistPayload {
  event_id: string
  user_id: string
  payment_transaction_id: string
  email: string
  name: string
  apellido1: string | null
  apellido2: string | null
  phone: string | null
  amount_cents: number
  currency: string
  redsys_order: string
  payment_status: string
  payment_authorized_at: string | null
  ds_authorization_code: string | null
  last_four: string | null
  data_confirmed_at: string | null
  updated_at: string
}

function trimOrNull(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

function errorMessage(error: DbErrorLike | null): string {
  return error?.message ?? "unknown"
}

export function buildEventAssistPayload(input: {
  transaction: EventAssistTransaction
  memberProfile?: EventAssistMemberProfile | null
  userProfile?: EventAssistUserProfile | null
  nowIso?: string
}): EventAssistPayload {
  const { transaction, memberProfile = null, userProfile = null } = input

  if (!transaction.event_id) {
    throw new Error("Event transaction is missing event_id")
  }

  if (!transaction.member_id) {
    throw new Error("Event transaction is missing user id")
  }

  const email = trimOrNull(memberProfile?.email) ?? trimOrNull(userProfile?.email)
  if (!email) {
    throw new Error("Event attendee email is missing")
  }

  const name =
    trimOrNull(memberProfile?.name) ??
    trimOrNull(userProfile?.name) ??
    email

  return {
    event_id: transaction.event_id,
    user_id: transaction.member_id,
    payment_transaction_id: transaction.id,
    email,
    name,
    apellido1: trimOrNull(memberProfile?.apellido1),
    apellido2: trimOrNull(memberProfile?.apellido2),
    phone: trimOrNull(memberProfile?.telefono),
    amount_cents: transaction.amount_cents,
    currency: transaction.currency || "978",
    redsys_order: transaction.redsys_order,
    payment_status: transaction.status,
    payment_authorized_at: transaction.authorized_at,
    ds_authorization_code: transaction.ds_authorization_code,
    last_four: transaction.last_four,
    data_confirmed_at: null,
    updated_at: input.nowIso ?? new Date().toISOString(),
  }
}

async function loadEventAssistIdentity(admin: EventAssistAdminClient, userId: string) {
  const memberResult = await (admin.from("miembros") as SelectSingleBuilder<EventAssistMemberProfile>)
    .select("email, name, apellido1, apellido2, telefono")
    .eq("user_uuid", userId)
    .maybeSingle()

  if (memberResult.error) {
    console.error("[event-assists] Failed loading member profile", {
      userId,
      error: memberResult.error,
    })
  }

  const userResult = await (admin.from("users") as SelectSingleBuilder<EventAssistUserProfile>)
    .select("email, name")
    .eq("id", userId)
    .maybeSingle()

  if (userResult.error) {
    console.error("[event-assists] Failed loading user profile", {
      userId,
      error: userResult.error,
    })
  }

  return {
    memberProfile: memberResult.error ? null : memberResult.data,
    userProfile: userResult.error ? null : userResult.data,
  }
}

export async function upsertEventAssistForAuthorizedPayment(
  admin: EventAssistAdminClient,
  transaction: EventAssistTransaction,
): Promise<void> {
  if (transaction.status !== "authorized") {
    return
  }

  if (!transaction.member_id) {
    throw new Error("Event transaction is missing user id")
  }

  const { memberProfile, userProfile } = await loadEventAssistIdentity(
    admin,
    transaction.member_id,
  )
  const payload = buildEventAssistPayload({
    transaction,
    memberProfile,
    userProfile,
  })

  const eventAssists = admin.from("event_assists") as EventAssistsBuilder
  const existingResult = await eventAssists
    .select("data_confirmed_at")
    .eq("payment_transaction_id", transaction.id)
    .maybeSingle()

  if (existingResult.error) {
    throw new Error(`Failed checking event assist: ${errorMessage(existingResult.error)}`)
  }

  if (existingResult.data?.data_confirmed_at) {
    const updateResult = await eventAssists.update({
      amount_cents: payload.amount_cents,
      currency: payload.currency,
      payment_status: payload.payment_status,
      payment_authorized_at: payload.payment_authorized_at,
      ds_authorization_code: payload.ds_authorization_code,
      last_four: payload.last_four,
      updated_at: payload.updated_at,
    }).eq("payment_transaction_id", transaction.id)

    if (updateResult.error) {
      throw new Error(`Failed updating event assist payment data: ${errorMessage(updateResult.error)}`)
    }

    return
  }

  const upsertPayload = {
    event_id: payload.event_id,
    user_id: payload.user_id,
    payment_transaction_id: payload.payment_transaction_id,
    email: payload.email,
    name: payload.name,
    apellido1: payload.apellido1,
    apellido2: payload.apellido2,
    phone: payload.phone,
    amount_cents: payload.amount_cents,
    currency: payload.currency,
    redsys_order: payload.redsys_order,
    payment_status: payload.payment_status,
    payment_authorized_at: payload.payment_authorized_at,
    ds_authorization_code: payload.ds_authorization_code,
    last_four: payload.last_four,
    updated_at: payload.updated_at,
  }
  const upsertResult = await eventAssists.upsert(
    upsertPayload,
    { onConflict: "payment_transaction_id" },
  )

  if (upsertResult.error) {
    throw new Error(`Failed upserting event assist: ${errorMessage(upsertResult.error)}`)
  }
}
