This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Doctor directory caching

The public `/arzt` and `/arzttermin-wien/<specialty>` URLs, including their
unfiltered `?page=N` pagination, are rewritten to an internal ISR route.
The browser URL and canonical URL remain unchanged. The first page is built
ahead of time; further pages are generated on demand and revalidated after
600 seconds because the directory cards include appointment previews. The
profile-only directory data cache remains at 3600 seconds; it does not cache
live slot availability. Filtered searches remain dynamic and use `noindex, follow`.
Legacy specialty pagination links with a `category` parameter still work.

The home page reuses the same directory data cache while keeping its existing
30-second ISR interval. The public directory API uses a shared 60-second cache, so slot and view
previews can be briefly stale. Doctor profile changes invalidate the directory
data and ISR route using the existing profile invalidation helper; external
CDN copies can remain cached until their TTL expires. Booking and private
account endpoints are not shared-cached. The sitemap and robots.txt still
allow discovery of the indexable hubs and pagination.

To check the production build against an **isolated** local data source:

```bash
NEXT_PUBLIC_SUPABASE_URL='' SUPABASE_SERVICE_ROLE_KEY='' KV_REST_API_URL='' KV_REST_API_TOKEN='' npm run build
NEXT_PUBLIC_SUPABASE_URL='' SUPABASE_SERVICE_ROLE_KEY='' KV_REST_API_URL='' KV_REST_API_TOKEN='' npm start -- -p 3187
# In a second terminal:
DIRECTORY_TEST_BASE_URL=http://localhost:3187 node --test tests/doctor-directory-http.test.mjs
```

### Preview acceptance checklist

Replace `<preview>` with the Vercel Preview deployment origin. Do not merge to
`main` or deploy to production before the preview is approved.

- `<preview>/`: doctor links and the free-slot preview should work (existing
  30-second ISR).
- `<preview>/arzt`, `<preview>/arzt?page=2`, `<preview>/arzt?page=3`: verify
  different doctor cards, working previous/next links, and 600-second ISR.
- `<preview>/arzttermin-wien/hausarzt` and
  `<preview>/arzttermin-wien/hausarzt?page=2`: verify the specialty is retained
  without adding a redundant `category` parameter.
- Check `/arzttermin-wien/hautarzt`, `/arzttermin-wien/frauenarzt`,
  `/arzttermin-wien/zahnarzt`, and `/arzttermin-wien/kinderarzt` as well.
  An empty specialty must not generate links to nonexistent result pages.
- `<preview>/arzt?search=schmidt`,
  `<preview>/arzt?category=Dermatologie&page=2`, and
  `<preview>/arzttermin-wien/hausarzt?district=01.%20Bezirk`: verify the filters
  and inspect the server HTML for `<meta name="robots" content="noindex, follow">`.
  Their canonical URLs should omit filter parameters. Unfiltered hubs and
  pagination retain `index, follow` in HTML.
- `<preview>/robots.txt` and `<preview>/sitemap.xml`: verify they are accessible.
  Canonical and sitemap URLs intentionally use the production domain. Vercel
  may additionally send `X-Robots-Tag: noindex` for the whole Preview deployment;
  that platform header is separate from application HTML metadata.
- `<preview>/api/doctors?page=2`: verify the response has doctors and
  `Cache-Control` with `s-maxage=60, stale-while-revalidate=60`.
- Request an unfiltered hub or pagination URL twice. Confirm the second request
  is cached using `x-vercel-cache` and/or `x-nextjs-cache`; the origin ISR lifetime
  is 600 seconds. Vercel can consume shared-cache directives before forwarding
  the response to the browser.

Appointment flow (use only a dedicated test doctor and test slot; Preview can
share the production database):

1. Follow a free-slot preview to its doctor profile. Check that the selected
   doctor, slot date/time, and external/internal booking action are correct.
2. Open the internal appointment dialog and check required-field validation.
   Submit only with test data against the dedicated test slot.
3. Confirm success; attempt the same slot again and verify it cannot be booked
   twice. A stale preview must not bypass the server-side availability check.
4. For a doctor with external booking, verify the button opens the intended
   booking provider without submitting a real appointment.
5. For a doctor with booking disabled or no slots, verify the contact/no-slot
   state and that no invalid reservation can be submitted.
6. Clean up the test reservation through the normal management interface. Do
   not create, cancel, or modify real patient appointments for this check.
