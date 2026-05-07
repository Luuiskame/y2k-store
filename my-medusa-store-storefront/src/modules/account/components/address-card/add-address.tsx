"use client"

import { Plus } from "@medusajs/icons"
import { Button, Heading } from "@medusajs/ui"
import { useEffect, useState, useActionState } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import Modal from "@modules/common/components/modal"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"
import { addCustomerAddress } from "@lib/data/customer"
import HondurasAddressFields from "./honduras-address-fields"

const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    isDefaultShipping: addresses.length === 0,
    success: false,
    error: null,
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

  const defaultCountry =
    region.countries?.[0]?.iso_2?.toLowerCase() || "hn"

  return (
    <>
      <button
        className="border-2 border-dashed border-brand-amethyst hover:border-brand-sacred-violet transition-colors rounded-rounded p-5 min-h-[180px] h-full w-full flex flex-col items-center justify-center gap-y-2 text-brand-silver-ash hover:text-brand-ghost-white"
        onClick={open}
        data-testid="add-address-button"
      >
        <Plus />
        <span className="text-base-semi">Agregar nueva dirección</span>
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Nueva dirección</Heading>
          <p className="text-small-regular text-brand-silver-ash">
            Llena los datos para que tu pedido llegue sin problemas.
          </p>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <HondurasAddressFields countryCode={defaultCountry} />
            {formState.error && (
              <div
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
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

export default AddAddress
