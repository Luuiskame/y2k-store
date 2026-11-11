import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Container, Heading, Label, Switch, Text, clx } from "@medusajs/ui"
import { CSSProperties, useEffect, useState } from "react"

import { useAccountTheme, useChangeTheme, useThemePrefs } from "../../../lib/theme-sync"
import { DEFAULT_PREFS, currentMode } from "../../../theme/boot"
import {
  FONT_SETS,
  FontSet,
  Mode,
  PALETTES,
  Palette,
  Preview,
  fontSetOf,
  previewOf,
} from "../../../theme/palettes"
import { ThemePrefs, resolveTheme, samePrefs } from "../../../theme/prefs"

/** Which side Medusa's light/dark switch is on, kept up to date. */
const useMode = (): Mode => {
  const [mode, setMode] = useState<Mode>(currentMode)

  useEffect(() => {
    const observer = new MutationObserver(() => setMode(currentMode()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [])

  return mode
}

const displayStyle = (font: FontSet, size: number): CSSProperties => ({
  fontFamily: font.display,
  fontWeight: font.weight,
  letterSpacing: font.tracking,
  textTransform: font.transform,
  fontSize: size * font.scale,
  lineHeight: 1.15,
})

const BARS = [38, 62, 46, 78, 58, 100]

/**
 * A palette drawn small: page, card, a headline figure, a chart and the two
 * kinds of button, in its own colors and type. Inline styles on purpose: it
 * shows a palette that is not the one applied to the page.
 */
const MiniPreview = ({
  preview,
  font,
  label,
}: {
  preview: Preview
  font: FontSet
  label: string
}) => (
  <div
    aria-hidden
    style={{ backgroundColor: preview.canvas }}
    className="flex flex-col gap-1.5 p-3"
  >
    <span style={{ color: preview.inkSubtle, fontFamily: font.body }} className="text-[9px] uppercase tracking-[0.14em]">
      {label}
    </span>
    <div
      style={{
        backgroundColor: preview.card,
        boxShadow: `0 0 0 1px ${preview.line}`,
      }}
      className="flex flex-col gap-2 rounded-lg p-2.5"
    >
      <span style={{ color: preview.inkSubtle, fontFamily: font.body }} className="text-[9px]">
        Ventas de hoy
      </span>
      {/* A fixed line box: faces of different sizes, cards of one height. */}
      <span className="flex h-7 items-center">
        <span
          style={{
            ...displayStyle(font, 17),
            backgroundImage: `linear-gradient(120deg, ${preview.accent}, ${preview.accent2})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
          className="whitespace-nowrap"
        >
          L 4,250
        </span>
      </span>
      <div className="flex h-6 items-end gap-[3px]">
        {BARS.map((height, index) => (
          <span
            key={index}
            style={{
              height: `${height}%`,
              backgroundColor:
                index === BARS.length - 1 ? preview.accent2 : preview.accent,
              opacity: index === BARS.length - 1 ? 1 : 0.35 + index * 0.1,
            }}
            className="flex-1 rounded-[2px]"
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <span
          style={{ backgroundColor: preview.fill, fontFamily: font.body }}
          className="rounded-[5px] px-2 py-[3px] text-[9px] font-semibold text-white"
        >
          Crear
        </span>
        <span
          style={{
            backgroundColor: preview.raised,
            color: preview.ink,
            boxShadow: `0 0 0 1px ${preview.line}`,
            fontFamily: font.body,
          }}
          className="rounded-[5px] px-2 py-[3px] text-[9px] font-medium"
        >
          Pedidos
        </span>
      </div>
    </div>
  </div>
)

const PaletteCard = ({
  palette,
  selected,
  onSelect,
}: {
  palette: Palette
  selected: boolean
  onSelect: () => void
}) => {
  const font = fontSetOf(palette.font)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clx(
        "bg-ui-bg-base group relative flex flex-col overflow-hidden rounded-2xl text-left outline-none transition-shadow",
        "focus-visible:shadow-borders-interactive-with-focus",
        selected
          ? "y2k-selected-glow"
          : "shadow-elevation-card-rest hover:shadow-elevation-card-hover"
      )}
    >
      <div className="grid grid-cols-2">
        <MiniPreview preview={previewOf(palette, "light")} font={font} label="Claro" />
        <MiniPreview preview={previewOf(palette, "dark")} font={font} label="Oscuro" />
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span style={displayStyle(font, 16)} className="text-ui-fg-base">
            {palette.name}
          </span>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {palette.tagline}
          </Text>
        </div>
        {selected && (
          <span className="flex shrink-0 items-center gap-1 text-[color:var(--y2k-accent)]">
            <CheckCircleSolid />
            <span className="txt-compact-xsmall-plus">En uso</span>
          </span>
        )}
      </div>
    </button>
  )
}

const FontOption = ({
  name,
  tagline,
  font,
  selected,
  onSelect,
}: {
  name: string
  tagline: string
  font: FontSet
  selected: boolean
  onSelect: () => void
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={clx(
      "bg-ui-bg-base flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-left outline-none transition-shadow",
      "focus-visible:shadow-borders-interactive-with-focus",
      selected
        ? "y2k-selected"
        : "shadow-borders-base hover:bg-ui-bg-base-hover"
    )}
  >
    <div className="flex min-w-0 flex-col gap-1">
      <span style={displayStyle(font, 17)} className="text-ui-fg-base truncate">
        {name}
      </span>
      <span
        style={{ fontFamily: font.body }}
        className="text-ui-fg-subtle text-[13px] leading-5"
      >
        {tagline}
      </span>
    </div>
    <span
      aria-hidden
      style={displayStyle(font, 19)}
      className="text-ui-fg-base hidden shrink-0 whitespace-nowrap sm:block"
    >
      L 12,450
    </span>
  </button>
)

const Toggle = ({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <div className="flex items-start justify-between gap-4 px-6 py-4">
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {description}
      </Text>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onChange} />
  </div>
)

/**
 * Ajustes → Apariencia: the palette, the type and two details of the panel's
 * look. A tap applies it everywhere at once; it is saved to the account, so
 * the phone and the computer end up looking the same.
 */
const AparienciaPage = () => {
  useAccountTheme()
  const prefs = useThemePrefs()
  const { change, failed } = useChangeTheme()
  const mode = useMode()

  const { palette, font } = resolveTheme(prefs)
  const paletteFont = fontSetOf(palette.font)
  const set = (patch: Partial<ThemePrefs>) => change(patch)

  return (
    <div className="flex flex-col gap-y-3" data-y2k-ready>
      <Container className="flex flex-col gap-1 px-6 py-4">
        <Heading>Apariencia</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Elegí cómo se ve el panel. Se aplica al instante y se guarda en tu
          cuenta: el celular y la computadora quedan iguales.
        </Text>
        {failed && (
          <Text size="small" leading="compact" className="text-ui-fg-error" role="alert">
            No se pudo guardar en tu cuenta. El cambio queda en este dispositivo
            y se vuelve a enviar la próxima vez que abrás el panel.
          </Text>
        )}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h2">Paleta</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Cada una tiene su lado claro y su lado oscuro. Ahora estás viendo
            el {mode === "dark" ? "oscuro" : "claro"}; se cambia en el menú de tu
            usuario, en «Tema».
          </Text>
        </div>
        <div
          className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3"
          role="group"
          aria-label="Paletas"
        >
          {PALETTES.map((option) => (
            <PaletteCard
              key={option.id}
              palette={option}
              selected={option.id === palette.id}
              onSelect={() => set({ palette: option.id })}
            />
          ))}
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h2">Tipografía</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            La letra de los títulos y las cifras grandes, y la del resto del
            panel.
          </Text>
        </div>
        <div
          className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-6"
          role="radiogroup"
          aria-label="Tipografía"
        >
          <FontOption
            name="Según la paleta"
            tagline={`La que acompaña a cada paleta. Con ${palette.name}: ${paletteFont.name}.`}
            font={paletteFont}
            selected={prefs.font === "auto"}
            onSelect={() => set({ font: "auto" })}
          />
          {FONT_SETS.map((option) => (
            <FontOption
              key={option.id}
              name={option.name}
              tagline={option.tagline}
              font={option}
              selected={prefs.font === option.id}
              onSelect={() => set({ font: option.id })}
            />
          ))}
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Detalles</Heading>
        </div>
        <Toggle
          id="y2k-aura"
          label="Resplandor de fondo"
          description={
            palette.modes
              ? "Un brillo suave con los colores de la paleta detrás de las tarjetas."
              : "La paleta clásica de Medusa no lo lleva."
          }
          checked={prefs.aura}
          onChange={(aura) => set({ aura })}
        />
        <Toggle
          id="y2k-tabbar"
          label="Barra inferior en el celular"
          description="Pedidos, Productos, Nuevo pedido, Inventario y Estadísticas a un toque, abajo de la pantalla."
          checked={prefs.tabbar}
          onChange={(tabbar) => set({ tabbar })}
        />
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Ahora: {palette.name} con tipografía {font.name}.
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={samePrefs(prefs, DEFAULT_PREFS)}
            onClick={() => set(DEFAULT_PREFS)}
          >
            Restablecer
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Apariencia",
})

export const handle = {
  breadcrumb: () => "Apariencia",
}

export default AparienciaPage
