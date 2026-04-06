import icon from "@/assets/icon.png";

const FooterSection = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={icon} alt="CarROI" className="h-6 w-6" />
            <span className="font-display text-lg font-bold">CarROI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada carro. Cada real. Cada negócio. — © {new Date().getFullYear()} CarROI
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
