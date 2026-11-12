import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CheckCircleSolid } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Switch, Text, clx } from "@medusajs/ui"
import { CSSProperties, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Motto } from "../../../components/larp/motto"
import { alignDashboard } from "../../../i18n/dashboard"
import { LANGS, Lang, langOfCode } from "../../../i18n/lang"
import { tr } from "../../../i18n/tr"
import { useT } from "../../../i18n/use-t"
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
import {
  DEFAULT_MOTTO,
  MOTTO_MAX_LENGTH,
  ThemePrefs,
  cleanMotto,
  resolveTheme,
  sameLook,
} from "../../../theme/prefs"

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
}) => {
  const words = useT().appearance.palette

  return (
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
          {words.previewSales}
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
            {words.previewCreate}
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
            {words.previewOrders}
          </span>
        </div>
      </div>
    </div>
  )
}

const PaletteCard = ({
  palette,
  selected,
  onSelect,
}: {
  palette: Palette
  selected: boolean
  onSelect: () => void
}) => {
  const t = useT()
  const words = t.appearance.palette
  const font = fontSetOf(palette.font)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-palette={palette.id}
      className={clx(
        "bg-ui-bg-base group relative flex flex-col overflow-hidden rounded-2xl text-left outline-none transition-shadow",
        "focus-visible:shadow-borders-interactive-with-focus",
        selected
          ? "y2k-selected-glow"
          : "shadow-elevation-card-rest hover:shadow-elevation-card-hover"
      )}
    >
      <div className="grid grid-cols-2">
        <MiniPreview preview={previewOf(palette, "light")} font={font} label={words.light} />
        <MiniPreview preview={previewOf(palette, "dark")} font={font} label={words.dark} />
      </div>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span style={displayStyle(font, 16)} className="text-ui-fg-base">
            {palette.name}
          </span>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t.appearance.palettes[palette.id]}
          </Text>
        </div>
        {selected && (
          <span className="flex shrink-0 items-center gap-1 text-[color:var(--y2k-accent)]">
            <CheckCircleSolid />
            <span className="txt-compact-xsmall-plus">{words.inUse}</span>
          </span>
        )}
      </div>
    </button>
  )
}

