import logoLight from "@/assets/logo-light.png";

const FooterSection = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <img src={logoLight} alt="CarROI" className="h-7" />
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
