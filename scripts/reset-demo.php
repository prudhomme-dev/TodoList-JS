<?php

declare(strict_types=1);

/*
 * Purge periodique des donnees pour une instance de demonstration.
 *
 * Supprime les taches et l'etat de blocage, puis reecrit un mot de passe de
 * demonstration fixe afin que la demo reste accessible en permanence.
 *
 * Usage (cron, toutes les heures) :
 *
 *   0 * * * * /usr/bin/php /chemin/vers/scripts/reset-demo.php
 *
 * Le mot de passe peut etre redefini avec la variable d'environnement
 * DEMO_PASSWORD. Le script ne s'execute qu'en ligne de commande : toute
 * requete HTTP recoit un 403.
 */

const RESET_INTERVAL = 3600;
const DEFAULT_DEMO_PASSWORD = 'demo1234';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Acces refuse.";
    exit;
}

$root = dirname(__DIR__);
$dataDir = $root . '/data';
$stateFile = $dataDir . '/reset-demo.json';
$lockFile = $dataDir . '/reset-demo.lock';
$logFile = $dataDir . '/reset-demo.log';
$passwordFile = $dataDir . '/password.txt';

function log_line(string $file, string $message): void
{
    @file_put_contents($file, '[' . gmdate('c') . '] ' . $message . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function fail(string $message, string $logFile): void
{
    log_line($logFile, 'ERREUR ' . $message);
    fwrite(STDERR, 'ERREUR : ' . $message . PHP_EOL);
    exit(1);
}

if (!is_dir($dataDir) || !is_writable($dataDir)) {
    fail('dossier data/ absent ou non inscriptible.', $logFile);
}

$lock = @fopen($lockFile, 'c');
if ($lock === false) {
    fail('verrou de purge indisponible.', $logFile);
}
if (!flock($lock, LOCK_EX | LOCK_NB)) {
    log_line($logFile, 'Purge ignoree : une autre execution est en cours.');
    fwrite(STDOUT, "Une autre execution est deja en cours." . PHP_EOL);
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
    fwrite(STDOUT, sprintf('Prochaine purge dans %d min.', $remaining) . PHP_EOL);
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
fwrite(STDOUT, 'Purge effectuee.' . PHP_EOL);
