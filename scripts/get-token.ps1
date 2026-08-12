# Fetch a real access token from musanna-platform for local testing.
#
# musanna enables authorization_code + PKCE, refresh, client_credentials and
# device flows -- there is no password grant. This script walks the same path
# musanna's own integration tests use: cookie login, then /connect/authorize
# with the cookie (which 302s straight back with the code, no browser), then
# the token exchange.
#
#   .\scripts\get-token.ps1                 # prints the access token
#   $t = .\scripts\get-token.ps1
#   curl.exe -H "authorization: Bearer $t" http://localhost:8080/api/me/links
#
# The `shortener.api` scope is what puts `musanna.shortener` in the token's
# `aud`; without it the shortener rejects the token when
# JWC_JWT_EXPECTED_AUD is set.
#
# ASCII only: Windows PowerShell 5.1 reads a BOM-less file as ANSI, so a
# non-ASCII character in a comment breaks the parse of its line.

param(
    [string]$Authority  = "http://localhost:5246",
    [string]$ClientId   = "dev-spa",
    [string]$RedirectUri = "http://localhost/callback",
    [string]$Scope      = "openid profile email shortener.api",
    [string]$Identifier = "+998900000000",
    [string]$Password   = "SuperAdmin1",
    [switch]$Decode
)

$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([byte[]]$Bytes) {
    [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

# --- PKCE pair --------------------------------------------------------
$verifierBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($verifierBytes)
$verifier = ConvertTo-Base64Url $verifierBytes
$sha = [Security.Cryptography.SHA256]::Create()
$challenge = ConvertTo-Base64Url $sha.ComputeHash([Text.Encoding]::ASCII.GetBytes($verifier))

# --- 1. cookie login --------------------------------------------------
$loginBody = '{"identifier":"' + $Identifier + '","password":"' + $Password + '"}'
Invoke-WebRequest -Uri "$Authority/api/identity/login" -Method POST `
    -ContentType "application/json" -Body $loginBody `
    -SessionVariable session -UseBasicParsing | Out-Null

# --- 2. authorize -> 302 with ?code= ----------------------------------
$authorizeUrl = "$Authority/connect/authorize" `
    + "?response_type=code" `
    + "&client_id=$([Uri]::EscapeDataString($ClientId))" `
    + "&redirect_uri=$([Uri]::EscapeDataString($RedirectUri))" `
    + "&scope=$([Uri]::EscapeDataString($Scope))" `
    + "&code_challenge=$challenge&code_challenge_method=S256&state=cli"

# HttpWebRequest rather than Invoke-WebRequest: with -MaximumRedirection 0
# PS 5.1 raises MaximumRedirectExceeded, an InvalidOperationException that
# carries no Response, so the Location header is unreachable from the catch.
# Reuse the login cookies by handing over the session's CookieContainer.
$req = [Net.HttpWebRequest]::Create($authorizeUrl)
$req.AllowAutoRedirect = $false
$req.CookieContainer = $session.Cookies
$location = $null
try {
    $resp = $req.GetResponse()
    $location = $resp.Headers["Location"]
    $resp.Close()
} catch [Net.WebException] {
    if ($null -eq $_.Exception.Response) { throw }
    $location = $_.Exception.Response.Headers["Location"]
}
if ([string]::IsNullOrEmpty($location)) {
    throw "authorize did not return a Location header (login rejected?)"
}
if ($location -notmatch "[?&]code=([^&]+)") {
    throw "authorize returned no code: $location"
}
$code = [Uri]::UnescapeDataString($Matches[1])

# --- 3. code -> token -------------------------------------------------
$form = @{
    grant_type    = "authorization_code"
    client_id     = $ClientId
    code          = $code
    redirect_uri  = $RedirectUri
    code_verifier = $verifier
}
$token = Invoke-RestMethod -Uri "$Authority/connect/token" -Method POST -Body $form

if ($Decode) {
    $parts = $token.access_token.Split('.')
    $p = $parts[1].Replace('-', '+').Replace('_', '/')
    while ($p.Length % 4) { $p += '=' }
    [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p))
} else {
    $token.access_token
}
