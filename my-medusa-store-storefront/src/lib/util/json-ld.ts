/**
 * JSON for a `<script type="application/ld+json">`, safe to inline.
 *
 * `JSON.stringify` leaves `<` alone, so any value containing `</script>` — a
 * product title or description typed in the admin, say — would close the tag
 * and turn the rest of the string into live HTML. `<` is the same
 * character to a JSON parser and inert to the HTML one.
 */
export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, "\\u003c")
