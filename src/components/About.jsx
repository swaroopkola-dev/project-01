export function About() {
  return (
    <section id="about" className="about section">
      <div className="section__intro">
        <div>
          <p className="section-label">About me</p>
          <h2>Curious by default. Practical by choice.</h2>
        </div>

        <p className="section__intro-copy">
          I&apos;m a CSE AI/ML student in Hyderabad. I&apos;m still learning,
          and I&apos;m trying to keep the work honest while I do it.
        </p>
      </div>

      <div className="about__grid">
        <div className="about__manifesto">
          <div className="manifesto-card">
            <span>01</span>
            <strong>Learn deeply</strong>
            <p>Understand the fundamentals behind the tools, not only the syntax around them.</p>
          </div>

          <div className="manifesto-card">
            <span>02</span>
            <strong>Build often</strong>
            <p>Turn concepts into working interfaces, applications, and experiments quickly.</p>
          </div>

          <div className="manifesto-card">
            <span>03</span>
            <strong>Make it useful</strong>
            <p>Prefer projects that help someone over demos that only look impressive.</p>
          </div>
        </div>

        <div className="about__story">
          <p className="about__story-lead">
            I like the full loop: understand the problem, build the thing,
            debug the weird parts, and make it easier to use.
          </p>

          <div className="about__story-columns">
            <p>
              I&apos;m building a strong foundation across software engineering
              and AI while learning how technical decisions change the product.
            </p>
            <p>
              Right now I&apos;m sharpening DSA in C++, strengthening React and
              backend fundamentals, and exploring computer vision, GenAI, and
              useful agritech ideas.
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div><strong>05</strong><span>featured builds</span></div>
        <div><strong>03</strong><span>core languages in the current stack</span></div>
        <div><strong>12+</strong><span>skills in active rotation</span></div>
        <div><strong>01</strong><span>long-term direction: agritech</span></div>
      </div>
    </section>
  );
}
