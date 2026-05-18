# archive/

Historical infrastructure superseded by Phase 7 cutover.

- `terraform-cloudrun/` — original Cloud Run + Cloud SQL Terraform that ran the monolith.
  Replaced by `/terraform/modules/` + `/terraform/envs/{staging,prod}/` (GKE Autopilot + Pub/Sub + Cloud Scheduler + Memorystore + Artifact Registry + per-service Cloud SQL).

- `terraform_iaas/` — Compute Engine VM + docker-compose deployment fallback.
  Same replacement path. Kept for reference if a pure-IaaS revival is ever needed.

Nothing here is wired into the current build/deploy pipeline. Do not `terraform apply` from these directories.
