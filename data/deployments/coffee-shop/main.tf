# main.tf - Auto-provisioned for project coffee-shop
module "dynamic_site_hosting" {
  source     = "github.com/concode-agency/terraform-aws-static-hosting"
  project_id = "coffee-shop"
  domain     = "coffee-shop.concode.io"
  index_path = "./index.html"
}