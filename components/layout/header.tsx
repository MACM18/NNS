"use client";

import { Bell, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotification } from "@/contexts/notification-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { AddTelephoneLineModal } from "../modals/add-telephone-line-modal";

export function Header() {
  const { notifications, addNotification } = useNotification();
  const [openAddTelephoneLineModal, setOpenAddTelephoneLineModal] =
    useState(false);

  const handleTestNotification = () => {
    addNotification({
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      type: "info",
      duration: 5000,
    });
  };

  const unreadCount = notifications.length;

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
      <SidebarTrigger className='-ml-1' />
      <Separator orientation='vertical' className='mr-2 h-4' />

      {/* Search */}
      <div className='flex-1 max-w-md'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input placeholder='Search...' className='pl-8' />
        </div>
      </div>

      <div className='flex items-center gap-2'>
        {/* Add Line Details Button */}
        <Button onClick={() => setOpenAddTelephoneLineModal(true)} size='sm'>
          <Plus className='h-4 w-4 mr-2' />
          Add Line
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='relative'>
              <Bell className='h-4 w-4' />
              {unreadCount > 0 && (
                <Badge
                  variant='destructive'
                  className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center'
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-80'>
            <DropdownMenuLabel className='flex items-center justify-between'>
              Notifications
              <Button
                variant='ghost'
                size='sm'
                onClick={handleTestNotification}
              >
                Test
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className='flex flex-col items-start p-3'
                >
                  <div className='font-medium'>{notification.title}</div>
                  <div className='text-sm text-muted-foreground'>
                    {notification.message}
                  </div>
                </DropdownMenuItem>
              ))
            )}
            {notifications.length > 5 && (
              <DropdownMenuItem>
                <span className='text-sm text-muted-foreground'>
                  +{notifications.length - 5} more notifications
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings */}
        <Button variant='ghost' size='sm'>
          <Settings className='h-4 w-4' />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />
        {openAddTelephoneLineModal && (
          <AddTelephoneLineModal
            open={openAddTelephoneLineModal}
            onOpenChange={() => setOpenAddTelephoneLineModal(false)}
            onSuccess={() => setOpenAddTelephoneLineModal(false)}
          />
        )}
      </div>
    </header>
  );
}
