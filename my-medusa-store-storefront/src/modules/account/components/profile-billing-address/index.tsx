"use client"

import React, { useEffect, useMemo, useActionState } from "react"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { addCustomerAddress, updateCustomerAddress } from "@lib/data/customer"
import HondurasAddressFields from "../address-card/honduras-address-fields"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
  regions: HttpTypes.StoreRegion[]
}

const ProfileBillingAddress: React.FC<MyInformationProps> = ({
  customer,
  regions,
}) => {
  const defaultCountry = useMemo(() => {
    const firstCountry = regions
      ?.flatMap((region) => region.countries || [])
      .find(Boolean)
    return firstCountry?.iso_2?.toLowerCase() || "hn"
  }, [regions])

  const [successState, setSuccessState] = React.useState(false)

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  const initialState: Record<string, any> = {
    isDefaultBilling: true,
    isDefaultShipping: false,
    error: false,
    success: false,
  }

  if (billingAddress) {
    initialState.addressId = billingAddress.id
  }

  const [state, formAction] = useActionState(
    billingAddress ? updateCustomerAddress : addCustomerAddress,
    initialState
  )

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)
  }, [state])

  const currentInfo = useMemo(() => {
    if (!billingAddress) {
      return "Sin dirección de facturación"
    }

    return (
      <div className="flex flex-col font-semibold" data-testid="current-info">
        <span>
          {billingAddress.first_name} {billingAddress.last_name}
        </span>
        <span>
          {billingAddress.address_1}
          {billingAddress.address_2 ? `, ${billingAddress.address_2}` : ""}
        </span>
        <span>
          {billingAddress.city}
          {billingAddress.province ? `, ${billingAddress.province}` : ""}
        </span>
        {billingAddress.company && (
          <span className="text-small-regular text-ui-fg-subtle font-normal mt-1">
            Cómo llegar: {billingAddress.company}
          </span>
        )}
      </div>
    )
  }, [billingAddress])

  return (
    <form action={formAction} onReset={() => clearState()} className="w-full">
      <input type="hidden" name="addressId" value={billingAddress?.id} />
      <AccountInfo
        label="Dirección de facturación"
        currentInfo={currentInfo}
        isSuccess={successState}
        isError={!!state.error}
        clearState={clearState}
        data-testid="account-billing-address-editor"
      >
        <HondurasAddressFields
          countryCode={defaultCountry}
          defaults={{
            first_name: billingAddress?.first_name,
            last_name: billingAddress?.last_name,
            province: billingAddress?.province,
            city: billingAddress?.city,
            address_1: billingAddress?.address_1,
            address_2: billingAddress?.address_2,
            company: billingAddress?.company,
            phone: billingAddress?.phone ?? customer?.phone ?? "",
          }}
        />
      </AccountInfo>
    </form>
  )
}

export default ProfileBillingAddress
