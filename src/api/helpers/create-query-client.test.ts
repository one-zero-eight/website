import { messages as enMessages } from "@/locales/en.po";
import { messages as ruMessages } from "@/locales/ru.po";
import { i18n } from "@lingui/core";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  formatApiErrorDescriptor,
  formatApiErrorMessage,
} from "./create-query-client";

describe("formatApiErrorMessage localization", () => {
  beforeAll(() => {
    i18n.load({
      en: enMessages,
      ru: ruMessages,
    });
  });

  afterEach(() => {
    i18n.activate("en");
  });

  it("formats the same network error using the current locale", () => {
    const error = new TypeError("Failed to fetch");

    i18n.activate("en");
    expect(formatApiErrorMessage(error)).toBe("Network error: Failed to fetch");

    i18n.activate("ru");
    expect(formatApiErrorMessage(error)).toBe("Ошибка сети: Failed to fetch");
  });

  it("localizes HTTP error prefixes without translating backend details", () => {
    const error = {
      httpCode: 403,
      body: { detail: "Access denied by server" },
    };

    i18n.activate("en");
    expect(formatApiErrorMessage(error)).toBe(
      "Error 403: Access denied by server",
    );

    i18n.activate("ru");
    expect(formatApiErrorMessage(error)).toBe(
      "Ошибка 403: Access denied by server",
    );
    expect(formatApiErrorMessage({ httpCode: 404 })).toBe("Ошибка 404");
    expect(formatApiErrorMessage(undefined)).toBe("Неизвестная ошибка");
  });

  it.each([
    {
      error: new TypeError("Failed to fetch"),
      english: "Network error: Failed to fetch",
      russian: "Ошибка сети: Failed to fetch",
    },
    {
      error: { httpCode: 403, body: { detail: "Access denied by server" } },
      english: "Error 403: Access denied by server",
      russian: "Ошибка 403: Access denied by server",
    },
    {
      error: {
        httpCode: 400,
        body: { detail: { message: "Backend failure" } },
      },
      english: "Error 400: Backend failure",
      russian: "Ошибка 400: Backend failure",
    },
    {
      error: { httpCode: 400, body: { detail: { reason: "Invalid field" } } },
      english: 'Error 400: {"reason":"Invalid field"}',
      russian: 'Ошибка 400: {"reason":"Invalid field"}',
    },
    {
      error: { httpCode: 404 },
      english: "Error 404",
      russian: "Ошибка 404",
    },
    {
      error: undefined,
      english: "Unknown error",
      russian: "Неизвестная ошибка",
    },
  ])(
    "renders a stored descriptor after switching locale: $english",
    ({ error, english, russian }) => {
      i18n.activate("en");
      const descriptor = formatApiErrorDescriptor(error);
      expect(typeof descriptor).toBe("object");
      if (typeof descriptor === "string")
        throw new Error("Expected a descriptor");
      expect(i18n._(descriptor)).toBe(english);

      i18n.activate("ru");
      expect(i18n._(descriptor)).toBe(russian);
    },
  );

  it.each([
    {
      error: {
        httpCode: 422,
        body: {
          detail: [
            { msg: "Value error, `Invalid field`" },
            { msg: "Missing field" },
          ],
        },
      },
      expected: "Invalid field; Missing field",
    },
    { error: new Error("Backend failure"), expected: "Backend failure" },
    { error: "Raw backend detail", expected: "Raw backend detail" },
    { error: 123, expected: "123" },
  ])("preserves raw error text: $expected", ({ error, expected }) => {
    i18n.activate("en");
    const descriptor = formatApiErrorDescriptor(error);
    expect(descriptor).toBe(expected);

    i18n.activate("ru");
    expect(formatApiErrorDescriptor(error)).toBe(descriptor);
    expect(formatApiErrorMessage(error)).toBe(expected);
  });

  it("preserves backend validation messages and ordinary errors", () => {
    i18n.activate("ru");
    expect(
      formatApiErrorMessage({
        httpCode: 422,
        body: { detail: [{ msg: "Value error, `Invalid field`" }] },
      }),
    ).toBe("Invalid field");
    expect(formatApiErrorMessage(new Error("Backend failure"))).toBe(
      "Backend failure",
    );
  });
});
