import assert from "node:assert/strict";
import test from "node:test";

import { extractRequirements } from "../services/extraction/jd-extractor.service.js";

test("extracts role title from an explicit job title", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Responsibilities:
- Build backend services.

Requirements:
- Strong Python experience.
- Experience with SQL.
`);

  assert.equal(result.title, "Software Engineer");
});

test("extracts seniority from the job description", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

We are looking for an entry-level engineer or recent graduate.

Requirements:
- Python
- SQL
`);

  assert.equal(result.seniority, "entry-level");
});

test("extracts technical requirements separately from a technology list", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Experience with Python, SQL, Docker, and AWS.
- Strong knowledge of data structures and algorithms.
`);

  const texts = result.requirements.map((requirement) =>
    requirement.text.toLowerCase()
  );

  assert.ok(texts.some((text) => text.includes("python")));
  assert.ok(texts.some((text) => text.includes("sql")));
  assert.ok(texts.some((text) => text.includes("docker")));
  assert.ok(texts.some((text) => text.includes("aws")));
  assert.ok(
    texts.some((text) => text.includes("data structures"))
  );

  assert.ok(
    result.requirements.filter(
      (requirement) => requirement.kind === "technical"
    ).length >= 4
  );
});

test("classifies behavioural requirements correctly", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Strong Python experience.
- Excellent communication and teamwork skills.
- Ability to collaborate with cross-functional teams.
`);

  const behavioural = result.requirements.filter(
    (requirement) => requirement.kind === "behavioural"
  );

  assert.ok(behavioural.length >= 2);
});

test("classifies domain requirements correctly", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Experience working in fintech applications.
- Knowledge of payment systems.
`);

  const domain = result.requirements.filter(
    (requirement) => requirement.kind === "domain"
  );

  assert.ok(domain.length >= 1);
});

test("classifies explicit nice-to-have requirements as nice", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Strong Python experience.
- Experience with Docker.
- Experience with Kubernetes. Nice to have.
- AWS experience is preferred.
`);

  const kubernetes = result.requirements.find((requirement) =>
    requirement.text.toLowerCase().includes("kubernetes")
  );

  const aws = result.requirements.find((requirement) =>
    requirement.text.toLowerCase().includes("aws")
  );

  assert.ok(kubernetes);
  assert.equal(kubernetes.priority, "nice");

  assert.ok(aws);
  assert.equal(aws.priority, "nice");
});

test("keeps explicit must-have requirements as must", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Strong Python experience.
- Proficiency in SQL.
- Docker experience is required.
`);

  for (const requirement of result.requirements) {
    assert.equal(requirement.priority, "must");
  }
});

test("extracts responsibilities separately", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Responsibilities:
- Design and build scalable backend services.
- Collaborate with frontend engineers.
- Maintain automated testing and deployment pipelines.

Requirements:
- Python
- SQL
`);

  assert.ok(result.responsibilities.length >= 2);

  assert.ok(
    result.responsibilities.some((item) =>
      item.toLowerCase().includes("build")
    )
  );
});

test("removes duplicate requirements", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Strong Python experience.
- Strong Python experience.
- Experience with SQL.
- Experience with SQL.
`);

  const normalized = result.requirements.map((requirement) =>
    requirement.text.toLowerCase().trim()
  );

  assert.equal(
    new Set(normalized).size,
    normalized.length
  );
});

test("generates stable sequential requirement IDs", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

Requirements:
- Python
- SQL
- Docker
`);

  result.requirements.forEach((requirement, index) => {
    assert.equal(requirement.id, `req-${index + 1}`);
  });
});

test("handles a thin job description without fabricating technologies", () => {
  const result = extractRequirements(
    "Software Engineer role requiring strong engineering ability."
  );

  assert.ok(result.requirements.length >= 1);

  const allText = result.requirements
    .map((requirement) => requirement.text.toLowerCase())
    .join(" ");

  assert.equal(allText.includes("python"), false);
  assert.equal(allText.includes("kubernetes"), false);
  assert.equal(allText.includes("mongodb"), false);
});

test("rejects an empty job description", () => {
  assert.throws(
    () => extractRequirements(""),
    /Job description must contain at least 20 characters/
  );
});

test("does not treat company/about text as a requirement section", () => {
  const result = extractRequirements(`
Job Title: Software Engineer

About the Company:
We build products for customers around the world.

Responsibilities:
- Build reliable services.

Requirements:
- Python
- SQL
`);

  const requirementTexts = result.requirements.map((requirement) =>
    requirement.text.toLowerCase()
  );

  assert.ok(requirementTexts.includes("python"));
  assert.ok(requirementTexts.includes("sql"));

  assert.equal(
    requirementTexts.some((text) =>
      text.includes("products for customers")
    ),
    false
  );
});
test("parses inline job title, requirements, responsibilities, and nice-to-have markers", () => {
  const result = extractRequirements(
    "Software Engineer. Requirements: Python, SQL, Docker, AWS experience is preferred. Responsibilities: Build reliable backend services and collaborate with engineering teams."
  );

  assert.equal(result.title, "Software Engineer");

  const python = result.requirements.find((r) =>
    r.text.toLowerCase().includes("python")
  );

  const sql = result.requirements.find((r) =>
    r.text.toLowerCase().includes("sql")
  );

  const docker = result.requirements.find((r) =>
    r.text.toLowerCase().includes("docker")
  );

  const aws = result.requirements.find((r) =>
    r.text.toLowerCase().includes("aws")
  );

  assert.ok(python);
  assert.ok(sql);
  assert.ok(docker);
  assert.ok(aws);

  assert.equal(python?.priority, "must");
  assert.equal(sql?.priority, "must");
  assert.equal(docker?.priority, "must");
  assert.equal(aws?.priority, "nice");

  assert.ok(
    result.responsibilities.some((text) =>
      text.toLowerCase().includes("build reliable backend services")
    )
  );

  assert.ok(
    result.responsibilities.some((text) =>
      text.toLowerCase().includes("collaborate with engineering teams")
    )
  );
});
test("separates inline technical requirements from a nice-to-have clause", () => {
  const result = extractRequirements(
    "Data Engineer. Requirements: Python, SQL, ETL, data pipelines. Nice to have: cloud platforms. Responsibilities: Build reliable data ingestion and transformation pipelines."
  );

  const python = result.requirements.find((r) =>
    r.text.toLowerCase().includes("python")
  );

  const sql = result.requirements.find((r) =>
    r.text.toLowerCase().includes("sql")
  );

  const etl = result.requirements.find((r) =>
    r.text.toLowerCase() === "etl"
  );

  const pipelines = result.requirements.find((r) =>
    r.text.toLowerCase().includes("data pipelines")
  );

  const cloud = result.requirements.find((r) =>
    r.text.toLowerCase().includes("cloud platforms")
  );

  assert.ok(python);
  assert.ok(sql);
  assert.ok(etl);
  assert.ok(pipelines);
  assert.ok(cloud);

  assert.equal(etl?.kind, "technical");
  assert.equal(etl?.priority, "must");

  assert.equal(pipelines?.kind, "technical");
  assert.equal(pipelines?.priority, "must");

  assert.equal(cloud?.priority, "nice");

  assert.equal(
    pipelines?.text.toLowerCase().includes("cloud platforms"),
    false
  );
});