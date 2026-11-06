# Implementation Plan - Lojinha do Campus SaaS Restructuring

## Overview
This implementation plan outlines the final consolidation and structural polish for the **Lojinha do Campus** SaaS, ensuring 100% financial integrity, seamless monthly closing and invoice generation, robust Stripe test-mode checkout and Pix payments, atomic POS operations, and a polished dark UI.

## Modules & Changes

1. **Centralized Financial Engine (`src/server/db.ts`)**
   - Ensure strict separation between sales, invoice generation, partial payments, and confirmed credits.
   - Enforce the formula: `Invoice Total = Fixed Tuition + Canteen Consumption + Previous Balance - Credits`.
   - Maintain idempotency during monthly closing.

2. **Invoice Generation & Central de Faturamento (`InvoicesAndClosing.tsx`, `handler.ts`)**
   - 1-click preview and closing execution.
   - Clear preview breakdown with student list, tuition sum, and canteen consumption sum.
   - Clear validation against duplicate invoice generation for the same period.

3. **Stripe & Pix Payments (`StudentPortal.tsx`, `GuardianPortal.tsx`, `handler.ts`)**
   - Stripe test mode (`pk_test_...`) Checkout session creation and test fulfillment webhook simulation.
   - Support for partial payments and full settlement.
   - Pix Copy & Paste QR code generation and administrative review workflow.

4. **Point of Sale (POS) & Stock (`PointOfSale.tsx`, `db.ts`)**
   - Atomic sales registration with inventory locking and historical price preservation.
   - Automatic consumption debiting on the student's account.

5. **Visual Polish & Navigation (`Sidebar.tsx`, `Dashboard.tsx`)**
   - Refined dark minimalist aesthetic matching CMS Admin Dashboard style (`#111111`, `#151515`, `#1B1B1B`, `#8B7CFF`).
   - Clean tables with search, filters, and empty states.
