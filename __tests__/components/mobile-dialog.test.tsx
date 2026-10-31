import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";

function FormDialog({ onOpenAutoFocus, className }: { onOpenAutoFocus?: (event: Event) => void; className?: string }) {
  return <Dialog>
    <DialogTrigger>Open form</DialogTrigger>
    <DialogContent className={className} onOpenAutoFocus={onOpenAutoFocus}>
      <DialogTitle>Edit line</DialogTitle>
      <DialogDescription>Enter the customer details.</DialogDescription>
      <input aria-label="Customer" />
      <button>Save</button>
    </DialogContent>
  </Dialog>;
}

const originalViewport = Object.getOwnPropertyDescriptor(window, "visualViewport");
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
let viewport: EventTarget & { height: number; offsetTop: number };
let mobile: boolean;

beforeEach(() => {
  mobile = true;
  viewport = Object.assign(new EventTarget(), { height: 700, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: jest.fn(() => ({ matches: mobile })) });
});

afterEach(() => {
  if (originalViewport) Object.defineProperty(window, "visualViewport", originalViewport);
  else Reflect.deleteProperty(window, "visualViewport");
  if (originalMatchMedia) Object.defineProperty(window, "matchMedia", originalMatchMedia);
  else Reflect.deleteProperty(window, "matchMedia");
});

it("opens without focusing a mobile text field and restores focus when closed", async () => {
  const user = userEvent.setup();
  render(<FormDialog />);
  const trigger = screen.getByRole("button", { name: "Open form" });
  await user.click(trigger);
  expect(screen.getByRole("dialog")).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("textbox")).toHaveFocus();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
});

it("responds to keyboard resizing and panning, and removes listeners when closed", async () => {
  const user = userEvent.setup();
  const removeListener = jest.spyOn(viewport, "removeEventListener");
  render(<FormDialog />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.style.getPropertyValue("--dialog-viewport-height")).toBe("700px");
  act(() => {
    viewport.height = 320;
    viewport.offsetTop = 40;
    viewport.dispatchEvent(new Event("resize"));
  });
  expect(dialog.style.getPropertyValue("--dialog-viewport-height")).toBe("320px");
  expect(dialog.style.getPropertyValue("--dialog-viewport-top")).toBe("40px");
  act(() => {
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
  });
  expect(dialog.style.getPropertyValue("--dialog-viewport-top")).toBe("60px");
  await user.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(removeListener).toHaveBeenCalledWith("resize", expect.any(Function)));
  expect(removeListener).toHaveBeenCalledWith("scroll", expect.any(Function));
});

it("keeps compact dialogs centered without Tailwind's horizontal translate", async () => {
  const user = userEvent.setup();
  render(<FormDialog />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.style.getPropertyValue("left")).toBe("max(0.5rem, env(safe-area-inset-left))");
  expect(dialog.style.getPropertyValue("right")).toBe("max(0.5rem, env(safe-area-inset-right))");
  expect(dialog.style.getPropertyValue("translate")).toBe("none");
  expect(dialog.style.getPropertyValue("transform")).toBe("translateY(-50%)");
});

it("uses the full visible viewport for the Add Line dialog on compact screens", async () => {
  const user = userEvent.setup();
  render(<FormDialog className="add-line-dialog" />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.style.getPropertyValue("position")).toBe("fixed");
  expect(dialog.style.getPropertyValue("left")).toBe("0px");
  expect(dialog.style.getPropertyValue("right")).toBe("0px");
  expect(dialog.style.getPropertyValue("width")).toBe("100vw");
  expect(dialog.style.getPropertyValue("translate")).toBe("none");
});

it("keeps normal desktop autofocus", async () => {
  mobile = false;
  const user = userEvent.setup();
  render(<FormDialog />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  expect(screen.getByRole("textbox")).toHaveFocus();
});

it("preserves an explicit autofocus handler", async () => {
  const user = userEvent.setup();
  render(<FormDialog onOpenAutoFocus={(event) => {
    event.preventDefault();
    screen.getByRole("button", { name: "Save" }).focus();
  }} />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
});

it("falls back to window height when VisualViewport is unavailable", async () => {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  const user = userEvent.setup();
  render(<FormDialog />);
  await user.click(screen.getByRole("button", { name: "Open form" }));
  expect(screen.getByRole("dialog").style.getPropertyValue("--dialog-viewport-height")).toBe(`${window.innerHeight}px`);
});

it("keeps cancel focused in confirmation dialogs", async () => {
  const user = userEvent.setup();
  render(<AlertDialog>
    <AlertDialogTrigger>Remove record</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Remove this record?</AlertDialogTitle>
      <AlertDialogDescription>This removes the selected record.</AlertDialogDescription>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Remove</AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>);
  await user.click(screen.getByRole("button", { name: "Remove record" }));
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  expect(screen.getByRole("alertdialog").style.getPropertyValue("--dialog-viewport-height")).toBe("700px");
});
