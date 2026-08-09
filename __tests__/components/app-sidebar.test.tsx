import { render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/dashboard/accounting/partners"),
}));

const useAuthMock = useAuth as jest.Mock;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

function renderSidebar(role: string) {
  useAuthMock.mockReturnValue({ role, loading: false, signOut: jest.fn() });
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("dashboard sidebar organization", () => {
  it("shows accounting and administration sections for superadmins", () => {
    renderSidebar("superadmin");

    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("Accounting")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByText("Partners")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Work Tracking")).toBeInTheDocument();
  });

  it("keeps accounting hidden from regular users", () => {
    renderSidebar("user");

    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.queryByText("Accounting")).not.toBeInTheDocument();
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
    expect(screen.queryByText("Partners")).not.toBeInTheDocument();
  });
});
