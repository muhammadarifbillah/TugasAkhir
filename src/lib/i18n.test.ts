import { test } from "vitest";
import assert from "node:assert/strict";

import { getLocaleFromAcceptLanguage, getLocaleFromCookie, isLocale, locales } from "./i18n";

test("isLocale accepts only supported locales", () => {
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("id"), true);
  assert.equal(isLocale("fr"), false);
});

test("getLocaleFromCookie parses NEXT_LOCALE", () => {
  assert.equal(getLocaleFromCookie("NEXT_LOCALE=id; other=1"), "id");
  assert.equal(getLocaleFromCookie("NEXT_LOCALE=fr"), null);
  assert.equal(getLocaleFromCookie(null), null);
});

test("getLocaleFromAcceptLanguage matches supported languages and falls back to en", () => {
  assert.equal(getLocaleFromAcceptLanguage("id-ID,id;q=0.9,en;q=0.8"), "id");
  assert.equal(getLocaleFromAcceptLanguage("fr-FR,fr;q=0.9"), "en");
  assert.equal(getLocaleFromAcceptLanguage(null), "en");
});

test("the app ships exactly two locales", () => {
  assert.deepEqual([...locales], ["en", "id"]);
});
