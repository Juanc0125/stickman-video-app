# Frees ports 3000 and 8080 so a build can take apps/web/.next.
#
# Killing the listening PID alone is not enough: `npm run dev` supervises both
# children, so the supervisor respawns whatever you just killed and the port is
# busy again a second later. The parent has to go too, hence /T on the tree and
# the ParentProcessId lookup.
#
#   powershell -File .claude/skills/verificar/scripts/liberar-puertos.ps1
#
# Prints what it stopped and confirms both ports are free. Exit 0 when free,
# 1 when something is still listening - a build started against a held .next
# fails with EPERM, which reads like a code error and is not one.

$puertos = 3000, 8080
$pids = @()
foreach ($p in $puertos) {
    $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($c) { $pids += $c.OwningProcess }
}
$pids = $pids | Sort-Object -Unique

if ($pids.Count -eq 0) {
    Write-Output "Puertos 3000 y 8080 ya estaban libres."
    exit 0
}

Write-Output "Deteniendo: $($pids -join ', ')"
foreach ($id in $pids) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    $parent = $proc.ParentProcessId
    cmd /c "taskkill /PID $id /T /F" 2>&1 | Out-Null
    # The supervisor would respawn the child we just killed.
    if ($parent -and $parent -ne 0) { cmd /c "taskkill /PID $parent /T /F" 2>&1 | Out-Null }
}

Start-Sleep -Seconds 3

$quedan = @()
foreach ($p in $puertos) {
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) { $quedan += $p }
}
if ($quedan.Count -eq 0) {
    Write-Output "Puertos 3000 y 8080 liberados."
    exit 0
}
Write-Output "Siguen ocupados: $($quedan -join ', '). Un build ahora daria EPERM."
exit 1
