import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Work } from "./components/Work";
import { About } from "./components/About";
import { Skills } from "./components/Skills";
import { Contact } from "./components/Contact";
import { HandControl } from "./features/hand-control/HandControl";
import "./App.css";

function App() {
  const [active, setActive] = useState("");
  const [handStatus, setHandStatus] = useState("OFF");
  const handCursorRef = useRef(null);
  const quickNavRef = useRef(null);
  const [quickNav, setQuickNav] = useState(false);

  useEffect(() => {
    document.title = "Swaroop Kola — AI/ML Developer Portfolio";

    const ids = ["work", "about", "skills", "contact"];
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-32% 0px -58% 0px", threshold: [0.05, 0.25, 0.5, 0.75] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickNav((value) => !value);
      }

      if (event.key === "Escape") setQuickNav(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!quickNav) return undefined;

    const dialog = quickNavRef.current;
    if (!dialog) return undefined;

    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getFocusable = () => [...dialog.querySelectorAll(focusableSelector)];

    requestAnimationFrame(() => getFocusable()[0]?.focus());

    const onDialogKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const items = getFocusable();
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    dialog.addEventListener("keydown", onDialogKeyDown);

    return () => {
      document.body.style.overflow = "";
      dialog.removeEventListener("keydown", onDialogKeyDown);
    };
  }, [quickNav]);

  const jump = (id) => {
    setQuickNav(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header active={active} onQuickNav={() => setQuickNav(true)} />

      <main id="main">
        <div id="top"><Hero /></div>
        <Work />
        <About />
        <Skills />
        <HandControl cursorRef={handCursorRef} onStatusChange={setHandStatus} />
        <Contact />
      </main>

      {createPortal(
        <div
          ref={handCursorRef}
          className="hand-cursor"
          aria-hidden="true"
          data-visible="false"
        >
          <span className="hand-cursor__dot" />
          <span className="hand-cursor__ring" />
          <span className="hand-cursor__label">{handStatus}</span>
        </div>,
        document.body
      )}

      {quickNav && (
        <div
          className="quick-nav-backdrop"
          role="presentation"
          onClick={() => setQuickNav(false)}
        >
          <div
            ref={quickNavRef}
            className="quick-nav"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-nav-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quick-nav__header">
              <div>
                <p className="section-label">Quick navigation</p>
                <h3 id="quick-nav-title">Where should we go?</h3>
              </div>

              <button
                className="quick-nav__close"
                type="button"
                onClick={() => setQuickNav(false)}
                aria-label="Close quick navigation"
              >
                ×
              </button>
            </div>

            <div className="quick-nav__items">
              {[
                ["work", "Selected work", "01"],
                ["about", "About me", "02"],
                ["skills", "Skills", "03"],
                ["contact", "Contact", "04"],
              ].map(([id, label, number]) => (
                <button key={id} type="button" onClick={() => jump(id)}>
                  <span>{number}</span>
                  <strong>{label}</strong>
                  <b aria-hidden="true">↗</b>
                </button>
              ))}
            </div>

            <div className="quick-nav__hint">
              Close with Escape · desktop shortcut: Cmd/Ctrl + K
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
