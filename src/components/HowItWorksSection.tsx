import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Add your inventory",
    description: "Import your vehicles via spreadsheet or add them manually. Photos, specs, costs — everything in one place.",
  },
  {
    step: "02",
    title: "AI prices & posts for you",
    description: "Our engine analyzes the market, suggests optimal pricing, generates descriptions, and publishes to all channels.",
  },
  {
    step: "03",
    title: "Leads flow in automatically",
    description: "Every inquiry from every channel lands in your CRM. WhatsApp follow-ups fire automatically.",
  },
  {
    step: "04",
    title: "Close deals, track profit",
    description: "Sell the car, log the deal. See your true profit per vehicle, per salesperson, per month.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">How it works</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4">
            From lot to <span className="text-gradient-profit">profit</span> in 4 steps
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-6"
            >
              <div className="font-display text-6xl font-bold text-primary/10 mb-4">{s.step}</div>
              <h3 className="font-display text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-3 w-6 h-px bg-primary/20" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
