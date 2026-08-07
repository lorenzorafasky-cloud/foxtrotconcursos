output "turnstile_site_key" {
  value       = cloudflare_turnstile_widget.auth.id
  description = "Site key do Turnstile para login/cadastro."
}

output "r2_bucket_name" {
  value = cloudflare_r2_bucket.assets.name
}
