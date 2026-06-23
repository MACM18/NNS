"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Cable,
  Package,
  FileText,
  Layers,
  Calculator,
  Settings,
  PlusCircle,
  User,
  RefreshCw,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";

interface CommandMenuProps {
  onAddLine: () => void;
  onAddTask: () => void;
}

export function CommandMenu({ onAddLine, onAddTask }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const handleTrigger = () => setOpen(true);
    window.addEventListener("trigger-command-menu", handleTrigger);
    return () => window.removeEventListener("trigger-command-menu", handleTrigger);
  }, []);

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Pages & Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Overview</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/lines"))}>
            <Cable className="mr-2 h-4 w-4" />
            <span>Lines Details & Mapping</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/inventory"))}>
            <Package className="mr-2 h-4 w-4" />
            <span>Inventory Management</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/invoices"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Invoices & Billing</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/accounting"))}>
            <Layers className="mr-2 h-4 w-4" />
            <span>Accounting Ledger</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/payroll"))}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Worker Payroll</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions & Shortcuts">
          <CommandItem onSelect={() => runCommand(() => onAddLine())}>
            <PlusCircle className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium text-primary">Add New Line Detail</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => onAddTask())}>
            <PlusCircle className="mr-2 h-4 w-4 text-accent" />
            <span className="font-medium text-accent">Create New Task Assignment</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/integrations"))}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Sync Google Sheets</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings & Account">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/profile"))}>
            <User className="mr-2 h-4 w-4" />
            <span>My Profile</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>System Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
