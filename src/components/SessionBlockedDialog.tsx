import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Monitor, Smartphone } from "lucide-react";

interface SessionBlockedDialogProps {
  open: boolean;
  blockReason: 'untrusted_device' | 'concurrent_session' | null;
  activeDeviceLabel: string | null;
  onSignOut: () => void;
}

export function SessionBlockedDialog({ open, blockReason, activeDeviceLabel, onSignOut }: SessionBlockedDialogProps) {
  const isDeviceLock = blockReason === 'untrusted_device';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">
              {isDeviceLock ? 'Unregistered Device' : 'Account Active Elsewhere'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            {isDeviceLock ? (
              <>
                <p>
                  This device is <strong>not registered</strong> for your account. 
                  For security, your account can only be accessed from the device 
                  where you originally signed up.
                </p>
                {activeDeviceLabel && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      Registered device: {activeDeviceLabel}
                    </span>
                  </div>
                )}
                <p className="text-xs">
                  If you changed your device or browser, please contact support to reset 
                  your trusted device. An admin can help you register this new device.
                </p>
              </>
            ) : (
              <>
                <p>
                  Your account is currently being used on another device. Only one 
                  device can be active at a time.
                </p>
                {activeDeviceLabel && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
                    <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      Active on: {activeDeviceLabel}
                    </span>
                  </div>
                )}
                <p className="text-xs">
                  Wait for the other session to expire, or contact support.
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onSignOut} className="w-full">
            Sign Out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
