"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Scale,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useKioskSocket } from "@/app/hooks/useKioskSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default function DropoffPage({ params }: PageProps) {
  const { sessionId } = use(params);
  const { isPaired, weightData, error, sendHeartbeat, submitParcel } =
    useKioskSocket(sessionId);

  const [formData, setFormData] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);

  // Dynamic weight stability tracker
  const [isWeightChanging, setIsWeightChanging] = useState(false);
  const prevWeightRef = useRef(weightData.weight);
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If weight value fluctuates, immediately switch back to Measuring state
    if (Math.abs(weightData.weight - prevWeightRef.current) >= 0.01) {
      setIsWeightChanging(true);
      prevWeightRef.current = weightData.weight;

      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }

      // 800ms of stable reading before showing Stabilized
      settleTimerRef.current = setTimeout(() => {
        setIsWeightChanging(false);
      }, 800);
    } else if (!weightData.isStable) {
      setIsWeightChanging(true);
    } else {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      setIsWeightChanging(false);
    }

    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
    };
  }, [weightData.weight, weightData.isStable]);

  const isStabilized = weightData.isStable && !isWeightChanging;

  // Handle typing and trigger sliding TTL heartbeat
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    sendHeartbeat(); // Reset 3-min TTL on interaction
  };

  const handleCopySession = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSession(true);
      setTimeout(() => setCopiedSession(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPaired || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await submitParcel(formData);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Failed to submit parcel:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      receiverName: "",
      receiverPhone: "",
      receiverAddress: "",
    });
    setIsSubmitted(false);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30 bg-card shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              Session Error
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Unable to connect to the kiosk session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 text-center">
            <div className="rounded-lg bg-palette-tint/60 border border-palette-secondary/40 p-3 text-sm text-palette-dark">
              {error}
            </div>
            <p className="text-xs text-muted-foreground">
              Please check that the kiosk screen is still active or scan the QR
              code again to start a new session.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full border-palette-secondary hover:bg-palette-tint/50 text-palette-dark"
            >
              <RotateCcw className="mr-2 size-4" />
              Try Reconnecting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-6 px-4 sm:px-6">
      <main className="w-full max-w-md mx-auto space-y-4">
        <header className="rounded-2xl bg-card border border-border/80 shadow-xs p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-palette-tint border border-palette-secondary/60 text-palette-dark shadow-xs">
                <Package className="size-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">
                  Smart Drop-off
                </h1>
                <p className="text-xs text-muted-foreground">
                  Parcel Terminal Companion
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                isPaired
                  ? "bg-palette-secondary/30 text-palette-dark border-palette-primary/50 font-medium px-2.5 py-1 text-xs transition-colors"
                  : "bg-palette-accent/15 text-palette-dark border-palette-accent/40 font-medium px-2.5 py-1 text-xs transition-colors"
              }
            >
              <span
                className={`size-2 rounded-full mr-1.5 inline-block ${
                  isPaired
                    ? "bg-palette-primary animate-pulse"
                    : "bg-palette-accent animate-ping"
                }`}
              />
              {isPaired ? "Connected" : "Pairing..."}
            </Badge>
          </div>

          <Separator className="my-3 bg-border/60" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono text-[11px] tracking-wide">
              SESSION:{" "}
              <span className="font-semibold text-foreground">{sessionId}</span>
            </span>
            <button
              type="button"
              onClick={handleCopySession}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-palette-dark hover:text-palette-accent transition-colors cursor-pointer"
            >
              {copiedSession ? (
                <>
                  <Check className="size-3 text-palette-primary" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </header>

        <section aria-label="Live Scale Mirror">
          <Card className="border border-palette-secondary/80 bg-linear-to-br from-card via-card to-palette-tint/25 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-palette-tint/70 text-palette-dark border border-palette-secondary/40">
                    <Scale className="size-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Scale Mirror
                  </span>
                </div>

                {isStabilized ? (
                  <Badge
                    variant="outline"
                    className="bg-palette-primary/20 text-palette-dark border-palette-primary/60 font-semibold text-xs px-2.5 py-0.5"
                  >
                    <CheckCircle2 className="size-3.5 text-palette-primary mr-1 inline-block" />
                    Stabilized
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-palette-accent/15 text-palette-dark border-palette-accent/50 font-medium text-xs px-2.5 py-0.5"
                  >
                    <Loader2 className="size-3.5 text-palette-accent animate-spin mr-1 inline-block" />
                    Measuring...
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline justify-center gap-2 my-2 py-2">
                <span className="text-5xl sm:text-6xl font-black tracking-tight text-foreground font-mono">
                  {weightData.weight.toFixed(2)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-palette-dark/70 uppercase">
                  {weightData.unit}
                </span>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {isStabilized
                    ? "Weight confirmed. Ready for parcel transmission."
                    : "Measuring scale weight... Please keep parcel steady."}
                </p>
              </div>
            </div>
          </Card>
        </section>

        {isSubmitted ? (
          <Card className="border border-palette-primary/60 bg-card shadow-sm p-6 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-palette-secondary/40 text-palette-dark border border-palette-primary/50 shadow-xs">
              <Sparkles className="size-7 text-palette-primary" />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-foreground">
                Information Sent!
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Your parcel details have been transmitted directly to the kiosk
                screen.
              </CardDescription>
            </div>

            <div className="rounded-xl bg-palette-tint/50 border border-palette-secondary/50 p-4 text-left space-y-2.5 text-xs text-palette-dark">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-palette-primary" />
                Next Steps at the Kiosk:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li>
                  Review the receiver details displayed on the kiosk screen.
                </li>
                <li>
                  Tap{" "}
                  <strong className="text-foreground">
                    Print Shipping Label
                  </strong>{" "}
                  on the terminal.
                </li>
                <li>Affix the barcode label firmly to your parcel.</li>
              </ol>
            </div>

            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              className="w-full border-palette-secondary hover:bg-palette-tint/40 text-palette-dark font-medium"
            >
              <RotateCcw className="mr-2 size-4" />
              Submit Another Package
            </Button>
          </Card>
        ) : (
          <Card className="border border-border/90 bg-card shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Recipient Details
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter delivery information to print the label on the terminal.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="receiverName"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <User className="size-3.5 text-palette-dark/70" />
                    Receiver Name
                  </Label>
                  <Input
                    required
                    id="receiverName"
                    name="receiverName"
                    placeholder="e.g. Alex Henderson"
                    value={formData.receiverName}
                    onChange={handleChange}
                    className="border-input focus-visible:ring-palette-primary bg-background/50 h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="receiverPhone"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Phone className="size-3.5 text-palette-dark/70" />
                    Receiver Phone
                  </Label>
                  <Input
                    required
                    type="tel"
                    id="receiverPhone"
                    name="receiverPhone"
                    placeholder="e.g. +1 (555) 019-2834"
                    value={formData.receiverPhone}
                    onChange={handleChange}
                    className="border-input focus-visible:ring-palette-primary bg-background/50 h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="receiverAddress"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <MapPin className="size-3.5 text-palette-dark/70" />
                    Delivery Address
                  </Label>
                  <Textarea
                    required
                    id="receiverAddress"
                    name="receiverAddress"
                    rows={3}
                    placeholder="Street address, apartment, city, postal code"
                    value={formData.receiverAddress}
                    onChange={handleChange}
                    className="border-input focus-visible:ring-palette-primary bg-background/50 text-sm resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={!isPaired || isSubmitting}
                    className="w-full h-11 bg-palette-primary hover:bg-palette-primary/85 text-palette-dark font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Transmitting to Kiosk...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 size-4" />
                        Send to Kiosk Screen
                        <ArrowRight className="ml-1.5 size-4" />
                      </>
                    )}
                  </Button>

                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {!isPaired ? (
                      <span className="text-palette-accent font-medium">
                        Waiting for kiosk connection before submitting...
                      </span>
                    ) : (
                      "Your information will immediately appear on the kiosk terminal."
                    )}
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="w-full max-w-md mx-auto text-center pt-4 text-[11px] text-muted-foreground">
        <span>
          Smart Parcel Kiosk Network &bull; Session auto-refreshes on activity
        </span>
      </footer>
    </div>
  );
}
