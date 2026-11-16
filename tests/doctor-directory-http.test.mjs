import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.DIRECTORY_TEST_BASE_URL;
const options = { skip: !baseUrl && "Set DIRECTORY_TEST_BASE_URL to an isolated production server" };

async function get(path) {
  const response = await fetch(new URL(path, baseUrl));
  return { response, html: await response.text() };
}

function assertMetadata(html, path, robots = "index, follow") {
  assert.ok(html.includes(`<link rel="canonical" href="https://www.terminboerse.at${path}"/>`));
  assert.ok(html.includes(`<meta name="robots" content="${robots}"/>`));
}

function profileLinks(html) {
  return [...html.matchAll(/href="(\/arzt\/[^"]+)"/g)].map((match) => match[1]);
}

test("unfiltered directories and pagination are ISR-backed and crawlable", options, async () => {
  for (const root of ["/arzt", "/arzttermin-wien/hausarzt", "/arzttermin-wien/hautarzt", "/arzttermin-wien/frauenarzt", "/arzttermin-wien/zahnarzt", "/arzttermin-wien/kinderarzt"]) {
    const first = await get(root);
    assert.equal(first.response.status, 200);
    assert.match(first.response.headers.get("cache-control"), /s-maxage=600(?:,|$)/);
    assertMetadata(first.html, root);
    if (!first.html.includes(`href="${root}?page=2"`)) {
      const count = first.html.match(/Treffer: <span[^>]*>(\d+)<\/span>/);
      assert.ok(count && Number(count[1]) <= 24);
      continue;
    }
    assert.ok(profileLinks(first.html).length > 0);

    const second = await get(`${root}?page=2`);
    const repeated = await get(`${root}?page=2`);
    assert.equal(second.response.status, 200);
    assert.match(second.response.headers.get("cache-control"), /s-maxage=600(?:,|$)/);
    assert.equal(repeated.response.headers.get("x-nextjs-cache"), "HIT");
    assertMetadata(second.html, `${root}?page=2`);
    assert.ok(second.html.includes(`href="${root}?page=1"`));
    assert.notEqual(profileLinks(first.html)[0], profileLinks(second.html)[0]);
  }
});

test("filtered URLs remain functional and noindex without disallowing crawlers", options, async () => {
  for (const [path, canonical] of [
    ["/arzt?search=schmidt", "/arzt"],
    ["/arzt?category=Dermatologie&page=2", "/arzt?page=2"],
    ["/arzttermin-wien/hausarzt?district=01.%20Bezirk", "/arzttermin-wien/hausarzt"],
  ]) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200);
    assertMetadata(html, canonical, "noindex, follow");
  }
  const legacy = await get("/arzttermin-wien/hausarzt?page=2&category=Hausarzt%20%2F%20Allgemeinmedizin");
  assert.equal(legacy.response.status, 200);
  assertMetadata(legacy.html, "/arzttermin-wien/hausarzt?page=2");
  const robots = await get("/robots.txt");
  assert.doesNotMatch(robots.html, /Disallow:.*(search|category|district)/i);
});

test("public doctor API has a bounded shared cache", options, async () => {
  const { response, html } = await get("/api/doctors?page=2");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /s-maxage=60/);
  const payload = JSON.parse(html);
  assert.equal(payload.pagination.page, 2);
  assert.ok(payload.doctors.length > 0);

  const searchPage = await get("/arzt?search=schmidt");
  const searchApi = await get("/api/doctors?q=schmidt");
  const count = searchPage.html.match(/Treffer: <span[^>]*>(\d+)<\/span>/);
  assert.ok(count);
  assert.equal(JSON.parse(searchApi.html).pagination.total, Number(count[1]));
});

test("home page retains its 30-second ISR with the configured data store", options, async () => {
  const { response } = await get("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /s-maxage=30(?:,|$)/);
});
