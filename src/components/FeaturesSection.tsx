import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  DollarSign,
  MessageSquare,
  Package,
  Share2,
  TrendingDown,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Smart Inventory Aging",
    description: "Every car gets a countdown. After 30, 60, 90 days — automatic price drop suggestions and alerts so nothing rots on the lot.",
    profit: "Reduces stale inventory losses by 40%",
  },
  {
    icon: DollarSign,
    title: "Profit Per Vehicle",
    description: "Track purchase price, reconditioning, advertising cost, and final sale price. See TRUE margin on every single deal.",
    profit: "Know your real profit — not guesswork",
  },
  {
    icon: Users,
    title: "Sales CRM & Lead Tracking",
    description: "Every lead, every touchpoint, every follow-up. See which salespeople close and which ones lose money.",
    profit: "Increases close rate by 18%",
  },
  {
    icon: Share2,
    title: "Auto-Post to Marketplaces",
    description: "One click publishes to OLX, Facebook Marketplace, Instagram, and your website. AI writes the descriptions.",
    profit: "Saves 3 hours/day on manual listings",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Automation",
    description: "Auto follow-up sequences for every lead. Price drop notifications. Payment reminders. All on WhatsApp.",
    profit: "Recovers 25% of lost leads",
  },
  {
    icon: Bot,
    title: "AI Pricing Engine",
    description: "Scrapes competitor prices, analyzes market trends, and suggests optimal pricing for every vehicle in stock.",
    profit: "Adds R$2-5k margin per car",
  },
  {
    icon: TrendingDown,
    title: "Trade-In Valuation",
    description: "Instant FIPE + market-adjusted valuations. Never overpay on a trade-in again.",
    profit: "Prevents overpaying by R$3k average",
  },
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    description: "Real-time P&L, cash flow, and forecasting. Know exactly where your dealership stands at any moment.",
    profit: "CEO-level visibility in seconds",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4">
            Every feature <span className="text-gradient-profit">makes you money</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            No bloat. No vanity metrics. Every tool in DealPulse exists because it directly impacts your bottom line.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-glow transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <TrendingDown className="w-3 h-3" />
                {feature.profit}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
