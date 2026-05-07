import React from "react"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1 small:py-12" data-testid="account-page">
      <div className="flex-1 content-container h-full max-w-5xl mx-auto flex flex-col">
        <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] gap-y-6 small:gap-x-12 py-6 small:py-12">
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className="flex-1 px-4 small:px-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
