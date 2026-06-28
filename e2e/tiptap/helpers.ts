import type { JSONContent } from "@tiptap/core";
import type { Locator, Page } from "@playwright/test";
import { tiptapPlaygroundContent } from "./content";

export const TIPTAP_PATH = "/";

export async function gotoTiptapPlayground(
  page: Page,
  content: JSONContent = tiptapPlaygroundContent,
) {
  await page.goto(TIPTAP_PATH);
  await page.waitForFunction(() => window.__tiptapPlayground?.setContent);
  await page.evaluate(
    (next) => window.__tiptapPlayground!.setContent(next),
    content,
  );
  await waitForEditableEditor(page);
  await proseMirror(page)
    .getByText("First paragraph")
    .waitFor({ state: "visible" });
}

export async function waitForEditableEditor(page: Page) {
  const editor = page.getByTestId("tiptap-editor");
  await editor.locator(".ProseMirror").waitFor({ state: "visible" });
  await editor.locator(".loading").waitFor({ state: "detached" });
}

export function proseMirror(page: Page, testId = "tiptap-editor") {
  return page.getByTestId(testId).locator(".ProseMirror");
}

export function topLevelParagraphs(page: Page) {
  return proseMirror(page).locator(":scope > p");
}

export async function clickBlockWithText(page: Page, text: string) {
  await proseMirror(page).getByText(text, { exact: true }).click();
}

export async function selectText(page: Page, text: string) {
  await proseMirror(page)
    .getByText(text, { exact: true })
    .click({ clickCount: 3 });
}

export async function typeInEditor(page: Page, text: string) {
  const editor = proseMirror(page);
  await editor.click();
  await page.keyboard.type(text);
  return editor;
}

export function calloutTypeButton(page: Page) {
  return page
    .getByTestId("tiptap-editor")
    .locator("button[data-callout-picker]");
}

export function bubbleMenu(page: Page) {
  return page.getByTestId("bubble-menu");
}

export function mobileMenu(page: Page) {
  return page.getByTestId("mobile-bottom-menu");
}

export function imageInEditor(page: Page) {
  return page
    .getByTestId("tiptap-editor")
    .locator("figure.image-with-caption img")
    .first();
}

export async function openCalloutTypeDropdown(page: Page) {
  await calloutTypeButton(page).click();
  await page.getByText("Tip", { exact: true }).waitFor({ state: "visible" });
}

export async function expectParagraphOrder(page: Page, texts: string[]) {
  const paragraphs = topLevelParagraphs(page);
  await paragraphs.first().waitFor({ state: "visible" });

  for (const [index, text] of texts.entries()) {
    await expectLocatorText(paragraphs.nth(index), text);
  }
}

async function expectLocatorText(locator: Locator, text: string) {
  await locator.waitFor({ state: "visible" });
  const content = await locator.textContent();
  if (!content?.includes(text)) {
    throw new Error(`Expected "${text}" but got "${content ?? ""}"`);
  }
}
