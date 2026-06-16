import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSubscriptionStatus, canPurchasePlan } from "@/lib/subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Crown, GraduationCap, User, Sparkles, Tag, Loader2, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { School } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import SubscriptionPayPalButton from "@/components/SubscriptionPayPalButton";

const plans = [
  {
    id: "school",
    name: "School",
    price: 8.49,
    period: "/student/month",
    description: "Perfect for teachers and educational institutions",
    icon: GraduationCap,
    hasPromoCode: true,
    features: [
      "Manage up to 30 students",
      "Create custom assignments",
      "Track student progress",
      "Classroom leaderboards",
      "All lessons included",
      "Email support",
    ],
  },
  {
    id: "casual",
    name: "Casual",
    price: 9.49,
    period: "/month",
    description: "For individual learners ready to master trading",
    icon: User,
    popular: true,
    hasPromoCode: true,
    features: [
      "Full simulator access",
      "$10,000 virtual balance",
      "All lessons and tutorials",
      "Global leaderboard access",
      "Portfolio tracking",
      "Performance analytics",
    ],
  },
  {
    id: "premium",
    name: "12Digits+",
    price: 14.49,
    period: "/month",
    description: "Advanced features for serious traders",
    icon: Crown,
    hasPromoCode: true,
    features: [
      "Everything in Casual",
      "Advanced analytics dashboard",
      "Strategy library access",
      "Priority customer support",
      "Early access to new features",
      "Custom trading challenges",
    ],
  },
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const status = getSubscriptionStatus(user);
  const [promoCode, setPromoCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: schools = [], isLoading: isLoadingSchools } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Enter a code",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await apiRequest("POST", "/api/payments/redeem-promo", {
        promoCode: promoCode.trim(),
      });
      
      if (response.ok) {
        const data = await response.json();
        await refreshUser();
        // Invalidate all queries that depend on user subscription status
        queryClient.invalidateQueries({ queryKey: ["/api/trades/limits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Success!",
          description: data.message || "Promo code redeemed successfully!",
        });
        navigate("/dashboard");
      } else {
        const data = await response.json();
        toast({
          title: "Invalid Code",
          description: data.error || "This promo code is not valid",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const msg = error?.message || "";
      const extracted = msg.includes(":") ? msg.split(":").slice(1).join(":").trim().replace(/^[{"]|[}"]$/g, "").replace(/error[":\s]+/i, "") : "";
      toast({
        title: "Invalid Code",
        description: extracted || "This promo code is not valid or has expired.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the plan that's right for you. Cancel anytime.
          </p>
          {status.status === "trial" && (
            <Badge variant="secondary" className="mt-4">
              {status.daysRemaining} days left in your trial
            </Badge>
          )}

          <div className="flex items-center justify-center gap-3 mt-6" data-testid="billing-toggle">
            <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"}`}
              data-testid="button-billing-toggle"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <Badge className="ml-2 bg-green-500 text-white text-xs">Save 17%</Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = status.status === "active" && status.tier === plan.id;
            const canPurchase = canPurchasePlan(user, plan.id);
            const isDowngradeAttempt = user && !canPurchase && !isCurrentPlan;
            
            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? "border-primary" : ""}`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {isAnnual ? (
                      <>
                        <div>
                          <span className="text-4xl font-bold">${(plan.price * 10 / 12).toFixed(2)}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        <p className="text-sm text-green-600 font-medium mt-1">
                          Billed ${(plan.price * 10).toFixed(2)}/year
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-3">
                  {isCurrentPlan ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      disabled
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      Current Plan
                    </Button>
                  ) : !user ? (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      onClick={() => navigate("/register")}
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      Get Started
                    </Button>
                  ) : isDowngradeAttempt ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      disabled
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      You have a higher tier
                    </Button>
                  ) : plan.id === "school" ? (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      size="lg"
                      onClick={() => navigate("/school-plan")}
                      data-testid={`button-subscribe-${plan.id}`}
                    >
                      Enter School World →
                    </Button>
                  ) : (
                    <SubscriptionPayPalButton
                      planId={plan.id}
                      amount={isAnnual ? (plan.price * 10).toFixed(2) : plan.price.toString()}
                      planName={plan.name}
                    />
                  )}
                  
                  {plan.hasPromoCode && user && !isCurrentPlan && !isDowngradeAttempt && (
                    <>
                      {!showPromoInput ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-muted-foreground"
                          onClick={() => setShowPromoInput(true)}
                          data-testid="button-show-promo"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Have a promo code?
                        </Button>
                      ) : (
                        <div className="w-full space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter promo code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="flex-1"
                              data-testid="input-promo-code"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRedeemPromo();
                              }}
                            />
                            <Button
                              onClick={handleRedeemPromo}
                              disabled={isRedeeming}
                              data-testid="button-redeem-promo"
                            >
                              {isRedeeming ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-sm">
            Secure checkout. Cancel anytime.
          </p>
        </div>
      </div>

      <Dialog open={showSchoolModal} onOpenChange={setShowSchoolModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>School Subscription</DialogTitle>
            <DialogDescription>
              Is your school already registered? Search below, or continue to set up a new school account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-md border p-2">
              {isLoadingSchools ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSchools.length > 0 ? (
                filteredSchools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{school.name}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        // In a real app, this would link the teacher to the school
                        // For now we'll just proceed to checkout
                        setShowSchoolModal(false);
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No schools found matching your search.
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-xs text-muted-foreground text-center">
                Don't see your school? You can register it during checkout.
              </p>
              <SubscriptionPayPalButton
                planId="school"
                amount={isAnnual ? (8.49 * 10).toString() : "8.49"}
                planName="School Plan"
                onSuccess={() => setShowSchoolModal(false)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSchoolModal(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
