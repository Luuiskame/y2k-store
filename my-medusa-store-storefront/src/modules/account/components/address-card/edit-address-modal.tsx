"use client"

import React, { useEffect, useState, useActionState } from "react"
import { PencilSquare as Edit, Trash } from "@medusajs/icons"
import { Button, Heading, Text, clx } from "@medusajs/ui"

import useToggleState from "@lib/hooks/use-toggle-state"
import Modal from "@modules/common/components/modal"
import Spinner from "@modules/common/icons/spinner"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"
import {
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import HondurasAddressFields from "./honduras-address-fields"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
    addressId: address.id,
  })

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  const defaultCountry =
    region.countries?.[0]?.iso_2?.toLowerCase() ||
    address.country_code ||
    "hn"

  return (
    <>
      <div
        className={clx(
          "border rounded-rounded p-5 min-h-[180px] h-full w-full flex flex-col justify-between gap-4 transition-colors",
          {
            "border-brand-sacred-violet": isActive,
          }
        )}
        data-testid="address-container"
      >
        <div className="flex flex-col gap-y-1">
          <Heading
            className="text-left text-base-semi"
            data-testid="address-name"
          >
            {address.first_name} {address.last_name}
          </Heading>
          <Text className="flex flex-col text-left text-small-regular text-brand-silver-ash">
            <span data-testid="address-address">
              {address.address_1}
              {address.address_2 ? `, ${address.address_2}` : ""}
            </span>
            <span data-testid="address-city-province">
              {address.city}
              {address.province ? `, ${address.province}` : ""}
            </span>
            <span data-testid="address-country">
              {address.country_code?.toUpperCase()}
            </span>
            {address.phone && (
              <span data-testid="address-phone" className="mt-1">
                Tel: {address.phone}
              </span>
            )}
            {address.company && (
              <span
                data-testid="address-references"
                className="mt-2 text-brand-ghost-white"
              >
                <span className="font-semibold">Cómo llegar: </span>
                {address.company}
              </span>
            )}
          </Text>
        </div>
        <div className="flex items-center gap-x-4 border-t border-brand-amethyst pt-3">
          <button
            className="text-small-regular text-brand-ghost-white flex items-center gap-x-2 hover:text-brand-sacred-violet"
            onClick={open}
            data-testid="address-edit-button"
          >
            <Edit />
            Editar
          </button>
          <button
            className="text-small-regular text-brand-ghost-white flex items-center gap-x-2 hover:text-rose-500"
            onClick={removeAddress}
            data-testid="address-delete-button"
          >
            {removing ? <Spinner /> : <Trash />}
            Eliminar
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Editar dirección</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <HondurasAddressFields
              countryCode={defaultCountry}
              defaults={{
                first_name: address.first_name,
                last_name: address.last_name,
                province: address.province,
                city: address.city,
                address_1: address.address_1,
                address_2: address.address_2,
                company: address.company,
                phone: address.phone,
              }}
            />
            {formState.error && (
              <div className="text-rose-500 text-small-regular py-2">
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6 w-full small:w-auto">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10 flex-1 small:flex-none"
                data-testid="cancel-button"
              >
                Cancelar
              </Button>
              <SubmitButton
                data-testid="save-button"
                className="flex-1 small:flex-none"
              >
                Guardar
              </SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default EditAddress
