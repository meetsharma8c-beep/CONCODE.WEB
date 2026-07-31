# main.tf - AWS EKS Cluster config
provider "aws" {
  region = "us-east-1"
}
module "eks_cluster" {
  source = "terraform-aws-modules/eks/aws"
  cluster_name = "concode-eks"
  cluster_version = "1.27"
}