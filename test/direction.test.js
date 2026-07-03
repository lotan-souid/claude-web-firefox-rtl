"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { detectDirection, findLtrRuns } = require("../src/direction");

test("detects Hebrew as RTL", () => {
  assert.equal(detectDirection("שלום world"), "rtl");
});

test("detects English as LTR", () => {
  assert.equal(detectDirection("Hello עולם"), "ltr");
});

test("ignores punctuation and numbers before the first strong character", () => {
  assert.equal(detectDirection("123... עברית"), "rtl");
  assert.equal(detectDirection("42 - English"), "ltr");
});

test("detects numbered Hebrew headings with leading punctuation as RTL", () => {
  assert.equal(detectDirection("1. תקשורת פנימית בין השירותים (service-to-service)"), "rtl");
});

test("detects mixed Hebrew technical prose as RTL", () => {
  assert.equal(
    detectDirection("כשאתה מגדיר ב-GeoServer את חיבור ה-PostGIS, אתה לא צריך שום reverse proxy. Docker Compose כבר נותן לך את זה בחינם."),
    "rtl"
  );
});

test("finds separate LTR runs around RTL sentence punctuation", () => {
  assert.deepEqual(
    findLtrRuns("אתה לא צריך שום reverse proxy. Docker Compose כבר נותן"),
    [
      { start: 16, end: 29, value: "reverse proxy" },
      { start: 31, end: 45, value: "Docker Compose" }
    ]
  );
});

test("finds technical LTR runs inside Hebrew prose", () => {
  assert.deepEqual(findLtrRuns("כל שירות ברשת gis-network יכול לפנות אל 192.168.0.135:5432"), [
    { start: 14, end: 25, value: "gis-network" },
    { start: 40, end: 58, value: "192.168.0.135:5432" }
  ]);
});

test("returns auto when there is no strong character", () => {
  assert.equal(detectDirection("123 +-="), "auto");
});
