// Auto-test : node web/lib/ownerCookie.test.mjs (Node 24, rien à installer).
import assert from "node:assert/strict";
import { signOwner, verifyOwner } from "./ownerCookie.ts";

const DAY = 24 * 60 * 60 * 1000;
process.env.HOF_COOKIE_SECRET = "secret-de-test-aaaaaaaaaaaaaaaaaaaaaaaa";

const cookie = signOwner("bob");
assert.equal(verifyOwner(cookie), "bob");

const [, timestamp, mac] = cookie.split(".");
assert.equal(verifyOwner(`alice.${timestamp}.${mac}`), null, "pseudo modifié");
assert.equal(verifyOwner(`bob.${timestamp}.${mac.slice(0, -2)}00`), null, "signature modifiée");
assert.equal(verifyOwner(`bob.${timestamp}`), null, "valeur incomplète");
assert.equal(verifyOwner(undefined), null);
assert.equal(verifyOwner(signOwner("bob", Date.now() - 399 * DAY)), "bob", "399 jours : valide");
assert.equal(verifyOwner(signOwner("bob", Date.now() - 401 * DAY)), null, "401 jours : expiré");

process.env.HOF_COOKIE_SECRET = "un-autre-secret-bbbbbbbbbbbbbbbbbbbbbbbb";
assert.equal(verifyOwner(cookie), null, "autre secret");

delete process.env.HOF_COOKIE_SECRET;
assert.equal(signOwner("bob"), null, "sans secret on ne signe pas");
assert.equal(verifyOwner(cookie), null, "sans secret on refuse tout");
console.log("OK");
