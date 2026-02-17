-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Stripe → RedSys/Getnet
-- Validated against live Supabase schema (project dlijdwtlrmutbcdyeugq)
-- Extracted: Functions, Primary Keys, RLS policies, CHECK constraints, UNIQUEs
--
-- Existing tables: orders, order_items, subscriptions, miembros, users,
--   products, product_variants, carts, cart_items, checkout_sessions,
--   blocked_users, events, inventory_log, member_invites, newsletter_subscribers,
--   posts, site_settings, junta_directiva
--
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query).
-- This migration is IDEMPOTENT — safe to run multiple times.
-- ══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  1. payment_transactions — NEW table, central ledger for RedSys ops        │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS payment_transactions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  redsys_order    varchar(12) NOT NULL UNIQUE,
  transaction_type varchar(4) NOT NULL DEFAULT '0',
  amount_cents    integer NOT NULL DEFAULT 0,
  currency        varchar(4) NOT NULL DEFAULT '978',
  status          varchar(20) NOT NULL DEFAULT 'pending',
  context         varchar(20) NOT NULL DEFAULT 'shop',
  member_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid,
  order_id        uuid,
  is_mit          boolean NOT NULL DEFAULT false,

  -- RedSys response data
  ds_response            varchar(10),
  ds_authorization_code  varchar(20),
  ds_card_brand          varchar(10),
  ds_card_country        varchar(10),
  last_four              varchar(4),
  redsys_token           text,
  redsys_token_expiry    varchar(10),
  cof_txn_id             varchar(40),

  -- Flexible metadata (items, plan info, etc.)
  metadata        jsonb DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pt_member_id ON payment_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_pt_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pt_context ON payment_transactions(context);
CREATE INDEX IF NOT EXISTS idx_pt_redsys_order ON payment_transactions(redsys_order);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  2. ALTER subscriptions — add RedSys columns (table already exists)        │
-- │                                                                            │
-- │  Existing columns:                                                         │
-- │    id (uuid PK), member_id (uuid FK→miembros.id, NOT NULL),                │
-- │    plan_type (text, NOT NULL), payment_type (text, NOT NULL),               │
-- │    stripe_customer_id, stripe_subscription_id, stripe_checkout_session_id,  │
-- │    start_date, end_date, status (text, NOT NULL, default 'active'),         │
-- │    created_at, updated_at                                                  │
-- │                                                                            │
-- │  Existing CHECK constraints:                                               │
-- │    subscriptions_payment_type_check:                                        │
-- │      payment_type IN (monthly, annual, decade, infinite) ✓ correct         │
-- │    subscriptions_plan_type_check:                                           │
-- │      ⚠ BUGGY — checks payment_type instead of plan_type!                  │
-- │      We fix this to correctly check plan_type.                             │
-- │    subscriptions_status_check:                                             │
-- │      status IN (active, canceled, past_due, unpaid, incomplete)            │
-- │      → must add 'expired' for recurring billing                            │
-- └─────────────────────────────────────────────────────────────────────────────┘

DO $$
BEGIN
  -- New RedSys tokenization columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='redsys_token') THEN
    ALTER TABLE subscriptions ADD COLUMN redsys_token text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='redsys_token_expiry') THEN
    ALTER TABLE subscriptions ADD COLUMN redsys_token_expiry varchar(10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='redsys_cof_txn_id') THEN
    ALTER TABLE subscriptions ADD COLUMN redsys_cof_txn_id varchar(40);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='redsys_last_order') THEN
    ALTER TABLE subscriptions ADD COLUMN redsys_last_order varchar(12);
  END IF;

  -- Cancellation tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='cancel_at_period_end') THEN
    ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='canceled_at') THEN
    ALTER TABLE subscriptions ADD COLUMN canceled_at timestamptz;
  END IF;

  -- Renewal failure counter for MIT retries
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='renewal_failures') THEN
    ALTER TABLE subscriptions ADD COLUMN renewal_failures integer DEFAULT 0;
  END IF;
END
$$;

-- Add UNIQUE constraint on member_id for upsert support (onConflict: "member_id")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_member_id_key'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_member_id_key UNIQUE (member_id);
  END IF;
END
$$;

