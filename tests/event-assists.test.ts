import test from "node:test"
import assert from "node:assert/strict"
import {
  buildAuthorizedEventReturnUpdate,
  buildEventAssistPayload,
  upsertEventAssistForAuthorizedPayment,
} from "../src/lib/event-assists"

const authorizedTransaction = {
  id: "6f31d9d6-e545-406f-bf46-43f6ee41da91",
  event_id: "0ea75fdd-7ca8-4a0a-a437-fd1cb9e30fb3",
  member_id: "2b5b29dc-d2ec-4b67-96d6-dac0ed0f7e4d",
  redsys_order: "2605Eabc1234",
  amount_cents: 2000,
  currency: "978",
  status: "authorized",
  authorized_at: "2026-05-02T10:00:00.000Z",
  ds_authorization_code: "123456",
  last_four: "1234",
}

test("builds event assist payload from member profile before users fallback", () => {
  const payload = buildEventAssistPayload({
    transaction: authorizedTransaction,
    memberProfile: {
      email: "socio@example.com",
      name: "Lorenzo",
      apellido1: "Sanz",
      apellido2: "Duran",
      telefono: 665652251,
    },
    userProfile: {
      email: "user@example.com",
      name: "Fallback User",
    },
  })

  assert.equal(payload.event_id, authorizedTransaction.event_id)
  assert.equal(payload.user_id, authorizedTransaction.member_id)
  assert.equal(payload.payment_transaction_id, authorizedTransaction.id)
  assert.equal(payload.email, "socio@example.com")
  assert.equal(payload.name, "Lorenzo")
  assert.equal(payload.apellido1, "Sanz")
  assert.equal(payload.apellido2, "Duran")
  assert.equal(payload.phone, "665652251")
  assert.equal(payload.amount_cents, 2000)
  assert.equal(payload.currency, "978")
  assert.equal(payload.redsys_order, "2605Eabc1234")
  assert.equal(payload.payment_status, "authorized")
  assert.equal(payload.payment_authorized_at, "2026-05-02T10:00:00.000Z")
  assert.equal(payload.ds_authorization_code, "123456")
  assert.equal(payload.last_four, "1234")
  assert.equal(payload.data_confirmed_at, null)
})

test("builds event assist payload from users without splitting full name", () => {
  const payload = buildEventAssistPayload({
    transaction: authorizedTransaction,
    memberProfile: null,
    userProfile: {
      email: "madridista@example.com",
      name: "Nombre Compuesto Apellido Largo",
    },
  })

  assert.equal(payload.email, "madridista@example.com")
  assert.equal(payload.name, "Nombre Compuesto Apellido Largo")
  assert.equal(payload.apellido1, null)
  assert.equal(payload.apellido2, null)
  assert.equal(payload.phone, null)
})

test("builds an authorized update from matching Redsys event return params", () => {
  const update = buildAuthorizedEventReturnUpdate({
    transaction: {
      ...authorizedTransaction,
      status: "pending",
    },
    responseParams: {
      Ds_Order: "2605Eabc1234",
      Ds_Amount: "2000",
      Ds_Response: "0000",
      Ds_AuthorisationCode: "253641",
      Ds_Card_Brand: "1",
      Ds_Card_Country: "724",
    },
    lastFour: null,
    nowIso: "2026-05-02T10:33:00.000Z",
  })

  assert.deepEqual(update, {
    status: "authorized",
    ds_response: "0000",
    ds_authorization_code: "253641",
    ds_card_brand: "1",
    ds_card_country: "724",
    last_four: "1234",
    authorized_at: "2026-05-02T10:33:00.000Z",
    updated_at: "2026-05-02T10:33:00.000Z",
  })
})

test("does not build event return update when amount does not match", () => {
  const update = buildAuthorizedEventReturnUpdate({
    transaction: authorizedTransaction,
    responseParams: {
      Ds_Order: "2605Eabc1234",
      Ds_Amount: "1000",
      Ds_Response: "0000",
    },
    lastFour: null,
    nowIso: "2026-05-02T10:33:00.000Z",
  })

  assert.equal(update, null)
})

test("upserts authorized event assists by payment transaction id", async () => {
  const upserts: Array<{ payload: unknown; options: unknown }> = []
  const admin = {
    from(table: string) {
      if (table === "miembros") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: null,
                      error: null,
                    })
                  },
                }
              },
            }
          },
        }
      }

      if (table === "users") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: {
                        email: "madridista@example.com",
                        name: "Nombre Completo",
                      },
                      error: null,
                    })
                  },
                }
              },
            }
          },
        }
      }

      assert.equal(table, "event_assists")
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: null,
                    error: null,
                  })
                },
              }
            },
          }
        },
        upsert(payload: unknown, options: unknown) {
          upserts.push({ payload, options })
          return Promise.resolve({ error: null })
        },
      }
    },
  }

  await upsertEventAssistForAuthorizedPayment(admin, authorizedTransaction)
  await upsertEventAssistForAuthorizedPayment(admin, authorizedTransaction)

  assert.equal(upserts.length, 2)
  assert.deepEqual(upserts.map((call) => call.options), [
    { onConflict: "payment_transaction_id" },
    { onConflict: "payment_transaction_id" },
  ])
  assert.equal(
    (upserts[0].payload as { payment_transaction_id: string }).payment_transaction_id,
    authorizedTransaction.id,
  )
})
