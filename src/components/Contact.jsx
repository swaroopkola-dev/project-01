import { useState } from "react";

export function Contact() {
  const [copied, setCopied] = useState(false);
  const email = "swaroopkola@example.com";

  const copyEmail = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = email;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="contact" className="contact section">
      <div className="contact__content">
        <div className="contact__topline">
          <p className="section-label">Contact</p>
          <span className="availability">
            <i aria-hidden="true" />
            Open to internships &amp; collaborations
          </span>
        </div>

        <h2>Have a project, an internship, or an interesting problem?</h2>

        <p className="contact__lead">
          I&apos;m open to internships, collaborations, hackathons, and thoughtful
          projects involving software or AI.
        </p>

        <div className="contact__actions">
          <div>
            <a className="contact-email" href={"mailto:" + email}>{email}</a>
            <span className="contact-placeholder">[PLACEHOLDER — replace with your real email before publishing]</span>
          </div>

          <button
            className={"button button--light" + (copied ? " is-copied" : "")}
            type="button"
            onClick={copyEmail}
          >
            {copied ? "Email copied" : "Copy email"}
          </button>
        </div>

        <div className="contact__links">
          <a href="https://github.com/swaroopkola77-create" className="gesture-external-link">GitHub ↗</a>
          <a href="https://www.linkedin.com/" className="gesture-external-link">LinkedIn ↗</a>
          <a href="#work">Selected work ↓</a>
        </div>
      </div>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Swaroop Kola</span>
        <span>CSE AI/ML · Hyderabad</span>
        <span>Built while learning.</span>
      </footer>
    </section>
  );
}
