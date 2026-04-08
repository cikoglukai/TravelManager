# Deployment Runbook - TravelManager on Azure VM

## 1. Project Overview

This runbook documents the deployment of the **TravelManager** university project on a single **Microsoft Azure IaaS virtual machine**. The deployment target is an **Ubuntu 24.04 LTS x64** VM.

The application is deployed as a containerized stack with **Docker Compose**. The stack contains:

- a **Nuxt 3 application container**
- a **PostgreSQL 16 container** running on the same VM
- an **Nginx container** used as the public HTTP entry point

The database and the application run on the same Azure VM, as required by the project specification. External HTTP access is handled by Nginx, which forwards requests to the application container.

## 2. Target Architecture

The deployed architecture consists of one Azure virtual machine hosting all required components.

- **1 Azure VM** running Ubuntu 24.04 LTS
- **1 application container** built from the repository `Dockerfile`
- **1 PostgreSQL container** for persistent relational data storage
- **1 Nginx container** acting as reverse proxy on port `80`
- **1 Public IP** for browser access and SSH administration
- **1 Network Security Group (NSG)** controlling inbound traffic
- **1 Managed Image** created after successful setup and verification

Traffic flow:

1. A browser accesses the Azure VM through its public IP.
2. Nginx receives the HTTP request on port `80`.
3. Nginx forwards the request internally to the application container on port `3000`.
4. The application connects to PostgreSQL over the internal Docker network.

After setup and testing, the VM is stopped to reduce Azure compute costs.

## 3. Azure Resources

The following Azure resources are required for this deployment:

- **Resource Group** for logical grouping of all project resources
- **Virtual Machine** for running the complete container stack
- **Public IP Address** for SSH and browser access
- **Virtual Network (VNet)** and **Subnet** for network placement
- **Network Security Group (NSG)** for inbound rule control
- **OS Disk** attached to the VM
- **Managed Image** created from the configured VM

Example resource inventory:

- Resource Group: `<resource-group-name>`
- Virtual Machine: `<vm-name>`
- Public IP: `<public-ip-name>`
- VNet/Subnet: `<vnet-name>` / `<subnet-name>`
- NSG: `<nsg-name>`
- Managed Image: `<image-name>`

## 4. VM Configuration

The deployment target VM uses the following configuration:

- Operating system: **Ubuntu 24.04 LTS**
- Architecture: **x64**
- VM size: **Standard D2s v3**
- Access method: **SSH with key-based authentication**

Example SSH access:

```bash
ssh -i ~/.ssh/<private-key> azureuser@<public-ip>
```

## 5. Network Configuration

Only the required inbound ports should be opened in the Azure NSG.

- `22/tcp` for SSH administration
- `80/tcp` for HTTP access through Nginx

Current repository state:

- **HTTPS (`443/tcp`) is not configured in the repository**
- `nginx/default.conf` defines an **HTTP-only** server block

If HTTPS is added later, port `443/tcp` must be opened explicitly and certificates must be configured in Nginx. For the current project setup, only the minimum required ports should remain open.

## 6. Software Installation

The VM is prepared as a container-based deployment host. The following software is required:

- Docker Engine
- Docker Compose plugin
- Git

Example preparation commands on Ubuntu 24.04 LTS:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
docker --version
docker compose version
git --version
```

The application is deployed entirely through containers. No separate host-level application runtime is required beyond Docker and Git.

## 7. Application Deployment

### 7.1 Clone the Repository

```bash
git clone https://github.com/cikoglukai/TravelManager.git
cd TravelManager
```

### 7.2 Create the Environment File

The repository contains `.env.example`. Copy it to `.env` before deployment:

```bash
cp .env.example .env
```

Current repository note:

- `.env.example` contains the `DATABASE_URL` used for local-style configuration
- the current `docker-compose.yml` also defines the container-internal `DATABASE_URL` for the `app` service

### 7.3 Start the Stack

Build and start all containers:

```bash
docker compose up -d --build
```

This starts:

- `nginx`
- `app`
- `postgres`

### 7.4 Verify the Deployment

Check whether all services are running:

```bash
docker compose ps
```

Inspect logs if necessary:

```bash
docker compose logs
docker compose logs app
docker compose logs postgres
docker compose logs nginx
```

The current repository exposes the application publicly through Nginx on port `80`. The application container itself is only exposed internally on port `3000`.

## 8. Database Setup

PostgreSQL is deployed as part of the same Docker Compose stack on the same Azure VM.

Implementation details from the current repository:

- PostgreSQL image: `postgres:16-alpine`
- Database name: `travelmanager`
- Database user: `postgres`
- Persistent Docker volume: `postgres_data`

The volume ensures that database data persists across container restarts:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```

