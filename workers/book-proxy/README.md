# ClassroomOS book proxy

A Cloudflare Worker that lets `reader.html` load book files from hosts that
don't send CORS headers, which today means Project Gutenberg. Standard Ebooks and
NASA already allow cross-origin reads, so those books work without it.

It stores nothing. Each request streams the remote file through, and
Cloudflare's edge cache absorbs repeat reads, so a class opening the same book
hits Gutenberg once.

Only URLs matching the rules in `assets/js/book-sources.mjs` are proxied. The
reader uses the same rules, and redirects are re-checked on every hop. Only
`https://mrscandrett.github.io` and localhost receive a CORS grant.

## Deploy (one time, free plan is plenty)

```bash
cd workers/book-proxy
npx wrangler login
npx wrangler deploy
```

Wrangler prints the Worker URL, e.g. `https://classroomos-book-proxy.<account>.workers.dev`.
Paste it into `BOOK_PROXY` in `assets/js/book-sources.mjs` and push. The library
then sends the remaining Gutenberg-only books to the reader too.

## Check it

```bash
curl -sI -H "Origin: https://mrscandrett.github.io" \
  "https://classroomos-book-proxy.<account>.workers.dev/?url=https%3A%2F%2Fwww.gutenberg.org%2Fcache%2Fepub%2F35%2Fpg35-images-3.epub"
```

Expect `200`, `content-type: application/epub+zip`, and
`access-control-allow-origin: https://mrscandrett.github.io`. A URL that isn't
on the allow-list returns `403`.

## Adding a source

Add a narrow rule to `SOURCES` in `assets/js/book-sources.mjs` (exact host, a
path pattern that only matches book files), then redeploy the Worker and run
`npm run check:library`. Only add sources whose files you're allowed to
redistribute: public domain, CC-licensed, or U.S. government works.
