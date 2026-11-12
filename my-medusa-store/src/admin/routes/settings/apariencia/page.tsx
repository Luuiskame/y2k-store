import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CheckCircleSolid, Plus, XMark } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Text,
  clx,
} from "@medusajs/ui"
import { CSSProperties, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { BigLine } from "../../../components/larp/motto"
import { Ticker } from "../../../components/larp/ticker"
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
  PHRASES_MAX,
  PHRASE_MAX_LENGTH,
  PHRASE_SIZES,
  PhraseSize,
  ThemePrefs,
  cleanMotto,
  cleanOpener,
  cleanPhrases,
  resolveTheme,
  sameLook,
  samePhrases,
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
              backgroundImage: `linear-gradient(120deg, ${preview.accent}, ${preview.ink2})`,
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

/** The sizes by the letters the store already sells in. */
const SIZE_LETTERS: Record<PhraseSize, string> = { sm: "S", md: "M", lg: "L", xl: "XL" }

/** How big a phrase is set: S, M, L or XL. */
const SizePicker = ({
  id,
  value,
  onChange,
}: {
  id: string
  value: PhraseSize
  onChange: (size: PhraseSize) => void
}) => {
  const words = useT().appearance.larp

  return (
    <div className="flex items-center gap-3">
      <Text id={id} size="small" leading="compact" className="text-ui-fg-subtle shrink-0">
        {words.size}
      </Text>
      <div className="y2k-chips" role="radiogroup" aria-labelledby={id}>
        {PHRASE_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={size === value}
            aria-label={words.sizes[size]}
            title={words.sizes[size]}
            data-size={size}
            className={clx("y2k-chip min-w-[44px] justify-center", size === value && "is-on")}
            onClick={() => onChange(size)}
          >
            {SIZE_LETTERS[size]}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * One of the two lines Estadísticas is framed by (the one it opens with and
 * the motto it closes with): its switch, its words, its size, and how it
 * looks, at that size, in the palette in use.
 *
 * What is typed is kept here until it is a line worth saving: storing every
 * keystroke would trim the space someone is about to type a word after.
 */
const PhraseField = ({
  id,
  label,
  help,
  value,
  clean,
  placeholder,
  on,
  size,
  emptyNote,
  original,
  onText,
  onToggle,
  onSize,
}: {
  /** Of the text field; the switch and the sizes derive theirs from it. */
  id: string
  label: string
  help: string
  /** The line as stored. */
  value: string
  /** What typed text is stored as (an empty motto is the original one). */
  clean: (raw: string) => string
  placeholder: string
  on: boolean
  size: PhraseSize
  /** Said in place of the preview while there is no line. */
  emptyNote?: string
  /** The line "Volver al original" puts back; none for a line that has none. */
  original?: string
  onText: (text: string) => void
  onToggle: (on: boolean) => void
  onSize: (size: PhraseSize) => void
}) => {
  const words = useT().appearance.larp
  const [draft, setDraft] = useState(value)

  // The line changed elsewhere (the account's copy arrived, "back to the
  // original"): the field shows it, unless it is what is being typed.
  useEffect(() => {
    setDraft((current) => (clean(current) === value ? current : value))
  }, [value, clean])

  const type = (text: string) => {
    setDraft(text)
    onText(clean(text))
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4" data-y2k-phrase={id}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-on`} size="small" weight="plus">
            {label}
          </Label>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {help}
          </Text>
        </div>
        <Switch id={`${id}-on`} checked={on} onCheckedChange={onToggle} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Medusa's Input sits in a wrapper of its own: the wrapper is what
            has to take the row's width. */}
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            aria-label={label}
            value={draft}
            maxLength={MOTTO_MAX_LENGTH}
            placeholder={placeholder}
            onChange={(event) => type(event.target.value)}
            onBlur={() => setDraft(value)}
            autoComplete="off"
          />
        </div>
        {original !== undefined && (
          <Button
            size="small"
            variant="secondary"
            className="shrink-0"
            disabled={value === original}
            onClick={() => type(original)}
          >
            {words.mottoReset}
          </Button>
        )}
      </div>
      <SizePicker id={`${id}-size`} value={size} onChange={onSize} />
      {value ? (
        <div
          className={clx(
            "y2k-hero px-5 py-6 text-center transition-opacity",
            !on && "opacity-50"
          )}
        >
          <BigLine text={value} size={size} />
        </div>
      ) : (
        emptyNote && (
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            {emptyNote}
          </Text>
        )
      )}
      {!on && value && (
        <Text size="small" leading="compact" className="text-ui-fg-muted" role="status">
          {words.hidden}
        </Text>
      )}
    </div>
  )
}

/**
 * The lines of the ticker, as a list the owner edits: change one in place,
 * take one out, add their own. Until they touch it the list shows the
 * originals, which follow the panel's language; from the first change it is
 * theirs and stays as written.
 *
 * A row emptied while typing stays on screen (nothing below it jumps) and is
 * simply not stored.
 */
const PhrasesField = ({
  custom,
  originals,
  motto,
  onChange,
}: {
  /** The owner's lines, or null while they keep the originals. */
  custom: string[] | null
  originals: string[]
  /** Leads the preview, as it leads every lap of the real ticker. */
  motto: string
  onChange: (phrases: string[] | null) => void
}) => {
  const words = useT().appearance.larp
  const shown = custom ?? originals
  const [drafts, setDrafts] = useState(shown)
  const [fresh, setFresh] = useState("")

  // The list changed elsewhere (the account's copy, the language of the
  // originals, "back to the originals"): the rows show it, unless it is what
  // they already say.
  const shownKey = shown.join("\n")
  useEffect(() => {
    setDrafts((current) =>
      samePhrases(cleanPhrases(current) ?? [], shown) ? current : shown
    )
    // `shown` is a new array on every render; its text is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey])

  const stored = cleanPhrases(drafts) ?? []
  const full = stored.length >= PHRASES_MAX
  const next = cleanPhrases([fresh])?.[0] ?? ""

  const commit = (rows: string[]) => {
    setDrafts(rows)
    const lines = cleanPhrases(rows) ?? []
    // A list that says what the originals say is the originals again.
    onChange(samePhrases(lines, originals) ? null : lines)
  }

  const add = () => {
    if (!next || full) {
      return
    }
    commit([...drafts, next])
    setFresh("")
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4" data-y2k-phrases>
      <div className="flex flex-col gap-1">
        <Text size="small" leading="compact" weight="plus">
          {words.phrasesLabel}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {words.phrasesHelp}
        </Text>
      </div>

      {drafts.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={words.phrasesLabel}>
          {drafts.map((line, index) => (
            <li key={index} className="flex items-center gap-2" data-y2k-phrase-row>
              <div className="min-w-0 flex-1">
                <Input
                  aria-label={words.phraseAria(index + 1)}
                  value={line}
                  maxLength={PHRASE_MAX_LENGTH}
                  placeholder={words.phraseBlank}
                  onChange={(event) =>
                    commit(drafts.map((row, at) => (at === index ? event.target.value : row)))
                  }
                  // Left as stored (trimmed, single spaces); an empty row
                  // stays empty rather than disappearing under the thumb.
                  onBlur={() =>
                    setDrafts((current) =>
                      current.map((row, at) =>
                        at === index ? cleanPhrases([row])?.[0] ?? "" : row
                      )
                    )
                  }
                  autoComplete="off"
                />
              </div>
              <IconButton
                type="button"
                variant="transparent"
                className="shrink-0"
                aria-label={words.phraseRemove(index + 1)}
                onClick={() => commit(drafts.filter((_row, at) => at !== index))}
              >
                <XMark />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            id="y2k-phrase-new"
            aria-label={words.phraseNew}
            value={fresh}
            maxLength={PHRASE_MAX_LENGTH}
            placeholder={words.phraseNewPlaceholder}
            onChange={(event) => setFresh(event.target.value)}
            disabled={full}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          size="small"
          variant="secondary"
          className="shrink-0"
          disabled={!next || full}
          data-y2k-phrase-add
        >
          <Plus />
          {words.phraseAdd}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text size="small" leading="compact" className="text-ui-fg-muted" role="status">
          {full
            ? words.phrasesFull(PHRASES_MAX)
            : stored.length === 0
            ? words.phrasesNone
            : words.phrasesCount(stored.length, PHRASES_MAX)}
        </Text>
        <Button
          size="small"
          variant="secondary"
          disabled={custom === null}
          onClick={() => onChange(null)}
          data-y2k-phrases-reset
        >
          {words.phrasesReset}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
          {words.phrasesPreview}
        </Text>
        <div className="y2k-hero">
          <Ticker items={[motto, ...stored]} className="py-3" />
        </div>
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
        <PhraseField
          id="y2k-opener"
          label={words.larp.openerLabel}
          help={words.larp.openerHelp}
          value={prefs.opener}
          clean={cleanOpener}
          placeholder={words.larp.openerPlaceholder}
          on={prefs.openerOn}
          size={prefs.openerSize}
          emptyNote={words.larp.openerEmpty}
          onText={(opener) => set({ opener })}
          onToggle={(openerOn) => set({ openerOn })}
          onSize={(openerSize) => set({ openerSize })}
        />
        <PhraseField
          id="y2k-motto"
          label={words.larp.mottoLabel}
          help={words.larp.mottoHelp}
          value={prefs.motto}
          clean={cleanMotto}
          placeholder={DEFAULT_MOTTO}
          on={prefs.mottoOn}
          size={prefs.mottoSize}
          original={DEFAULT_MOTTO}
          onText={(motto) => set({ motto })}
          onToggle={(mottoOn) => set({ mottoOn })}
          onSize={(mottoSize) => set({ mottoSize })}
        />
        <PhrasesField
          custom={prefs.phrases}
          originals={t.larp.mantras}
          motto={prefs.motto}
          onChange={(phrases) => set({ phrases })}
        />
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
