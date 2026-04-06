import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 relative">
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-12 rounded-2xl border border-primary/20 bg-gradient-card shadow-glow"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Seus concorrentes já estão usando IA para vender mais rápido
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Cada dia sem o CarROI é dinheiro ficando na mesa. Comece seu teste gratuito e veja a diferença na primeira semana.
          </p>
          <Button size="lg" className="bg-gradient-profit text-primary-foreground font-semibold px-10 py-6 text-base shadow-glow hover:opacity-90">
            Começar teste grátis de 14 dias
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">No credit card required • Setup in 5 minutes</p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