The application connects to PostgreSQL through the internal Docker network using the service name `postgres`.

Current connection string used by the application container:

```text
postgresql://postgres:postgres@postgres:5432/travelmanager
```

During startup, the application automatically initializes the required tables if they do not already exist.

## 9. Automatic Startup After Reboot

Automatic startup is achieved in two layers:

1. **Docker service startup via systemd**
2. **Container restart policies in Docker Compose**

Docker should be enabled on the VM:

```bash
sudo systemctl enable docker
sudo systemctl status docker
```

The current `docker-compose.yml` uses the restart policy:

```yaml
restart: unless-stopped
```

This means:

- Docker starts automatically after a VM reboot
- the containers start again automatically unless they were stopped manually

As a result, the TravelManager application becomes available again after the VM is restarted.

## 10. Testing and Verification

After deployment, the following checks should be performed.

### 10.1 Verify VM Reachability

```bash
ssh -i ~/.ssh/<private-key> azureuser@<public-ip>
```

### 10.2 Verify Running Containers

```bash
cd TravelManager
docker compose ps
```

Expected result:

- `nginx` is running
- `app` is running
- `postgres` is running and healthy

### 10.3 Verify Browser Access

Open the application in a browser:

```text
http://<public-ip>
```

Because the current Nginx configuration is HTTP-only, no HTTPS URL is used in this repository state.

### 10.4 Verify Database-Backed Functionality

Perform a simple functional test in the application:

1. Open the application in the browser.
2. Register or log in with an email address.
3. Create a trip entry.
4. Reload the page and verify that the trip is still present.
5. Open, edit, and delete a trip to confirm database write access.

This verifies that:

- the application is reachable through Nginx
- the backend API is working
- PostgreSQL is connected correctly
- persistent storage is functioning

## 11. Creating the Virtual Machine Image

After successful deployment and verification, an Azure VM image is created from the prepared machine.

Image characteristics:

- image type: **Managed Image**
- image state: **Specialized**

This preserves the configured VM state, including:

- installed Docker software
- cloned repository
- prepared deployment host configuration
- existing container configuration on the VM

The image can later be used to create another VM with the same prepared state.

## 12. Cost Saving

After setup, testing, and image creation, the VM should be stopped to avoid unnecessary compute charges.

Important Azure note:

- the VM must be in state **Stopped (deallocated)** to avoid compute costs

Stopping the VM only inside the guest OS is not sufficient if Azure still shows it as allocated. The VM should therefore be stopped from Azure in a way that results in the state `Stopped (deallocated)`.

## 13. Demo Procedure

For the project demonstration, the following short workflow can be used:

1. Start the Azure VM.
2. Wait until the VM state changes to `Running`.
3. Connect by SSH and verify Docker is active if needed.
4. Confirm that the containers start automatically.
5. Open `http://<public-ip>` in a browser.
6. Demonstrate application functionality with database-backed trip data.
7. Show the Azure resource group and VM in the Azure portal.
8. Show that the managed image exists.
9. Stop the VM again after the demo so that Azure shows `Stopped (deallocated)`.

Useful verification commands during the demo:

```bash
ssh -i ~/.ssh/<private-key> azureuser@<public-ip>
cd TravelManager
docker compose ps
docker compose logs --tail=50
```

## 14. Repository Contents

The following repository files are directly relevant for deployment:

- `docker-compose.yml`  
  Defines the three-service stack: `nginx`, `app`, and `postgres`, including restart policies and the persistent PostgreSQL volume.

- `Dockerfile`  
  Defines the application container image based on `node:22-alpine` and starts the application with `npm run dev`.

- `.env.example`  
  Provides the example `DATABASE_URL` used for local configuration and documentation of the expected environment variable format.

- `nginx/default.conf`  
  Defines the Nginx reverse proxy that listens on port `80` and forwards requests to `app:3000`.

- `server/utils/db.js`  
  Defines the PostgreSQL connection handling and the fallback/default connection string logic.

- `server/plugins/db.js`  
  Initializes the database schema automatically when the server starts.

- `DEPLOYMENT_RUNBOOK.md`  
  Documents the complete Azure VM deployment procedure for submission.

## 15. Notes / Assumptions

- Exact secrets are **not committed** to the repository.
- Private SSH keys are **not stored** in the repository.
- The runbook documents the deployment and operation process.
- The Azure **Managed Image** stores the prepared VM state after setup.
- The current repository state uses **HTTP via Nginx** and does not yet include TLS certificate handling.
- The current deployment follows the repository as-is, including the application container startup defined in `Dockerfile`.
