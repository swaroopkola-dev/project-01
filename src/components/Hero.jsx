export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="eyebrow__pulse" aria-hidden="true" />
            CSE AI/ML student · Hyderabad
          </p>

          <h1 id="hero-title">
            I&apos;m learning to build things that <span className="hero__accent">work.</span>
          </h1>

          <p className="hero__lead">
            I&apos;m Swaroop Kola, a student developer exploring software engineering,
            AI/ML, and product design by turning ideas into working projects.
          </p>

          <div className="hero__actions">
            <a className="button button--primary" href="#work">See my work ↘</a>
            <a className="button button--ghost" href="#contact">Talk to me ↗</a>
          </div>
        </div>

        <aside className="hero__note" aria-label="Current learning note">
          <p className="section-label">A note from my desk</p>
          <h2>Still learning. Still building.</h2>
          <p>
            Right now I&apos;m sharpening the fundamentals and trying to make
            fewer things that only look impressive.
          </p>

          <ul className="hero__note-list">
            <li>Python, C++ and JavaScript</li>
            <li>React and backend fundamentals</li>
            <li>Computer vision and GenAI</li>
            <li>Long-term: useful agritech systems</li>
          </ul>

          <svg className="hero__doodle" viewBox="0 0 520 90" aria-hidden="true">
            <path d="M14 57c76 18 138-17 211 5 77 22 137-14 276 2" />
            <path d="M460 44c17 1 28 7 40 19-15 1-28 8-39 21" />
            <circle cx="465" cy="19" r="8" />
          </svg>
        </aside>
      </div>

      <div className="hero__ticker" aria-hidden="true">
        <span>software</span>
        <span>·</span>
        <span>AI / ML</span>
        <span>·</span>
        <span>product thinking</span>
        <span>·</span>
        <span>build · learn · ship</span>
      </div>
    </section>
  );
}
