import { SKILLS } from "../data/portfolio";

export function Skills() {
  const groups = [...new Set(SKILLS.map((skill) => skill.group))];

  return (
    <section id="skills" className="skills section">
      <div className="section__intro">
        <div>
          <p className="section-label">Skills</p>
          <h2>Tools I reach for. Fundamentals I keep working on.</h2>
        </div>

        <p className="section__intro-copy">
          The stack will change. The useful parts are learning how systems fit
          together, solving problems clearly, and getting better at the basics.
        </p>
      </div>

      <div className="skills-board">
        {groups.map((group) => (
          <section key={group} className="skill-group" aria-labelledby={"skill-" + group}>
            <h3 id={"skill-" + group} className="skill-group__title">{group}</h3>
            <div className="skill-group__list">
              {SKILLS.filter((skill) => skill.group === group).map((skill) => (
                <span key={skill.label} className="skill-tag">
                  {skill.label} <em>· {skill.level}</em>
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
