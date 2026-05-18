output "job_ids" {
  description = "Map of job name -> Cloud Scheduler job id."
  value = {
    for k, v in google_cloud_scheduler_job.tick : k => v.id
  }
}
