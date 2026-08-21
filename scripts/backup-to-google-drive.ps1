$ErrorActionPreference = "Stop"

$sourcePath = "C:\Users\lenovo\OneDrive\Документы\ChatGPT\сайт"
$backupPath = "G:\Мой диск\ChatGPT\сайт"
$logDirectory = Join-Path $sourcePath "backup-logs"

if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
    throw "Рабочая папка не найдена: $sourcePath"
}

if (-not (Test-Path -LiteralPath $backupPath -PathType Container)) {
    throw "Папка Google Drive недоступна: $backupPath"
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logPath = Join-Path $logDirectory ("google-drive-backup-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))

$excludedDirectories = @(
    "node_modules",
    ".next",
    ".pnpm-cache",
    ".pnpm-store",
    "backup-logs"
)

$robocopyArguments = @(
    $sourcePath,
    $backupPath,
    "/E",
    "/COPY:DAT",
    "/DCOPY:DAT",
    "/FFT",
    "/R:2",
    "/W:5",
    "/XJ",
    "/Z",
    "/NP",
    "/TEE",
    "/LOG+:$logPath",
    "/XD"
) + $excludedDirectories

& robocopy @robocopyArguments
$robocopyExitCode = $LASTEXITCODE

if ($robocopyExitCode -ge 8) {
    throw "Резервное копирование завершилось с ошибкой robocopy $robocopyExitCode. См. $logPath"
}

exit 0
