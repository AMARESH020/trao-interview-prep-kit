import assert from "node:assert/strict";
import test from "node:test";

import {
  researchCompany,
} from "../services/research/research.service.js";

test("rejects invalid company URLs", async () => {
  await assert.rejects(
    () =>
      researchCompany(
        "not-a-valid-url"
      ),
    /Invalid company URL/
  );
});

test("rejects unsupported URL protocols", async () => {
  await assert.rejects(
    () =>
      researchCompany(
        "ftp://example.com"
      ),
    /Company URL must use HTTP or HTTPS/
  );
});

test("rejects localhost URLs", async () => {
  await assert.rejects(
    () =>
      researchCompany(
        "http://localhost:3000"
      ),
    /Private or loopback company URLs are not allowed/
  );
});

test("rejects private network URLs", async () => {
  await assert.rejects(
    () =>
      researchCompany(
        "http://192.168.1.10"
      ),
    /Private or loopback company URLs are not allowed/
  );
});

test("handles an unreachable public company URL without crashing", async () => {
  const result = await researchCompany(
    "https://example.invalid"
  );

  assert.ok(result);
  assert.equal(
    result.companyUrl,
    "https://example.invalid/"
  );

  assert.ok(
    Array.isArray(result.pages)
  );

  assert.ok(
    Array.isArray(result.pagesUsed)
  );

  assert.ok(
    Array.isArray(result.sources)
  );
});