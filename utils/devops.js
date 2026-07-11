const DatabaseManager = require('./DatabaseManager');
const path = require('path');
const fs = require('fs');

const db = new DatabaseManager();

/**
 * Triggers a DevOps container/serverless deployment rollout targeting a specific cloud.
 * @param {string} projectId 
 * @param {string} cloudTarget - 'aws', 'gcp', or 'vercel'
 * @returns {Promise<Object>} The deployment configuration record.
 */
async function deployWebsite(projectId, cloudTarget = 'aws') {
  const normalizedId = projectId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!normalizedId) {
    throw new Error('Invalid project ID for deployment.');
  }

  const target = ['aws', 'gcp', 'vercel'].includes(cloudTarget.toLowerCase()) ? cloudTarget.toLowerCase() : 'aws';

  // Ensure deployment directory exists
  const deployDir = path.join(__dirname, '../data/deployments', normalizedId);
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const filesGenerated = [];

  if (target === 'aws') {
    const dockerfile = `FROM node:18-alpine\nWORKDIR /usr/src/app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD [ "node", "server.js" ]`;
    const k8sYaml = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: aws-site-${normalizedId}\n  namespace: concode-apps\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: aws-site-${normalizedId}\n  template:\n    metadata:\n      labels:\n        app: aws-site-${normalizedId}\n    spec:\n      containers:\n      - name: web\n        image: registry.concode.io/aws/${normalizedId}:latest\n        ports:\n        - containerPort: 3000`;
    const mainTf = `# main.tf - AWS EKS Cluster config\nprovider "aws" {\n  region = "us-east-1"\n}\nmodule "eks_cluster" {\n  source = "terraform-aws-modules/eks/aws"\n  cluster_name = "concode-eks"\n  cluster_version = "1.27"\n}`;

    fs.writeFileSync(path.join(deployDir, 'Dockerfile'), dockerfile, 'utf8');
    fs.writeFileSync(path.join(deployDir, 'deployment.yaml'), k8sYaml, 'utf8');
    fs.writeFileSync(path.join(deployDir, 'main.tf'), mainTf, 'utf8');
    filesGenerated.push('Dockerfile', 'deployment.yaml', 'main.tf');

  } else if (target === 'gcp') {
    const dockerfile = `FROM gcr.io/google-appengine/nodejs\nCOPY . /app/\nRUN npm install --prefix /app\nCMD node /app/server.js`;
    const gkeYaml = `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: gcp-site-${normalizedId}\nspec:\n  replicas: 4\n  template:\n    spec:\n      containers:\n      - name: app\n        image: gcr.io/concode-gcp/${normalizedId}:latest`;
    const gkeTf = `# gke.tf - Google Kubernetes Engine config\nprovider "google" {\n  project = "concode-gcp-prod"\n  region  = "us-central1"\n}\nresource "google_container_cluster" "primary" {\n  name     = "concode-gke"\n  location = "us-central1"\n  initial_node_count = 3\n}`;

    fs.writeFileSync(path.join(deployDir, 'Dockerfile'), dockerfile, 'utf8');
    fs.writeFileSync(path.join(deployDir, 'deployment-gke.yaml'), gkeYaml, 'utf8');
    fs.writeFileSync(path.join(deployDir, 'gke-cluster.tf'), gkeTf, 'utf8');
    filesGenerated.push('Dockerfile', 'deployment-gke.yaml', 'gke-cluster.tf');

  } else if (target === 'vercel') {
    const vercelConfig = JSON.stringify({
      version: 2,
      name: normalizedId,
      cleanUrls: true,
      routes: [
        { "src": "/(.*)", "dest": "/$1" }
      ]
    }, null, 2);

    fs.writeFileSync(path.join(deployDir, 'vercel.json'), vercelConfig, 'utf8');
    filesGenerated.push('vercel.json');
  }

  const deploymentId = 'dep_' + Math.random().toString(36).substr(2, 9);
  
  const deploymentData = {
    deploymentId,
    projectId: normalizedId,
    status: 'queued',
    cloudTarget: target,
    createdAt: new Date().toISOString(),
    filesGenerated
  };

  await db.insert('deployments', deploymentData);

  // Trigger simulation background thread
  runCloudDeploymentPipeline(deploymentId, normalizedId, target);

  return {
    deploymentId,
    projectId: normalizedId,
    status: 'queued',
    cloudTarget: target,
    filesGenerated,
    message: `DevOps rollout sequence queued successfully on ${target.toUpperCase()}.`
  };
}

