// Auto-test : node web/lib/freshness.test.mjs (Node 24, rien à installer).
import assert from "node:assert/strict";
import { isFresh } from "./freshness.ts";

const at = (iso) => new Date(iso);

assert.equal(isFresh(at("2026-11-14T10:00:00Z"), at("2026-11-14T20:00:00Z")), true, "10 h, même mois");
assert.equal(isFresh(at("2026-11-14T10:00:00Z"), at("2026-11-15T10:00:01Z")), false, "plus de 24 h");
assert.equal(isFresh(at("2026-10-31T22:00:00Z"), at("2026-11-01T01:00:00Z")), false, "3 h plus tard, mais mois précédent");
assert.equal(isFresh(at("2026-12-31T23:30:00Z"), at("2027-01-01T00:10:00Z")), false, "changement d'année");
assert.equal(isFresh(at("2026-12-01T00:00:00Z"), at("2026-12-01T23:59:59Z")), true, "1er du mois, même jour");
assert.equal(isFresh(at("2026-10-28T17:00:00Z"), at("2026-10-28T20:00:00Z")), false, "calculé avant la livraison de la V3");
console.log("OK");
