"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const countryCode = useParams().countryCode as string

  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    if (selectedVariant?.allow_backorder) {
      return true
    }

    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    return false
  }, [selectedVariant])

  const lowStock = useMemo(() => {
    if (!selectedVariant?.manage_inventory) return false
    const qty = selectedVariant?.inventory_quantity || 0
    return qty > 0 && qty <= 5
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    setIsAdding(false)
  }

  const buttonLabel = !selectedVariant
    ? "Selecciona una talla"
    : !inStock || !isValidVariant
    ? "Agotado"
    : isAdding
    ? "Añadiendo..."
    : "Añadir al carrito"

  const buttonDisabled =
    !inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant

  return (
    <>
      <div className="flex flex-col gap-y-6" ref={actionsRef}>
        <ProductPrice product={product} variant={selectedVariant} />

        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-5">
            {(product.options || []).map((option) => (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  data-testid="product-options"
                  disabled={!!disabled || isAdding}
                />
              </div>
            ))}
          </div>
        )}

        {/* Stock urgency line */}
        {selectedVariant && inStock && lowStock && (
          <div
            className="flex items-center gap-2 text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            <span aria-hidden>●</span>
            Stock limitado · Quedan {selectedVariant?.inventory_quantity}
          </div>
        )}
        {selectedVariant && inStock && !lowStock && (
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-silver-ash">
            <span aria-hidden style={{ color: "var(--brand-sacred-violet)" }}>
              ●
            </span>
            En stock · Listo para envío
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={buttonDisabled}
          aria-busy={isAdding}
          data-testid="add-product-button"
          className="btn-glow w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {buttonLabel}
        </button>

        <p className="text-[11px] uppercase tracking-[0.22em] text-brand-silver-ash/70 text-center">
          Pagos seguros · Envío a toda Honduras
        </p>

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