-- Fix buggy subscriptions_plan_type_check: was checking payment_type against
-- plan values (under25, over25, family). Drop and recreate to check plan_type.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
DO $$
BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
    CHECK (plan_type = ANY (ARRAY['under25','over25','family','infinite']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

-- Expand status CHECK to include 'expired' (used by recurring billing)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
DO $$
BEGIN
  ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
    CHECK (status = ANY (ARRAY['active','canceled','past_due','unpaid','incomplete','expired']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sub_member_id ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_end_date ON subscriptions(end_date);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  3. ALTER miembros — add RedSys tokenization fields                        │
-- │                                                                            │
-- │  PK: (user_id bigint, dni_pasaporte varchar) — composite                   │
-- │  Already existing (kept as-is):                                            │
-- │    subscription_status (text, default 'inactive')                          │
-- │    subscription_plan (text), subscription_id (text),                       │
-- │    subscription_updated_at (timestamptz)                                   │
-- │    last_four (text), stripe_customer_id (text)                             │
-- │    user_uuid (uuid FK→users.id), id (uuid FK→auth.users.id)               │
-- └─────────────────────────────────────────────────────────────────────────────┘

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='miembros' AND column_name='redsys_token') THEN
    ALTER TABLE miembros ADD COLUMN redsys_token text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='miembros' AND column_name='redsys_token_expiry') THEN
    ALTER TABLE miembros ADD COLUMN redsys_token_expiry varchar(10);
  END IF;
END
$$;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  4. ALTER orders — add RedSys columns (table already exists)               │
-- │                                                                            │
-- │  PK: id (uuid)                                                             │
-- │  Existing: user_id, stripe_checkout_id (unique), amount_cents, currency,   │
-- │    status (CHECK: pending/paid/fulfilled/refunded), shipping, metadata,     │
-- │    created_at                                                              │
-- │  Existing RLS: "Users can view their orders" (SELECT, auth.uid()=user_id)  │
-- │                "Admins can manage orders" (ALL, auth.role()='admin')        │
-- └─────────────────────────────────────────────────────────────────────────────┘

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='redsys_order') THEN
    ALTER TABLE orders ADD COLUMN redsys_order varchar(12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method varchar(20) DEFAULT 'stripe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END
$$;

-- Expand orders.status CHECK to include 'confirmed'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
DO $$
BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status = ANY (ARRAY['pending','paid','confirmed','fulfilled','refunded']));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_orders_redsys_order ON orders(redsys_order);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  5. ALTER order_items — add missing columns (table already exists)          │
-- │                                                                            │
-- │  PK: composite (order_id, variant_id) — NO separate id column              │
-- │  Existing: order_id (FK→orders), variant_id (FK→product_variants),         │
-- │    qty (integer), price_cents (integer)                                     │
-- │  Existing RLS: "Users can view their order items" (SELECT via orders join)  │
-- │                "Admins can manage order items" (ALL, auth.role()='admin')   │
-- └─────────────────────────────────────────────────────────────────────────────┘

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='product_name') THEN
    ALTER TABLE order_items ADD COLUMN product_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='created_at') THEN
    ALTER TABLE order_items ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END
$$;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  6. Replace decrement_inventory function                                   │
-- │                                                                            │
-- │  Existing: decrement_inventory(p_variant_id uuid, p_quantity integer)      │
-- │    — uses param names p_variant_id, p_quantity + logs to inventory_log      │
-- │  Code calls: rpc("decrement_inventory", { variant_id, qty })               │
-- │    — Supabase matches by param NAME, so we must rename params.            │
-- │                                                                            │
-- │  We DROP + CREATE because CREATE OR REPLACE cannot change param names      │
-- │  while the old signature (uuid, integer) has different param names.        │
-- └─────────────────────────────────────────────────────────────────────────────┘

DROP FUNCTION IF EXISTS decrement_inventory(uuid, integer);

CREATE FUNCTION decrement_inventory(variant_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE product_variants
  SET inventory =
    CASE
      WHEN inventory >= qty THEN inventory - qty
      ELSE inventory -- Don't go below zero
    END
  WHERE id = variant_id;

  -- Log the inventory change (preserving existing behavior)
  INSERT INTO inventory_log (variant_id, quantity_change, reason)
  VALUES (variant_id, -qty, 'order');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  7. RLS Policies                                                           │
-- │                                                                            │
-- │  Existing policies on orders:                                              │
-- │    "Users can view their orders" (SELECT, auth.uid()=user_id)              │
-- │    "Admins can manage orders" (ALL, auth.role()='admin')                   │
-- │  Existing policies on order_items:                                         │
-- │    "Users can view their order items" (SELECT, join to orders)             │
-- │    "Admins can manage order items" (ALL, auth.role()='admin')              │
-- │  Existing policies on subscriptions:                                       │
-- │    "Admin users can access all subscriptions" (ALL, is_admin())            │
-- │    "Users can insert/update/view their own subscriptions"                  │
-- │                                                                            │
-- │  Note: service_role key bypasses RLS entirely, so service_role policies    │
-- │  are technically unnecessary. Added as defense-in-depth.                   │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- payment_transactions: new table, enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON payment_transactions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- orders: add service_role policy alongside existing admin/user policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Service role full access orders'
  ) THEN
    CREATE POLICY "Service role full access orders" ON orders
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- order_items: add service_role policy alongside existing admin/user policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Service role full access order_items'
  ) THEN
    CREATE POLICY "Service role full access order_items" ON order_items
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- subscriptions: add service_role policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND policyname = 'Service role full access subscriptions'
  ) THEN
    CREATE POLICY "Service role full access subscriptions" ON subscriptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- payment_transactions: add admin policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_transactions'
      AND policyname = 'Admin users can access all payment_transactions'
  ) THEN
    CREATE POLICY "Admin users can access all payment_transactions" ON payment_transactions
      FOR ALL TO authenticated USING (
        EXISTS (
          SELECT 1 FROM miembros
          WHERE miembros.user_uuid = auth.uid()
            AND miembros.role = 'admin'
        )
      );
  END IF;
END
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE. After running, regenerate TypeScript types from Supabase dashboard:
--   Settings → API → Generate Types → Copy to src/types/supabase.ts
-- ══════════════════════════════════════════════════════════════════════════════
