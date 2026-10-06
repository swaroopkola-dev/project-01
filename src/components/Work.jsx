import { useState } from "react";
import { PROJECTS } from "../data/portfolio";
import { ProjectCard } from "./ProjectCard";

export function Work() {
  const [open, setOpen] = useState("ai-cell-scanner");
  const [filter, setFilter] = useState("All");
  const filters = ["All", "AI / ML", "Frontend", "Product"];

  const filteredProjects = PROJECTS.filter((project) => (
    filter === "All" ? true : project.track === filter
  ));

  return (
    <section id="work" className="work section">
      <div className="section__intro">
        <div>
          <p className="section-label">Selected work</p>
          <h2>Things I built while figuring out what I like.</h2>
        </div>

        <div className="section__intro-side">
          <p className="section__intro-copy">
            A mix of learning projects, product experiments, and future-facing
            ideas. Some are exploratory. That is part of being a student.
          </p>

          <div className="work-filter" role="group" aria-label="Filter projects">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                className={"filter-chip" + (filter === item ? " is-active" : "")}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="project-list">
        {filteredProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isOpen={open === project.id}
            onToggle={() => setOpen(open === project.id ? null : project.id)}
          />
        ))}
      </div>

      <div className="work-footer">
        <span>{filteredProjects.length} projects in view</span>
        <span>Tap or click a project to open its notes</span>
      </div>
    </section>
  );
}
