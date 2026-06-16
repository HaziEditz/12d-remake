import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface SubscriptionPayPalButtonProps {
  planId: string;
  amount: string;
  planName: string;
  onSuccess?: () => void;
}

export default function SubscriptionPayPalButton({
  planId,
  amount,
  planName,
  onSuccess,
}: SubscriptionPayPalButtonProps) {
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const createOrder = useCallback(async () => {
    const orderPayload = {
      amount: amount,
      currency: "USD",
      intent: "CAPTURE",
    };
    const response = await fetch("/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(orderPayload),
    });
    const output = await response.json();
    return { orderId: output.id };
  }, [amount]);

  const captureOrder = useCallback(async (orderId: string) => {
    const response = await fetch(`/order/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await response.json();
    return data;
  }, []);

  const activateSubscription = useCallback(async (orderId: string) => {
    const response = await fetch("/api/payments/activate-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tier: planId, orderId }),
    });
    return response.ok;
  }, [planId]);

  const onApprove = useCallback(async (data: any) => {
    try {
      const orderData = await captureOrder(data.orderId);
      if (orderData.status === "COMPLETED") {
        await activateSubscription(data.orderId);
        await refreshUser();
        // Invalidate all queries that depend on user subscription status
        queryClient.invalidateQueries({ queryKey: ["/api/trades/limits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        toast({
          title: "Subscription Activated!",
          description: `Welcome to ${planName}! Your subscription is now active.`,
        });
        if (onSuccess) {
          onSuccess();
        }
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  }, [captureOrder, activateSubscription, refreshUser, toast, navigate, planName]);

  const onCancel = useCallback(async () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment. Feel free to try again when ready.",
    });
  }, [toast]);

  const onError = useCallback(async (error: any) => {
    console.error("PayPal error:", error);
    toast({
      title: "Payment Error",
      description: "There was an error with PayPal. Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  useEffect(() => {
    if (initializedRef.current) return;
    
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          // Always use live PayPal since we have live credentials
          script.src = "https://www.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    const initPayPal = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      
      try {
        const clientToken: string = await fetch("/setup", { credentials: "include" })
          .then((res) => res.json())
          .then((data) => data.clientToken);

        const sdkInstance = await (window as any).paypal.createInstance({
          clientToken,
          components: ["paypal-payments"],
        });

        const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
          onApprove,
          onCancel,
          onError,
        });

        const onClick = async () => {
          try {
            const checkoutOptionsPromise = createOrder();
            await paypalCheckout.start(
              { paymentFlow: "auto" },
              checkoutOptionsPromise,
            );
          } catch (e) {
            console.error(e);
          }
        };

        const button = buttonRef.current;
        if (button) {
          button.addEventListener("click", onClick);
          return () => {
            button.removeEventListener("click", onClick);
          };
        }
      } catch (e) {
        console.error("PayPal init error:", e);
        initializedRef.current = false;
      }
    };

    loadPayPalSDK();
  }, [createOrder, onApprove, onCancel, onError]);

  return (
    <div
      ref={buttonRef}
      className="w-full h-10 bg-[#0070ba] hover:bg-[#003087] text-white rounded-md flex items-center justify-center cursor-pointer font-medium transition-colors"
      data-testid={`paypal-button-${planId}`}
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.629h7.19c2.385 0 4.07.579 5.006 1.72.9 1.097 1.138 2.636.71 4.58-.026.116-.056.236-.09.357-.393 1.647-1.12 2.912-2.184 3.791-1.085.9-2.467 1.356-4.112 1.356H9.42a.77.77 0 0 0-.757.63l-.893 5.083a.642.642 0 0 1-.633.729h-.061z"/>
      </svg>
      Subscribe Now
    </div>
  );
}
