param(
    [switch]$Debug,
    [switch]$Docker
)

if ($Docker) {
    Write-Host "building docker image..." -ForegroundColor Yellow
    docker build -t scapegoat-web .
    $port = $env:VITE_PORT -or 5173 # this is the vite default, may cause conflicts if other things are running on it
    Write-Host "running container on http://localhost:$port..." -ForegroundColor Yellow
    docker run --rm -p $port:80 scapegoat-web
}
elseif ($Debug) {
    Write-Host "starting in debug/development mode..." -ForegroundColor Cyan
    npm run dev
}
else {
    Write-Host "building for production..." -ForegroundColor Green
    npm run build
    Write-Host "starting preview server..." -ForegroundColor Green
    npm run preview
}