/** One choice among a few, as a card: a type set or a language. */
const OptionCard = ({
  name,
  tagline,
  font,
  sample,
  selected,
  onSelect,
  value,
}: {
  name: string
  tagline: string
  /** The type set the name is drawn in; the page's own when left out. */
  font?: FontSet
  /** Shown on the right, in the same face. */
  sample?: string
  selected: boolean
  onSelect: () => void
  value: string
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    data-value={value}
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
      <span
        style={font ? displayStyle(font, 17) : undefined}
        className={clx("text-ui-fg-base truncate", !font && "y2k-display text-[17px] leading-6")}
      >
        {name}
      </span>
      <span
        style={font ? { fontFamily: font.body } : undefined}
        className="text-ui-fg-subtle text-[13px] leading-5"
      >
        {tagline}
      </span>
    </div>
    {sample && font && (
      <span
        aria-hidden
        style={displayStyle(font, 19)}
        className="text-ui-fg-base hidden shrink-0 whitespace-nowrap sm:block"
      >
        {sample}
      </span>
    )}
    {!font && selected && (
      <span className="shrink-0 text-[color:var(--y2k-accent)]" aria-hidden>
        <CheckCircleSolid />
      </span>
    )}
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
 * The motto, as a field. What is typed is kept here until it is a motto
 * worth saving: storing every keystroke would trim the space someone is
 * about to type a word after. An empty field goes back to the original.
 */
const MottoField = ({
  motto,
  onChange,
}: {
  motto: string
  onChange: (motto: string) => void
}) => {
  const words = useT().appearance.larp
  const [draft, setDraft] = useState(motto)

  // The motto changed elsewhere (the account's copy arrived, "back to the
  // original"): the field shows it, unless it is what is being typed.
  useEffect(() => {
    setDraft((current) => (cleanMotto(current) === motto ? current : motto))
  }, [motto])

  const type = (value: string) => {
    setDraft(value)
    onChange(cleanMotto(value))
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="y2k-motto" size="small" weight="plus">
          {words.mottoLabel}
        </Label>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {words.mottoHelp}
        </Text>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Medusa's Input sits in a wrapper of its own: the wrapper is what
            has to take the row's width. */}
        <div className="min-w-0 flex-1">
          <Input
            id="y2k-motto"
            value={draft}
            maxLength={MOTTO_MAX_LENGTH}
            placeholder={DEFAULT_MOTTO}
            onChange={(event) => type(event.target.value)}
            onBlur={() => setDraft(motto)}
            autoComplete="off"
          />
        </div>
        <Button
          size="small"
          variant="secondary"
          className="shrink-0"
          disabled={motto === DEFAULT_MOTTO}
          onClick={() => type(DEFAULT_MOTTO)}
        >
          {words.mottoReset}
        </Button>
      </div>
      <div className="y2k-hero px-5 py-6 text-center">
        <Motto size="lg" />
      </div>
    </div>
  )
}

/**
 * Ajustes → Apariencia: the palette, the type, the language and the panel's
 * voice. A tap applies it everywhere at once; it is saved to the account, so
 * the phone and the computer end up the same.
 */
const AparienciaPage = () => {
  useAccountTheme()
  const t = useT()
  const words = t.appearance
  const prefs = useThemePrefs()
  const { change, failed } = useChangeTheme()
  const mode = useMode()
  // Medusa's own language, to notice when it differs from ours.
  const { i18n } = useTranslation()

  const { palette, font } = resolveTheme(prefs)
  const paletteFont = fontSetOf(palette.font)
  const set = (patch: Partial<ThemePrefs>) => change(patch)

  const chooseLanguage = (lang: Lang) => {
    // `unified`: from now on Medusa's own screens are kept in this language
    // too, here and on the owner's other devices.
    set({ lang, unified: true })
    // Also when it is the language already selected: that is how a panel
    // left half in each language is made one.
    alignDashboard()
  }
  const mixed = langOfCode(i18n.language) !== prefs.lang

  return (
    <div className="flex flex-col gap-y-3" data-y2k-ready>
      <Container className="flex flex-col gap-1 px-6 py-4">
        <Heading>{words.title}</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {words.intro}
        </Text>
        {failed && (
          <Text size="small" leading="compact" className="text-ui-fg-error" role="alert">
            {words.saveFailed}
          </Text>
        )}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h2">{words.palette.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.palette.description(mode)}
          </Text>
        </div>
        <div
          className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6 xl:grid-cols-3"
          role="group"
          aria-label={words.palette.aria}
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
          <Heading level="h2">{words.type.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.type.description}
          </Text>
        </div>
        <div
          className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-6"
          role="radiogroup"
          aria-label={words.type.title}
        >
          <OptionCard
            value="auto"
            name={words.type.byPalette}
            tagline={words.type.byPaletteTagline(palette.name, words.fonts[paletteFont.id].name)}
            font={paletteFont}
            sample="L 12,450"
            selected={prefs.font === "auto"}
            onSelect={() => set({ font: "auto" })}
          />
          {FONT_SETS.map((option) => (
            <OptionCard
              key={option.id}
              value={option.id}
              name={words.fonts[option.id].name}
              tagline={words.fonts[option.id].tagline}
              font={option}
              sample="L 12,450"
              selected={prefs.font === option.id}
              onSelect={() => set({ font: option.id })}
            />
          ))}
        </div>
      </Container>

      <Container className="divide-y p-0" data-y2k-section="language">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h2">{words.language.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.language.description}
          </Text>
        </div>
        <div className="flex flex-col gap-3 p-4 md:p-6">
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            role="radiogroup"
            aria-label={words.language.aria}
          >
            {LANGS.map((lang) => (
              <OptionCard
                key={lang}
                value={lang}
                name={words.language.names[lang]}
                tagline={words.language.taglines[lang]}
                selected={prefs.lang === lang}
                onSelect={() => chooseLanguage(lang)}
              />
            ))}
          </div>
          {mixed && (
            <Text size="small" leading="compact" className="text-ui-fg-subtle" role="status">
              {words.language.mixed}
            </Text>
          )}
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            {words.language.customers}
          </Text>
        </div>
      </Container>

      <Container className="divide-y p-0" data-y2k-section="larp">
        <div className="flex flex-col gap-1 px-6 py-4">
          <Heading level="h2">{words.larp.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.larp.description}
          </Text>
        </div>
        <MottoField motto={prefs.motto} onChange={(motto) => set({ motto })} />
        <Toggle
          id="y2k-hype"
          label={words.larp.hypeLabel}
          description={words.larp.hypeHelp}
          checked={prefs.hype}
          onChange={(hype) => set({ hype })}
        />
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{words.details}</Heading>
        </div>
        <Toggle
          id="y2k-aura"
          label={words.auraLabel}
          description={palette.modes ? words.auraOn : words.auraOff}
          checked={prefs.aura}
          onChange={(aura) => set({ aura })}
        />
        <Toggle
          id="y2k-tabbar"
          label={words.tabbarLabel}
          description={words.tabbarHelp}
          checked={prefs.tabbar}
          onChange={(tabbar) => set({ tabbar })}
        />
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.now(palette.name, words.fonts[font.id].name)}
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={sameLook(prefs, DEFAULT_PREFS)}
            // The look only: the language, the motto and larp mode stay.
            onClick={() =>
              set({
                palette: DEFAULT_PREFS.palette,
                font: DEFAULT_PREFS.font,
                aura: DEFAULT_PREFS.aura,
                tabbar: DEFAULT_PREFS.tabbar,
              })
            }
          >
            {words.reset}
          </Button>
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  // A key, not the words: Medusa looks it up in our menu labels (i18n/menu.ts).
  label: "menu.appearance",
  translationNs: "y2k",
})

export const handle = {
  breadcrumb: () => tr().appearance.title,
}

export default AparienciaPage
