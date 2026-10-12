param(
  [string]$BackupRoot = (Join-Path $PSScriptRoot 'backups')
)

$ErrorActionPreference = 'Stop'

$configPath = Join-Path $PSScriptRoot 'supabase\config.toml'
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Supabase config not found: $configPath"
}

$configText = Get-Content -LiteralPath $configPath -Raw
$projectMatch = [regex]::Match($configText, '(?m)^project_id\s*=\s*"([^"]+)"')
if (-not $projectMatch.Success) {
  throw "Could not read project_id from $configPath"
}
$projectRef = $projectMatch.Groups[1].Value

$linkedProjectPath = Join-Path $PSScriptRoot 'supabase\.temp\linked-project.json'
if (Test-Path -LiteralPath $linkedProjectPath) {
  $linkedProject = Get-Content -LiteralPath $linkedProjectPath -Raw | ConvertFrom-Json
  if ($linkedProject.ref -and $linkedProject.ref -ne $projectRef) {
    throw "The linked Supabase project ($($linkedProject.ref)) does not match config.toml ($projectRef)."
  }
}

$dockerCommand = Get-Command docker.exe -ErrorAction SilentlyContinue
if (-not $dockerCommand) {
  $dockerCandidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'),
    (Join-Path $env:ProgramData 'DockerDesktop\version-bin\docker.exe')
  )
  $dockerPath = $dockerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($dockerPath) {
    $dockerCommandPath = $dockerPath
    $dockerDirectory = Split-Path -Parent $dockerPath
    if (($env:PATH -split ';') -notcontains $dockerDirectory) {
      $env:PATH = "$dockerDirectory;$env:PATH"
    }
  } else {
    throw 'Docker CLI was not found on PATH or in the standard Docker Desktop install locations. Start a PowerShell window that can run docker.exe, then retry.'
  }
} else {
  $dockerCommandPath = $dockerCommand.Source
}

$dockerStatus = & $dockerCommandPath info --format '{{.ServerVersion}}' 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Docker CLI was found at '$dockerCommandPath', but Docker Engine did not respond. Start Docker Desktop and retry. $dockerStatus"
}

$supabaseCommand = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCommand) {
  $cliExecutable = $supabaseCommand.Source
  $cliPrefix = @()
} else {
  $npxCommand = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npxCommand) {
    throw 'Install the Supabase CLI or Node.js/npm, then run this script again.'
  }
  $cliExecutable = $npxCommand.Source
  $cliPrefix = @('--yes', 'supabase')
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDirectory = Join-Path $BackupRoot "CarciOscar-$timestamp"
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

function Invoke-SupabaseDump {
  param(
    [string[]]$DumpOptions,
    [string]$OutputPath
  )

  $arguments = @(
    '--workdir', $PSScriptRoot,
    'db', 'dump', '--linked', '--project-ref', $projectRef,
    '--file', $OutputPath
  ) + $DumpOptions

  $allArguments = $cliPrefix + $arguments
  & $cliExecutable @allArguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI dump failed for $([System.IO.Path]::GetFileName($OutputPath)) with exit code $LASTEXITCODE."
  }
  if (-not (Test-Path -LiteralPath $OutputPath) -or (Get-Item -LiteralPath $OutputPath).Length -eq 0) {
    throw "Supabase CLI did not create a non-empty dump: $OutputPath"
  }
}

try {
  Invoke-SupabaseDump -DumpOptions @() -OutputPath (Join-Path $backupDirectory 'schema.sql')
  Invoke-SupabaseDump -DumpOptions @('--data-only', '--use-copy') -OutputPath (Join-Path $backupDirectory 'data.sql')
  Invoke-SupabaseDump -DumpOptions @('--role-only') -OutputPath (Join-Path $backupDirectory 'roles.sql')

  @(
    "Project ref: $projectRef"
    "Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
    'Files: schema.sql, data.sql, roles.sql'
    'These logical dumps exclude Supabase-managed schemas such as auth and storage. Storage object files are not database rows and are not included.'
  ) | Set-Content -LiteralPath (Join-Path $backupDirectory 'README.txt') -Encoding UTF8

  Write-Host "Database backup created: $backupDirectory"
} catch {
  throw "Backup failed. Partial files, if any, were left in '$backupDirectory'. Details: $($_.Exception.Message)"
}
