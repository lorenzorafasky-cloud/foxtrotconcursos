variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Token com permissoes de Zone DNS, Zone WAF, Account R2, Account Turnstile e Stream."
}

variable "account_id" {
  type        = string
  description = "Cloudflare Account ID."
}

variable "zone_id" {
  type        = string
  description = "Zone ID do dominio foxtrotconcursos.com.br."
}

variable "root_domain" {
  type        = string
  default     = "foxtrotconcursos.com.br"
  description = "Dominio raiz da plataforma."
}

variable "api_origin" {
  type        = string
  description = "Hostname do container/API de origem."
}

variable "student_origin" {
  type        = string
  description = "Hostname do app aluno."
}

variable "admin_origin" {
  type        = string
  description = "Hostname do app admin."
}

variable "professor_origin" {
  type        = string
  description = "Hostname do app professor."
}

variable "access_allowed_emails" {
  type        = list(string)
  default     = []
  description = "E-mails autorizados no Cloudflare Access do painel admin (Zero Trust). Vazio desativa o Access."
}
