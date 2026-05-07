import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex items-center justify-between">
        <span className="font-heading uppercase tracking-[0.2em] text-xs text-brand-ghost-white">
          {title}
        </span>
        {current && (
          <span className="text-xs text-brand-silver-ash">
            Seleccionado:{" "}
            <span className="text-brand-divine-lilac">{current}</span>
          </span>
        )}
      </div>
      <div
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          const isActive = v === current
          return (
            <button
              type="button"
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "min-w-[3rem] h-11 px-4 rounded-rounded text-sm font-medium border transition-all duration-200 ease-in",
                isActive
                  ? "shadow-[0_0_20px_rgba(155,77,202,0.45)]"
                  : "hover:border-brand-sacred-violet hover:text-brand-divine-lilac"
              )}
              style={
                isActive
                  ? {
                      backgroundColor: "var(--brand-sacred-violet)",
                      borderColor: "var(--brand-sacred-violet)",
                      color: "var(--brand-ghost-white)",
                    }
                  : {
                      backgroundColor: "transparent",
                      borderColor: "var(--brand-amethyst)",
                      color: "var(--brand-ghost-white)",
                    }
              }
              disabled={disabled}
              data-testid="option-button"
              aria-pressed={isActive}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
