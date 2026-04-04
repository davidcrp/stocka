import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "R$297",
    period: "/mês",
    description: "For small lots with up to 30 vehicles",
    features: [
      "Up to 30 vehicles",
      "Basic CRM & lead tracking",
      "Marketplace auto-posting (2 channels)",
      "Profit tracking per vehicle",
      "WhatsApp templates",
      "Email support",
    ],
    highlight: false,
  },
  {
    name: "Growth",
    price: "R$597",
    period: "/mês",
    description: "For dealerships scaling fast",
    features: [
      "Up to 100 vehicles",
      "Full CRM with sales performance",
      "All marketplace channels",
      "AI pricing suggestions",
      "WhatsApp automation sequences",
      "Trade-in valuation tool",
      "Revenue dashboard",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "R$997",
    period: "/mês",
    description: "For large operations & multi-lot groups",
    features: [
      "Unlimited vehicles",
      "Multi-location support",
      "Advanced AI & competitor scraping",
      "Custom integrations",
      "Dedicated account manager",
      "API access",
      "White-label option",
      "SLA guarantee",
    ],
    highlight: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Pricing</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4">
            Pays for itself in <span className="text-gradient-profit">one extra sale</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-xl border ${
                plan.highlight
                  ? "border-primary/40 shadow-glow bg-card"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-profit text-xs font-bold text-primary-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Most Popular
                </div>
              )}
              <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              <Button
                className={`w-full mb-8 ${
                  plan.highlight
                    ? "bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Start free trial
              </Button>
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
