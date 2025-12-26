# Kubernetes Deployment Guide with Datadog APM

This guide walks you through deploying the Property Search application to Kubernetes with full Datadog observability (traces + logs + metrics).

## Prerequisites

- Docker installed
- kubectl installed
- Helm 3 installed ✅ (you have this)
- Local Kubernetes cluster (we'll set this up)
- Datadog account with API key

## Step 1: Set Up Local Kubernetes Cluster

Choose one of these options:

### Option A: Using minikube (Recommended for Mac)

```bash
# Install minikube
brew install minikube

# Start minikube with sufficient resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable metrics-server for HPA (optional)
minikube addons enable metrics-server

# Verify cluster is running
kubectl cluster-info
```

### Option B: Using kind (Kubernetes in Docker)

```bash
# Install kind
brew install kind

# Create cluster
kind create cluster --name property-search

# Verify
kubectl cluster-info
```

## Step 2: Build Docker Image

```bash
# Navigate to project root
cd /path/to/property-search

# Build the Docker image
docker build -t property-search:latest .

# For minikube: Load image into minikube
minikube image load property-search:latest

# For kind: Load image into kind
kind load docker-image property-search:latest --name property-search

# Verify image is available
docker images | grep property-search
```

## Step 3: Install Datadog Agent via Helm

```bash
# Add Datadog Helm repository
helm repo add datadog https://helm.datadoghq.com
helm repo update

# Create namespace for Datadog
kubectl create namespace datadog

# Install Datadog Agent with your configuration
# IMPORTANT: Replace YOUR_DATADOG_API_KEY_HERE with your actual key
helm install datadog datadog/datadog \
  --namespace datadog \
  --values helm/datadog-values.yaml \
  --set datadog.apiKey=YOUR_DATADOG_API_KEY_HERE

# Wait for Datadog pods to be ready
kubectl get pods -n datadog --watch

# You should see pods like:
# - datadog-agent-xxxxx (DaemonSet - one per node)
# - datadog-cluster-agent-xxxxx

# Verify Datadog is running
kubectl logs -n datadog -l app=datadog-agent -c agent --tail=50
```

## Step 4: Deploy Property Search Application

```bash
# Create namespace for the app (optional)
kubectl create namespace property-search

# Install the application using Helm
# Replace the secrets with your actual values
helm install property-search ./helm/property-search \
  --namespace property-search \
  --set secrets.datadogApiKey=YOUR_DATADOG_API_KEY \
  --set secrets.rentcastApiKey=YOUR_RENTCAST_API_KEY \
  --set secrets.postgresUrl=YOUR_POSTGRES_CONNECTION_STRING

# Or use a separate values file with secrets (recommended)
# Create helm/secrets.yaml with:
#   secrets:
#     datadogApiKey: "your_key"
#     rentcastApiKey: "your_key"
#     postgresUrl: "your_postgres_url"

helm install property-search ./helm/property-search \
  --namespace property-search \
  --values helm/secrets.yaml

# Watch pods start up
kubectl get pods -n property-search --watch

# Check pod logs
kubectl logs -n property-search -l app.kubernetes.io/name=property-search --tail=100
```

## Step 5: Verify Datadog Integration

### Check Instrumentation Logs

```bash
# Look for Datadog initialization message
kubectl logs -n property-search -l app.kubernetes.io/name=property-search | grep "Datadog APM initialized"

# Should see:
# Datadog APM initialized: { service: 'property-search', env: 'production' }
```

### Check Health Endpoint

```bash
# Port-forward to access the app
kubectl port-forward -n property-search svc/property-search 8080:80

# In another terminal, check health endpoint
curl http://localhost:8080/api/health

# Should return JSON with Datadog configuration
```

### Generate Test Traffic

```bash
# Make some test requests
curl "http://localhost:8080/api/property?address=123%20Main%20St"
curl "http://localhost:8080/api/property?address=456%20Oak%20Ave"
```

### View Traces in Datadog

1. Go to: https://us5.datadoghq.com/apm/traces
2. Filter by: `env:production service:property-search`
3. You should see traces appear within 1-2 minutes

### View Logs in Datadog

1. Go to: https://us5.datadoghq.com/logs
2. Filter by: `service:property-search`
3. Click on a log entry
4. You should see a "View Trace" button (log-trace correlation!)

## Step 6: Access the Application

### Using Port Forwarding (Development)

```bash
kubectl port-forward -n property-search svc/property-search 3000:80

# Access at: http://localhost:3000
```

### Using LoadBalancer (Cloud Clusters)

```bash
# Update service type to LoadBalancer
helm upgrade property-search ./helm/property-search \
  --namespace property-search \
  --reuse-values \
  --set service.type=LoadBalancer

# Get external IP
kubectl get svc -n property-search
```

### Using Ingress (Recommended for Production)

Create an Ingress resource (you'll need an Ingress controller installed).

## Troubleshooting

### Datadog Agent Not Running

```bash
# Check agent status
kubectl get pods -n datadog

# Check logs
kubectl logs -n datadog -l app=datadog-agent -c agent

# Common issues:
# - Invalid API key: Check datadog-values.yaml
# - Resource limits: Increase memory/cpu
```

### No Traces in Datadog

```bash
# 1. Check app logs for Datadog initialization
kubectl logs -n property-search -l app.kubernetes.io/name=property-search | grep Datadog

# 2. Check DD_AGENT_HOST is set correctly
kubectl get pod -n property-search <pod-name> -o yaml | grep DD_AGENT_HOST

# 3. Verify Datadog Agent is accessible
kubectl exec -n property-search <pod-name> -- nslookup datadog-agent.datadog.svc.cluster.local

# 4. Check Datadog Agent APM port is open
kubectl exec -n property-search <pod-name> -- nc -zv datadog-agent.datadog.svc.cluster.local 8126
```

### Logs Not Appearing in Datadog

```bash
# 1. Verify log collection is enabled in Datadog
kubectl get configmap -n datadog datadog -o yaml | grep logs_enabled

# 2. Check pod annotations
kubectl get pod -n property-search <pod-name> -o yaml | grep annotations -A 5

# Should see:
#   ad.datadoghq.com/property-search.logs: '[{"source":"nodejs","service":"property-search"}]'
```

## Scaling the Application

```bash
# Manual scaling
kubectl scale deployment -n property-search property-search --replicas=5

# Enable autoscaling via Helm
helm upgrade property-search ./helm/property-search \
  --namespace property-search \
  --reuse-values \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10
```

## Updating the Application

```bash
# 1. Build new image
docker build -t property-search:v2.0.0 .

# 2. Load into cluster
minikube image load property-search:v2.0.0
# or for kind:
kind load docker-image property-search:v2.0.0 --name property-search

# 3. Upgrade Helm release
helm upgrade property-search ./helm/property-search \
  --namespace property-search \
  --reuse-values \
  --set image.tag=v2.0.0

# 4. Watch rollout
kubectl rollout status deployment/property-search -n property-search
```

## Cleanup

```bash
# Uninstall application
helm uninstall property-search --namespace property-search

# Uninstall Datadog
helm uninstall datadog --namespace datadog

# Delete namespaces
kubectl delete namespace property-search
kubectl delete namespace datadog

# Stop/delete cluster
minikube stop
minikube delete

# Or for kind:
kind delete cluster --name property-search
```

## Log-Trace Correlation

The application is configured for automatic log-trace correlation:

1. **Already enabled** via `logInjection: true` in `instrumentation.ts`
2. All console.log statements automatically include trace IDs
3. In Datadog Logs, click any log to see the "View Trace" button
4. Click to jump directly to the associated trace!

Example:
```javascript
// Your code:
console.log('Property data received:', property);

// Datadog automatically adds:
// dd.trace_id=1234567890
// dd.span_id=9876543210
// dd.service=property-search
// dd.env=production
```

## Production Considerations

1. **Image Registry**: Push images to Docker Hub, GCR, ECR, or ACR
2. **Secrets Management**: Use Kubernetes Secrets or external secret managers (Vault, AWS Secrets Manager)
3. **Database**: Use managed Postgres (RDS, Cloud SQL, etc.)
4. **Ingress**: Set up Ingress controller (nginx, traefik) with TLS
5. **Monitoring**: Set up Datadog monitors and alerts
6. **Backup**: Configure database backups
7. **CI/CD**: Automate builds and deployments

## Useful Commands

```bash
# View all resources in namespace
kubectl get all -n property-search

# Get pod logs with timestamps
kubectl logs -n property-search <pod-name> --timestamps

# Execute command in pod
kubectl exec -it -n property-search <pod-name> -- sh

# View Helm release
helm list -n property-search

# View Helm values
helm get values property-search -n property-search

# View events
kubectl get events -n property-search --sort-by='.lastTimestamp'
```

## Next Steps

1. Set up monitoring dashboards in Datadog
2. Create alerts for errors and performance issues
3. Set up CI/CD pipeline
4. Configure production database
5. Set up SSL/TLS certificates
6. Implement backup strategy

Happy deploying! 🚀
