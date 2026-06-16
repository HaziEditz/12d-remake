import { useAuth } from "@/lib/auth-context";
import { canAccessPremiumFeatures, getSubscriptionStatus, isPremiumTier, canAccessPremiumContent, isTrialUser, getTrialDaysRemaining } from "@/lib/subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Clock, Check, Sparkles } from "lucide-react";
import { Link } from "wouter";

interface PaywallProps {
  children: React.ReactNode;
  featureName?: string;
}

export function Paywall({ children, featureName = "this feature" }: PaywallProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (canAccessPremiumFeatures(user)) {
    return <>{children}</>;
  }

  const status = getSubscriptionStatus(user);

  // If user is not logged in, show login prompt instead of trial ended
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In Required</CardTitle>
            <CardDescription className="text-base">
              Please log in or create an account to access {featureName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/login">
                <Button className="w-full" size="lg" data-testid="button-login">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full" size="lg" data-testid="button-register">
                  Create Account
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="w-full" data-testid="button-back-home">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Your Trial Has Ended</CardTitle>
          <CardDescription className="text-base">
            Your 14-day free trial has expired. Subscribe to continue using {featureName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-center">Choose Your Plan</h4>
            
            <div className="grid gap-3">
              <PricingOption
                name="School"
                price="$8.49"
                period="/student/month"
                description="For teachers and classrooms"
                features={["Manage up to 30 students", "Assignment creation", "Progress tracking"]}
              />
              <PricingOption
                name="Casual"
                price="$9.49"
                period="/month"
                description="For individual learners"
                features={["Full simulator access", "All lessons", "Leaderboard access"]}
                highlighted
              />
              <PricingOption
                name="12Digits+"
                price="$14.49"
                period="/month"
                description="Premium features"
                features={["Advanced analytics", "Strategy library", "Priority support"]}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button className="w-full" size="lg" data-testid="button-subscribe">
                <Crown className="w-4 h-4 mr-2" />
                Choose a Plan
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full" data-testid="button-back-home">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingOption({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlighted
          ? "border-primary bg-primary/5"
          : "border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold">{name}</span>
          {highlighted && (
            <Badge variant="secondary" className="ml-2">
              Popular
            </Badge>
          )}
        </div>
        <div className="text-right">
          <span className="font-bold text-lg">{price}</span>
          <span className="text-muted-foreground text-sm">{period}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <ul className="text-sm space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <Check className="w-3 h-3 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrialBanner() {
  const { user } = useAuth();
  const status = getSubscriptionStatus(user);

  if (status.status !== "trial") return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <span>
            <strong>{status.daysRemaining} days</strong> left in your free trial
          </span>
        </div>
        <Link href="/pricing">
          <Button size="sm" variant="default" data-testid="button-upgrade-trial">
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface PremiumPaywallProps {
  children: React.ReactNode;
  featureName?: string;
}

export function PremiumPaywall({ children, featureName = "this feature" }: PremiumPaywallProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (canAccessPremiumContent(user)) {
    if (isTrialUser(user)) {
      const daysRemaining = getTrialDaysRemaining(user);
      return (
        <>
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20 px-4 py-2">
            <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>
                  <strong>{daysRemaining} days</strong> left to try premium features
                </span>
              </div>
              <Link href="/pricing">
                <Button size="sm" variant="default" className="bg-gradient-to-r from-amber-500 to-amber-600" data-testid="button-upgrade-premium-trial">
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade to 12Digits+
                </Button>
              </Link>
            </div>
          </div>
          {children}
        </>
      );
    }
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">12Digits+ Premium Feature</CardTitle>
            <CardDescription className="text-base">
              Please log in to access {featureName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link href="/login">
                <Button className="w-full" size="lg" data-testid="button-login">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full" size="lg" data-testid="button-register">
                  Create Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <Badge className="mx-auto mb-2 bg-gradient-to-r from-amber-500 to-amber-600">
            <Sparkles className="w-3 h-3 mr-1" />
            Premium Feature
          </Badge>
          <CardTitle className="text-2xl">Upgrade to 12Digits+</CardTitle>
          <CardDescription className="text-base">
            {featureName} is an exclusive 12Digits+ Premium feature. Upgrade to unlock advanced tools and strategies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-center">12Digits+ Premium Includes:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                Everything in Casual plan
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                Strategy Library with proven trading strategies
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                Advanced Analytics dashboard
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                Priority customer support
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-500" />
                Early access to new features
              </li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold mb-1">$14.49<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            <p className="text-sm text-muted-foreground">Cancel anytime</p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/pricing">
              <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700" size="lg" data-testid="button-upgrade-premium">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to 12Digits+
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full" data-testid="button-back-dashboard">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
