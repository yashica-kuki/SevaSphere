
import { Heart, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../ui/Buttons";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Causes", href: "/causes" },
    { label: "NGOs", href: "/ngos" },
    { label: "Impact", href: "/impact" },
    { label: "Stories", href: "/stories" },
    { label: "Contact", href: "/contact" },
  ];

  const linkClass = (href) =>
    `text-sm font-medium transition ${
      location.pathname === href
        ? "text-forest font-bold"
        : "text-charcoal hover:text-forest"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="page-container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="rounded-xl bg-forest p-2 text-white">
            <Heart size={21} />
          </div>

          <span className="text-xl font-extrabold tracking-tight text-forest">
            SevaSphere
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={linkClass(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login">
            <Button variant="ghost">Log in</Button>
          </Link>

          <Link to="/signup">
            <Button>Get started</Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          className="rounded-lg p-2 text-forest lg:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {menuOpen && (
        <nav className="max-h-[80vh] space-y-4 overflow-y-auto border-t border-border bg-white p-5 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block ${linkClass(link.href)}`}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>

            <Link to="/signup" onClick={() => setMenuOpen(false)}>
              <Button block>Get started</Button>
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
