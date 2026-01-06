# Toast Notifications Configuration

## Changes Made

### 1. Toast Position - Top Middle

Updated `ToastViewport` in `/components/ui/toast.tsx`:

- **Position:** `fixed top-0 left-1/2 -translate-x-1/2`
- **Z-index:** `z-[100]` (appears above all content)
- **Max width:** `sm:max-w-[420px]` (responsive width)
- **Alignment:** Centered horizontally using `left-1/2` and `-translate-x-1/2`

### 2. Animation Direction

Updated `toastVariants` for vertical animations:

- **Enter animation:** `slide-in-from-top-full` (slides down from top)
- **Exit animation:** `slide-out-to-top-full` (slides up and out)
- **Swipe direction:** Changed from horizontal (`translate-x`) to vertical (`translate-y`)
- **Fade effect:** `fade-out-80` on close

### 3. Visual Features

- **Shadow:** `shadow-lg` for depth
- **Border radius:** `rounded-md` for smooth corners
- **Padding:** `p-6 pr-8` for content spacing
- **Transition:** `transition-all` for smooth animations

## How to Use Toasts

### Basic Usage

```typescript
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();

  const showToast = () => {
    toast({
      title: "Success!",
      description: "Your changes have been saved.",
    });
  };

  return <button onClick={showToast}>Show Toast</button>;
}
```

### Success Toast

```typescript
toast({
  title: "Success",
  description: "Operation completed successfully.",
  variant: "default",
});
```

### Error Toast

```typescript
toast({
  title: "Error",
  description: "Something went wrong. Please try again.",
  variant: "destructive",
});
```

### Toast with Action

```typescript
toast({
  title: "File uploaded",
  description: "Your file has been uploaded successfully.",
  action: <ToastAction altText='View'>View</ToastAction>,
});
```

### Custom Duration

```typescript
toast({
  title: "Quick message",
  description: "This will disappear quickly.",
  duration: 3000, // 3 seconds
});
```

## Animation Behavior

### Opening Animation

1. Toast appears from top of screen
2. Slides down smoothly with `slide-in-from-top-full`
3. Fades in simultaneously
4. Takes ~200-300ms to complete

### Closing Animation

1. Toast slides up with `slide-out-to-top-full`
2. Fades out with `fade-out-80` (80% opacity fade)
3. Removes from DOM after animation completes
4. Takes ~200-300ms to complete

### Swipe Gesture

- Users can swipe up to dismiss (on mobile)
- Follows finger/cursor movement
- Snaps back if swipe is cancelled
- Completes dismiss if swiped far enough

## Styling Variants

### Default Variant

```typescript
toast({
  variant: "default",
  title: "Notification",
  description: "This is a standard notification.",
});
```

- Background: `bg-background`
- Text: `text-foreground`
- Border: `border`

### Destructive Variant (Errors)

```typescript
toast({
  variant: "destructive",
  title: "Error",
  description: "An error occurred.",
});
```

- Background: `bg-destructive`
- Text: `text-destructive-foreground`
- Border: `border-destructive`

## Current Configuration

### Position

- **Desktop/Tablet:** Top center of screen
- **Mobile:** Top center, with padding from edges
- **Z-index:** 100 (above modals and navigation)

### Stacking

- Multiple toasts stack vertically
- Newest appears below previous
- Maximum visible: Controlled by `TOAST_LIMIT` in `use-toast.ts`

### Auto-dismiss

- Default duration: Set in `use-toast.ts`
- Can be customized per toast
- User can manually dismiss with X button

## Testing Toasts

Test toasts are working in the Settings page:

1. Go to `/dashboard/settings`
2. Try changing password (shows success/error toast)
3. Update notification settings (shows success toast)
4. Update security settings (shows success toast)
5. Export data (shows success/error toast)

## Customization Options

### Change Position

Edit `ToastViewport` className in `/components/ui/toast.tsx`:

```typescript
// Top left
"fixed top-0 left-0 z-[100] flex max-h-screen w-full flex-col p-4";

// Top right
"fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4";

// Bottom center (current is top center)
"fixed bottom-0 left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full flex-col p-4";
```

### Change Animation Speed

Add to `toastVariants` className:

```typescript
// Faster
"duration-150";

// Slower
"duration-500";
```

### Change Max Width

Edit `ToastViewport`:

```typescript
// Wider
"sm:max-w-[600px]";

// Narrower
"sm:max-w-[320px]";
```

## Troubleshooting

### Toasts Not Showing

1. ✅ **Check Toaster component is in layout:** Already in `app/layout.tsx`
2. ✅ **Verify imports:** Using `@/hooks/use-toast` (correct path)
3. ✅ **Check z-index:** Set to 100, should be visible
4. ✅ **Animations configured:** Slide-in/out animations are set

### Toasts Cut Off

- Increase viewport padding: Change `p-4` to `p-6` in `ToastViewport`
- Check for overflow hidden on parent containers
- Verify z-index is higher than other elements

### Animations Not Working

- Ensure Tailwind CSS is properly configured
- Check that `animate-in` and `animate-out` utilities are available
- Verify `@radix-ui/react-toast` is installed

## Performance Notes

- Toasts use Radix UI primitives (optimized)
- Animations are GPU-accelerated (transform, opacity)
- Automatic cleanup after dismiss
- Limit concurrent toasts with `TOAST_LIMIT`

## Accessibility

- ✅ **Keyboard accessible:** Can be dismissed with Escape
- ✅ **Screen reader support:** Uses ARIA attributes from Radix
- ✅ **Focus management:** Automatically managed
- ✅ **Color contrast:** Meets WCAG standards

## Future Enhancements

1. **Toast Queue:** Add queuing for multiple toasts
2. **Progress Bar:** Show auto-dismiss timer
3. **Sound Effects:** Optional sound on toast appearance
4. **Custom Icons:** Add icons for success/error/warning/info
5. **Grouped Toasts:** Combine similar toasts
6. **Persist Toasts:** Option to keep toast until manually dismissed

---

**Status:** ✅ Configured and working
**Last Updated:** December 28, 2025
