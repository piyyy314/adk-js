# Docker Desktop crash on WSL2: `ipc/wsl/distros/integrated` timeout

## Summary
If Docker Desktop crashes with logs showing:

- `recovering from engine crash`
- `service desktop proxies failed`
- `Get "http://ipc/wsl/distros/integrated": context deadline exceeded`

this usually indicates a **WSL2 subsystem freeze/deadlock**, not a normal Docker engine bug.

Docker Desktop depends on WSL IPC to enumerate integrated distros. When that endpoint hangs, Docker cannot recover and exits.

## Affected setup pattern
Docker Desktop configured with WSL integration for one or more distros (example):

```text
IntegratedWslDistros: [kali-linux AOSCOS]
```

## Root cause (practical)
- WSL subsystem (or LxssManager path) is unresponsive.
- Docker's WSL integration layer times out when querying integrated distros.
- Engine recovery fails, Docker Desktop closes.

## Recovery (hard reset)
Run these in **PowerShell as Administrator**.

### 1) Stop Docker processes
```powershell
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "dockerd" -Force -ErrorAction SilentlyContinue
```

### 2) Shutdown WSL
```powershell
wsl --shutdown
```

### 3) Recreate Docker WSL distros
> ⚠️ This resets Docker’s internal WSL distributions.

```powershell
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
```

### 4) Restart WSL service
```powershell
net stop LxssManager
net start LxssManager
```

### 5) Start Docker Desktop
```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### 6) Verify
Wait ~30 seconds, then run:

```powershell
docker info
```

## Optional: one-shot script
```powershell
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "dockerd" -Force -ErrorAction SilentlyContinue
wsl --shutdown
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
net stop LxssManager
net start LxssManager
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Write-Host "Recovery complete. Wait 30 seconds, then run: docker info"
```

## Post-fix checks
- `docker info` returns without timeout
- `wsl -l -v` lists expected user distros
- Docker Desktop opens and remains running
- Previously integrated distros can be re-enabled in Docker Desktop settings if needed

## Notes
- This failure pattern is most commonly tied to WSL responsiveness.
- It is usually **not** caused by Kubernetes toggles, CPU/RAM limits, proxies, or extensions.
- If the issue recurs frequently, update:
  - Windows + WSL kernel (`wsl --update`)
  - Docker Desktop
  - Any endpoint-security software that may hook WSL/Hyper-V networking
