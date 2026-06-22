import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, KeyRound, ArrowLeft, Save, Loader2, Volume2, VolumeX, Trash2, BarChart2, Bell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "@/lib/sounds";
import { AvatarUploader } from "@/components/AvatarUploader";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  avatarUrl: z.string().optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());

  const defaultNotifPrefs = {
    priceAlerts: true,
    achievements: true,
    friendRequests: true,
    lessonReminders: true,
    tradeConfirmations: true,
    marketEvents: true,
    weeklyDigest: false,
    dnd: false,
  };
  const userPrefs = (user as any)?.notificationPrefs as Record<string, boolean> | null;
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    ...defaultNotifPrefs,
    ...(userPrefs || {}),
  });
  const dndOn = notifPrefs.dnd === true;

  const notifMutation = useMutation({
    mutationFn: async (prefs: Record<string, boolean>) => {
      const response = await apiRequest("PATCH", "/api/user/notifications", prefs);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Notifications updated", description: "Your notification preferences have been saved." });
      refreshUser();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save preferences", variant: "destructive" });
    },
  });

  const handleNotifToggle = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    notifMutation.mutate(updated);
  };

  const [defaultSymbol, setDefaultSymbolState] = useState(
    () => localStorage.getItem("sim-default-symbol") || "AAPL"
  );

  const handleDefaultSymbolChange = (value: string) => {
    setDefaultSymbolState(value);
    localStorage.setItem("sim-default-symbol", value);
    toast({ title: "Default symbol saved", description: `Simulator will open on ${value} from now on.` });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/account");
      return response.json();
    },
    onSuccess: () => {
      logout();
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    deleteMutation.mutate();
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      playNotificationSound();
    }
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      username: user?.username ?? "",
      bio: (user as any)?.bio ?? "",
      avatarUrl: user?.avatarUrl ?? "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const payload = {
        displayName: data.displayName,
        username: data.username || null,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
      };
      const response = await apiRequest("PATCH", "/api/user/profile", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await apiRequest("POST", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      profileForm.reset({
        displayName: user.displayName ?? "",
        username: (user as any).username ?? "",
        bio: (user as any).bio ?? "",
        avatarUrl: user.avatarUrl ?? "",
      });
    }
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profile")}
          data-testid="button-back-profile"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your display name, bio, and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => profileMutation.mutate(data))} className="space-y-6">
                <div className="flex items-center gap-6">
                  <AvatarUploader
                    currentAvatarUrl={profileForm.watch("avatarUrl") || null}
                    displayName={profileForm.watch("displayName") || user.displayName || "U"}
                    onUploadComplete={(avatarPath) => {
                      profileForm.setValue("avatarUrl", avatarPath);
                      toast({
                        title: "Avatar uploaded",
                        description: "Your profile picture has been updated.",
                      });
                      refreshUser();
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Click the camera icon to upload a new profile picture
                    </p>
                  </div>
                </div>

                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your display name" 
                          {...field}
                          data-testid="input-display-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">@</span>
                          <Input 
                            placeholder="username" 
                            {...field}
                            data-testid="input-username"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Unique username used for identification (3-20 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself..."
                          className="resize-none"
                          rows={4}
                          {...field}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        {(field.value?.length || 0)}/500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={profileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password by entering your current password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter current password"
                          {...field}
                          data-testid="input-current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter new password"
                          {...field}
                          data-testid="input-new-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm new password"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={passwordMutation.isPending}
                  data-testid="button-change-password"
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Change Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              Sound & Notifications
            </CardTitle>
            <CardDescription>
              Control sound effects and audio notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="sound-toggle">Sound Effects</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds for trades, achievements, and notifications
                </p>
              </div>
              <Switch
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={handleSoundToggle}
                data-testid="switch-sound-toggle"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose which in-app alerts you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`flex items-center justify-between gap-4 rounded-lg p-3 border ${dndOn ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"}`}>
              <div className="space-y-0.5">
                <Label htmlFor="notif-dnd" className={dndOn ? "text-destructive font-semibold" : "font-semibold"}>
                  Do Not Disturb
                </Label>
                <p className="text-sm text-muted-foreground">
                  {dndOn ? "All notifications are silenced — individual settings preserved" : "Silence everything with one switch"}
                </p>
              </div>
              <Switch
                id="notif-dnd"
                checked={dndOn}
                onCheckedChange={(val) => handleNotifToggle("dnd", val)}
                disabled={notifMutation.isPending}
                data-testid="switch-notif-dnd"
              />
            </div>

            <div className={`space-y-4 transition-opacity duration-200 ${dndOn ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              {[
                { key: "priceAlerts", label: "Price Alerts", description: "Notify when your price alert targets are hit" },
                { key: "achievements", label: "Achievements", description: "Celebrate when you unlock new achievements" },
                { key: "friendRequests", label: "Friend Requests", description: "Alert when someone sends you a friend request" },
                { key: "lessonReminders", label: "Lesson Reminders", description: "Nudge to keep your lesson streak alive" },
                { key: "tradeConfirmations", label: "Trade Confirmations", description: "Confirm when your trades are executed" },
                { key: "marketEvents", label: "Market Events", description: "Announce booms, crashes, and news events" },
                { key: "weeklyDigest", label: "Weekly Digest", description: "Summary of your performance each week" },
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor={`notif-${key}`}>{label}</Label>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    id={`notif-${key}`}
                    checked={notifPrefs[key] ?? true}
                    onCheckedChange={(val) => handleNotifToggle(key, val)}
                    disabled={notifMutation.isPending || dndOn}
                    data-testid={`switch-notif-${key}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Simulator
            </CardTitle>
            <CardDescription>
              Choose which asset the simulator opens on by default
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="default-symbol">Default Symbol</Label>
                <p className="text-sm text-muted-foreground">
                  The simulator will load this asset on launch
                </p>
              </div>
              <Select value={defaultSymbol} onValueChange={handleDefaultSymbolChange}>
                <SelectTrigger className="w-[180px]" id="default-symbol" data-testid="select-default-symbol">
                  <SelectValue placeholder="Pick a symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Popular Stocks</SelectLabel>
                    <SelectItem value="AAPL">AAPL — Apple</SelectItem>
                    <SelectItem value="GOOGL">GOOGL — Google</SelectItem>
                    <SelectItem value="MSFT">MSFT — Microsoft</SelectItem>
                    <SelectItem value="AMZN">AMZN — Amazon</SelectItem>
                    <SelectItem value="TSLA">TSLA — Tesla</SelectItem>
                    <SelectItem value="META">META — Meta</SelectItem>
                    <SelectItem value="NVDA">NVDA — Nvidia</SelectItem>
                    <SelectItem value="NFLX">NFLX — Netflix</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Crypto</SelectLabel>
                    <SelectItem value="BTC/USD">BTC — Bitcoin</SelectItem>
                    <SelectItem value="ETH/USD">ETH — Ethereum</SelectItem>
                    <SelectItem value="SOL/USD">SOL — Solana</SelectItem>
                    <SelectItem value="DOGE/USD">DOGE — Dogecoin</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>ETFs & Indices</SelectLabel>
                    <SelectItem value="SPY">SPY — S&P 500</SelectItem>
                    <SelectItem value="QQQ">QQQ — Nasdaq 100</SelectItem>
                    <SelectItem value="DIA">DIA — Dow Jones</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>More Stocks</SelectLabel>
                    <SelectItem value="AMD">AMD</SelectItem>
                    <SelectItem value="DIS">DIS — Disney</SelectItem>
                    <SelectItem value="PYPL">PYPL — PayPal</SelectItem>
                    <SelectItem value="UBER">UBER — Uber</SelectItem>
                    <SelectItem value="COIN">COIN — Coinbase</SelectItem>
                    <SelectItem value="BA">BA — Boeing</SelectItem>
                    <SelectItem value="JPM">JPM — JPMorgan</SelectItem>
                    <SelectItem value="V">V — Visa</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-account">
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data including trades, progress, and achievements.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount} 
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-delete-account"
                  >
                    Yes, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
