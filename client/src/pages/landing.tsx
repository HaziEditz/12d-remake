import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  BookOpen, 
  LineChart, 
  Trophy, 
  Users, 
  Shield,
  Check,
  GraduationCap,
  Zap,
  Crown
} from "lucide-react";
import heroImage from "@assets/generated_images/professional_trading_desk_hero_image.png";

const features = [
  {
    icon: LineChart,
    title: "Real-Time Simulator",
    description: "Practice trading with $5,000 virtual balance using live market data and professional candlestick charts"
  },
  {
    icon: BookOpen,
    title: "Comprehensive Lessons",
    description: "Learn from structured curriculum covering everything from basics to advanced trading strategies"
  },
  {
    icon: Trophy,
    title: "Global Leaderboard",
    description: "Compete with traders worldwide and track your progress on the performance rankings"
  },
  {
    icon: Users,
    title: "Community Learning",
    description: "Connect with fellow traders, share strategies, and learn from each other's experiences"
  },
  {
    icon: Shield,
    title: "Risk-Free Practice",
    description: "Make mistakes and learn from them without risking real money in a safe environment"
  },
  {
    icon: GraduationCap,
    title: "Teacher Tools",
    description: "Educators get powerful tools to manage classes, create assignments, and track student progress"
  }
];

const plans = [
  {
    name: "School",
    icon: GraduationCap,
    monthlyPrice: "8.49",
    yearlyPrice: "98.59",
    description: "Perfect for educators and students",
    features: [
      "Teacher admin dashboard",
      "Assignments & challenges",
      "All lessons & tutorials",
      "Real-time simulator",
      "Trading strategies",
      "Replay function",
      "Classmate connections",
      "Progress tracking"
    ],
    badge: "For Schools",
    popular: false
  },
  {
    name: "Casual",
    icon: Zap,
    monthlyPrice: "9.49",
    yearlyPrice: "107.99",
    description: "For individual learners",
    features: [
      "All lessons & tutorials",
      "Real-time simulator",
      "Trading strategies",
      "Personal dashboard",
      "Friends list",
      "Investment tracking",
      "Performance analytics"
    ],
    badge: "Most Popular",
    popular: true
  },
  {
    name: "12Digits+",
    icon: Crown,
    monthlyPrice: "14.49",
    yearlyPrice: "169.49",
    description: "Unlock everything",
    features: [
      "Everything in Casual",
      "Global leaderboard access",
      "Advanced analytics",
      "Exclusive strategies",
      "Priority support",
      "Early feature access",
      "Premium community"
    ],
    badge: "Premium",
    popular: false
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-white/10 backdrop-blur-sm border-white/20 text-white">
            Trading Education Platform
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            Master Trading with
            <span className="block text-primary mt-2">Real-Time Simulation</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Learn professional trading strategies, practice with live market data, and build confidence before investing real money.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6" data-testid="button-hero-get-started">
                <TrendingUp className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
            </Link>
            <a href="#pricing">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
                data-testid="button-hero-view-plans"
              >
                View Plans
              </Button>
            </a>
          </div>

        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Learn Trading
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From beginner tutorials to advanced strategies, we provide all the tools for your trading education journey.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start your trading education today with a plan that fits your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <Card 
                  key={index} 
                  className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.badge && (
                    <Badge 
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                      variant={plan.popular ? "default" : "secondary"}
                    >
                      {plan.badge}
                    </Badge>
                  )}
                  <CardHeader className="text-center pt-8">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">${plan.monthlyPrice}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        or ${plan.yearlyPrice}/year
                      </p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/register">
                      <Button 
                        className="w-full" 
                        variant={plan.popular ? "default" : "outline"}
                        data-testid={`button-select-${plan.name.toLowerCase()}`}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Start Your Trading Journey?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join thousands of students mastering the markets with 12Digits.
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8"
              data-testid="button-cta-get-started"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">12Digits</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 12Digits. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
