// Product-spec section 18 fixture (docs/jd-diff-prd.md). Shared by the Vitest suite and the Playwright JD Diff spec.
// Fictional person; no real contact details.

export const FIXTURE_RESUME = `Jordan Rivera
Data Engineer | jordan.rivera@example.com

SUMMARY
Data engineer with 10+ years of SQL, PL/SQL and Oracle enterprise systems experience, now building Python automation and AWS data pipelines.

EXPERIENCE
Senior Data Engineer, Northwind Analytics | 2021 - Present
- Owned AWS Glue ETL pipelines in PySpark processing 100K+ records/day from S3.
- Built Python automation and AWS Lambda functions for REST integrations.
- Implemented retries, validation, reconciliation and monitoring for production pipelines.
- Led production support, incident management and root-cause analysis for pipeline failures.
- Built OpenSearch and Kibana dashboards for operational monitoring.

Oracle Developer, Contoso Financial | 2012 - 2021
- Developed SQL and PL/SQL for Oracle EBS integrations and enterprise data movement.
- Provided production support for Oracle enterprise systems.
- Maintained reconciliation and audit controls for finance data.

PROJECTS
- Built n8n workflow automation and AI agent prototypes.
- Experimented with RAG and LLM APIs for document question answering.

SKILLS
SQL, PL/SQL, Oracle, Python, AWS Glue, PySpark, S3, Lambda, OpenSearch, Kibana, REST, n8n
`

export const FIXTURE_JD = `Senior Data Engineer, AI Platform

About the role
We are building production data infrastructure for LLM-powered applications.

Responsibilities
- Build and operate production data infrastructure on AWS.
- Design Spark jobs and AWS Glue pipelines.
- Build automated remediation for data pipeline failures.
- Own data governance and data lineage for critical datasets.
- Build AI agents and LLM-powered applications.

Requirements
- Strong Python and SQL.
- Experience with LangChain or LangGraph.
- Terraform for infrastructure as code.
- Snowflake and dbt.
- Kafka streaming.

Benefits
- Remote-friendly, competitive salary.
`

/** Expected statuses asserted by AC4, keyed by normalized concept id. */
export const FIXTURE_EXPECTED: Record<string, readonly string[]> = {
  python: ['MATCH'],
  sql: ['MATCH'],
  'aws-glue': ['MATCH'],
  spark: ['MATCH'],
  'ai-agents': ['PARTIAL'],
  langgraph: ['GAP'],
  terraform: ['GAP'],
  snowflake: ['GAP'],
  dbt: ['GAP'],
  'automated-remediation': ['TRANSFERABLE', 'PARTIAL'],
  'data-governance': ['PARTIAL', 'HIDDEN_MATCH'],
}