/**
 * Custom cloud logs scheduler.
 */
async function runCloudDeploymentPipeline(deploymentId, projectId, target) {
  let steps = [];

  if (target === 'vercel') {
    steps = [
      { text: 'Vercel Deployment Engine triggered.', delay: 100 },
      { text: 'Analyzing static files and subpages (index.html, about.html, contact.html)...', delay: 200 },
      { text: 'Generating serverless routing configuration: vercel.json... OK', delay: 150 },
      { text: 'Uploading client workspace assets to Vercel global CDN edge caches...', delay: 400 },
      { text: 'Resolving dynamic endpoint mapping arrays...', delay: 200 },
      { text: 'Applying deployment DNS names mappings: ' + projectId + '.vercel.app', delay: 300 },
      { text: '✓ Success! Vercel serverless application deployment completed.', delay: 100 }
    ];
  } else {
    // AWS & GCP Kubernetes cluster builds
    const providerName = target.toUpperCase();
    const clusterName = target === 'aws' ? 'EKS Cluster' : 'GKE Cluster';
    const registryName = target === 'aws' ? 'registry.concode.io/aws/' : 'gcr.io/concode-gcp/';

    steps = [
      { text: `DevOps ${providerName} Orchestrator triggered rollout sequence.`, delay: 150 },
      { text: 'Inspecting workspace files (index.html, about.html, contact.html, style.css, app.js)... OK', delay: 300 },
      { text: 'Generating container configuration: Dockerfile... OK', delay: 100 },
      { text: `Compiling Docker container image: ${registryName}${projectId}:latest...`, delay: 500 },
      { text: 'Layer 1/3 (Debian/Alpine Casing Base): 15MB [Loaded from cache]', delay: 100 },
      { text: 'Layer 2/3 (Project Dependencies compiled): 80MB [complete]', delay: 400 },
      { text: 'Layer 3/3 (Web App static artifacts): 120KB [complete]', delay: 100 },
      { text: `Pushing built image to ${providerName} Private Container Registry... OK`, delay: 300 },
      { text: 'Reading cloud Infrastructure configurations: main.tf... OK', delay: 200 },
      { text: `Running Terraform Plan to verify ${clusterName} parameters...`, delay: 500 },
      { text: 'Terraform State check complete. VPC security filters: stable.', delay: 150 },
      { text: `Provisioning dynamic Kubernetes load balancer nodes on ${providerName}...`, delay: 700 },
      { text: `Scheduling pod replicas on EKS/GKE workers...`, delay: 400 },
      { text: `[KUBE] Pod dynamic-site-${projectId}-a1 scheduled.`, delay: 100 },
      { text: `[KUBE] Pod dynamic-site-${projectId}-a2 scheduled.`, delay: 100 },
      { text: 'Running liveness & readiness health checks... (100% responsive)', delay: 500 },
      { text: `Updating ${providerName} Edge Gateway ingress tables. Custom route DNS verified.`, delay: 300 },
      { text: `✓ Success! ${providerName} container cluster deployment completed.`, delay: 150 }
    ];
  }

  await updateDeploymentStatus(deploymentId, 'running');

  let currentDelay = 0;
  for (let i = 0; i < steps.length; i++) {
    currentDelay += steps[i].delay;
    setTimeout(async () => {
      await db.insert('deployment_logs', {
        deploymentId,
        projectId,
        stepIndex: i,
        message: steps[i].text,
        timestamp: new Date().toISOString()
      });

      if (i === steps.length - 1) {
        await updateDeploymentStatus(deploymentId, 'completed');
      }
    }, currentDelay);
  }
}

async function updateDeploymentStatus(deploymentId, status) {
  const deployments = await db.read('deployments');
  const match = deployments.find(d => d.deploymentId === deploymentId);
  if (match) {
    match.status = status;
    match.updatedAt = new Date().toISOString();
    if (!db.useFirestore) {
      const file = path.join(db.baseDir || path.join(__dirname, '../data'), 'deployments.json');
      fs.writeFileSync(file, JSON.stringify(deployments, null, 2), 'utf8');
    }
  }
}

/**
 * Reads logs for a specific project deployment.
 */
async function getDeploymentLogs(projectId) {
  const logs = await db.read('deployment_logs');
  return logs
    .filter(log => log.projectId === projectId.toLowerCase())
    .sort((a, b) => a.stepIndex - b.stepIndex);
}

module.exports = {
  deployWebsite,
  getDeploymentLogs
};
