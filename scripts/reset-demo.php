<?php

declare(strict_types=1);

/*
 * Purge periodique des donnees pour une instance de demonstration.
 *
 * Supprime les taches et l'etat de blocage, puis reecrit un mot de passe de
 * demonstration fixe afin que la demo reste accessible en permanence.
 *
 * Cron (toutes les heures) :
 *
 *   0 * * * * DEMO_TOKEN=<jeton> /usr/bin/php -q /chemin/vers/scripts/reset-demo.php
 *
 * -q supprime les en-tetes HTTP que php-cgi imprime en mode shell. Le jeton se
 * transmet par la variable d'environnement DEMO_TOKEN : php-cgi n'expose pas
 * $argv, un argument --token= serait donc ignore.
 *
 * Tout appel HTTP est refuse, jeton ou non : la seule barriere verifiee en
 * premier est la nature de la requete. DEMO_TOKEN reste optionnel, pour exiger
 * une autorisation explicite meme depuis un shell. Il est alors enregistre a la
 * premiere execution dans data/reset-demo.token (reimpression :
 * DEMO_PRINT_TOKEN=1).
 */

const RESET_INTERVAL = 3600;
const DEFAULT_DEMO_PASSWORD = 'demo1234';

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$stateFile = $dataDir . '/reset-demo.json';
$lockFile = $dataDir . '/reset-demo.lock';
$logFile = $dataDir . '/reset-demo.log';
$passwordFile = $dataDir . '/password.txt';
$tokenFile = $dataDir . '/reset-demo.token';

function out(string $message): void
{
    echo $message . PHP_EOL;
}

function err(string $message): void
{
    $stream = fopen('php://stderr', 'w');
    if ($stream !== false) {
        fwrite($stream, $message . PHP_EOL);
        fclose($stream);
    }
}

function log_line(string $file, string $message): void
{
    @file_put_contents($file, '[' . gmdate('c') . '] ' . $message . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function fail(string $message, string $logFile): void
{
    log_line($logFile, 'ERREUR ' . $message);
    err('ERREUR : ' . $message);
    exit(1);
}

function looks_like_http_request(): bool
{
    if (PHP_SAPI === 'cli' || PHP_SAPI === 'phpdbg') {
        return false;
    }
    foreach (array('REQUEST_METHOD', 'HTTP_HOST', 'SERVER_SOFTWARE') as $marker) {
        if (isset($_SERVER[$marker])) {
            return true;
        }
    }
    return false;
}

function read_token(string $file): ?string
{
    if (!is_file($file)) {
        return null;
    }
    $token = trim((string) file_get_contents($file));
    return $token === '' ? null : $token;
}

function create_token(string $file): string
{
    $token = bin2hex(random_bytes(24));
    @file_put_contents($file, $token . PHP_EOL, LOCK_EX);
    return $token;
}

function wants_print_token(): bool
{
    $flag = getenv('DEMO_PRINT_TOKEN');
    return is_string($flag) && $flag !== '' && $flag !== '0';
}

if (!is_dir($dataDir) || !is_writable($dataDir)) {
    fail('dossier data/ absent ou non inscriptible.', $logFile);
}

if (looks_like_http_request()) {
    log_line($logFile, 'Refus : requete HTTP (SAPI ' . PHP_SAPI . ').');
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo 'Acces refuse.';
    exit;
}

$expectedToken = read_token($tokenFile);
$providedToken = getenv('DEMO_TOKEN');

if (wants_print_token()) {
    out('Jeton : ' . ($expectedToken !== null ? $expectedToken : create_token($tokenFile)));
    exit(0);
}

if (is_string($providedToken) && $providedToken !== '') {
    if ($expectedToken === null) {
        @file_put_contents($tokenFile, $providedToken . PHP_EOL, LOCK_EX);
        $expectedToken = $providedToken;
        log_line($logFile, 'Jeton enregistre depuis DEMO_TOKEN.');
    }
    if (!hash_equals($expectedToken, $providedToken)) {
        log_line($logFile, 'Refus : DEMO_TOKEN sans correspondance (SAPI ' . PHP_SAPI . ').');
        err('Acces refuse.');
        err('DEMO_TOKEN ne correspond pas au jeton enregistre (reimpression : DEMO_PRINT_TOKEN=1).');
        exit(1);
    }
}

$lock = @fopen($lockFile, 'c');
if ($lock === false) {
    fail('verrou de purge indisponible.', $logFile);
}
if (!flock($lock, LOCK_EX | LOCK_NB)) {
    log_line($logFile, 'Purge ignoree : une autre execution est en cours.');
    out('Une autre execution est deja en cours.');
    exit(0);
}

$state = array();
if (is_file($stateFile)) {
    $decoded = json_decode((string) file_get_contents($stateFile), true);
    if (is_array($decoded)) {
        $state = $decoded;
    }
}

$lastReset = isset($state['lastResetAt']) ? (int) $state['lastResetAt'] : 0;
$elapsed = time() - $lastReset;
if ($lastReset > 0 && $elapsed < RESET_INTERVAL) {
    $remaining = (int) ceil((RESET_INTERVAL - $elapsed) / 60);
    log_line($logFile, sprintf('Purge ignoree : %d min depuis la derniere purge.', (int) floor($elapsed / 60)));
    out(sprintf('Prochaine purge dans %d min.', $remaining));
    exit(0);
}

$removed = array();
foreach (array('tasks.json', 'lock.json') as $target) {
    $path = $dataDir . '/' . $target;
    if (is_file($path) && @unlink($path)) {
        $removed[] = $target;
    }
}

$leftovers = glob($dataDir . '/*.tmp');
foreach (is_array($leftovers) ? $leftovers : array() as $leftover) {
    if (is_file($leftover) && @unlink($leftover)) {
        $removed[] = basename($leftover);
    }
}

$password = getenv('DEMO_PASSWORD');
if (!is_string($password) || $password === '') {
    $password = DEFAULT_DEMO_PASSWORD;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
if ($hash === false) {
    fail('generation du hash impossible.', $logFile);
}
if (@file_put_contents($passwordFile, $hash . PHP_EOL, LOCK_EX) === false) {
    fail('ecriture du mot de passe impossible.', $logFile);
}

@file_put_contents(
    $stateFile,
    json_encode(array('lastResetAt' => time(), 'removed' => $removed), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
    LOCK_EX
);

log_line($logFile, $removed === array() ? 'Purge effectuee : rien a supprimer.' : 'Purge effectuee : ' . implode(', ', $removed) . '.');
out('Purge effectuee.');
