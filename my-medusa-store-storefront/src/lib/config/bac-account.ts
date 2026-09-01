// The BAC Credomatic account customers transfer to. Shared by the dedicated
// transfer page and the pending-transfer reminder so both always show the exact
// same numbers. Values come from NEXT_PUBLIC_* vars (inlined at build time), so
// this file is safe to import from client components.

export const BAC_ACCOUNT = {
  bankName: process.env.NEXT_PUBLIC_BAC_BANK_NAME ?? "BAC Credomatic",
  holderName: process.env.NEXT_PUBLIC_BAC_ACCOUNT_HOLDER ?? "Y2K Fit Honduras",
  accountNumber: process.env.NEXT_PUBLIC_BAC_ACCOUNT_NUMBER ?? "000-000-000",
  accountType: process.env.NEXT_PUBLIC_BAC_ACCOUNT_TYPE ?? "Cuenta de ahorros",
  currency: process.env.NEXT_PUBLIC_BAC_ACCOUNT_CURRENCY ?? "HNL (Lempiras)",
}
