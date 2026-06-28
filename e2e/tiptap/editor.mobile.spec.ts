import { expect, test } from "@playwright/test";
import {
  calloutTypeButton,
  clickBlockWithText,
  expectParagraphOrder,
  gotoTiptapPlayground,
  imageInEditor,
  mobileMenu,
  proseMirror,
  selectText,
} from "./helpers";

test.describe("Tiptap editor mobile", () => {
  test.beforeEach(async ({ page }) => {
    await gotoTiptapPlayground(page);
  });

  test("shows sticky bottom menu instead of bubble menu", async ({ page }) => {
    await expect(page.getByTestId("mobile-bottom-menu")).toBeVisible();
    await expect(page.getByTestId("bubble-menu")).toHaveCount(0);
  });

  test("formats selected text from bottom menu", async ({ page }) => {
    await selectText(page, "Second paragraph");
    const menu = mobileMenu(page);
    await expect(menu.getByTitle("Bold")).toBeVisible();
    await menu.getByTitle("Bold").click();
    await expect(proseMirror(page).locator("strong")).toContainText(
      "Second paragraph",
    );
  });

  test("moves the current block down", async ({ page }) => {
    await clickBlockWithText(page, "First paragraph");
    await page
      .getByTestId("mobile-bottom-menu")
      .getByTitle("Move down")
      .click();
    await expectParagraphOrder(page, ["Second paragraph", "First paragraph"]);
  });

  test("opens callout type dropdown from callout header", async ({ page }) => {
    await calloutTypeButton(page).click();
    await expect(page.getByText("Caution", { exact: true })).toBeVisible();
    await page.getByText("Caution", { exact: true }).click();
    await expect(calloutTypeButton(page)).toContainText("CAUTION");
  });

  test("shows image actions in bottom menu after clicking image", async ({
    page,
  }) => {
    await imageInEditor(page).click();
    const menu = mobileMenu(page);
    await expect(menu.getByTitle("Replace image")).toBeVisible();
    await expect(menu.getByTitle("Download original")).toBeVisible();
    await expect(menu.getByTitle("Delete image")).toBeVisible();
  });

  test("read-only viewer hides editing controls", async ({ page }) => {
    const viewer = page.getByTestId("tiptap-viewer");
    await expect(viewer.locator(".tiptap-readonly")).toBeVisible();
    await expect(viewer.locator("[data-callout-picker]")).toHaveCount(0);
  });
});
