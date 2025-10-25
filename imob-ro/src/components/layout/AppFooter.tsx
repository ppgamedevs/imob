export default function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-[1200px] px-3 py-10 text-sm text-[color:var(--color-text)]/70 flex flex-wrap gap-6">
        <div className="mr-auto">© {new Date().getFullYear()} iR</div>
        <a href="/termeni" className="hover:opacity-100 transition-opacity">
          Termeni
        </a>
        <a href="/confidentialitate" className="hover:opacity-100 transition-opacity">
          Confidențialitate
        </a>
        <a href="/cum-estimam" className="hover:opacity-100 transition-opacity">
          Cum estimăm
        </a>
      </div>
    </footer>
  );
}
