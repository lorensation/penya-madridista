import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function MembershipRedsysOkPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const orderParam = params.order
  const userIdParam = params.userId

  const order = Array.isArray(orderParam) ? orderParam[0] : orderParam
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam

  const url = new URL("/complete-profile", "https://dummy.local")
  if (order) {
    url.searchParams.set("order", order)
  }
  if (userId) {
    url.searchParams.set("userId", userId)
  }

  redirect(`${url.pathname}${url.search}`)
}
