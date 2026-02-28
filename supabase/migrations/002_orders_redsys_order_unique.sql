-- Ensure idempotency for Redsys webhook fulfillment.
-- A retried notification must not create duplicated orders.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_redsys_order_key'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_redsys_order_key UNIQUE (redsys_order);
  END IF;
END
$$;
