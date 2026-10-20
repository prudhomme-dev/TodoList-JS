<?php

declare(strict_types=1);

const API_VERSION = 1;
const BOOTSTRAP_WINDOW = 1800;
const MIN_PASSWORD_LENGTH = 8;
const MAX_TASKS = 5000;
const MAX_BODY_BYTES = 1048576;
const FAILURES_BEFORE_LOCK = 5;
const MAX_LOCK_SECONDS = 1800;

const DATA_DIR = __DIR__ . '/../data';
const TASKS_FILE = DATA_DIR . '/tasks.json';
const PASSWORD_FILE = DATA_DIR . '/password.txt';
const LOCK_FILE = DATA_DIR . '/lock.json';
const HTACCESS_FILE = DATA_DIR . '/.htaccess';

function respond_json($payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respond_error(string $code, string $message, int $status): void
{
    respond_json(array('error' => $code, 'message' => $message), $status);
}

function request_method_is(string $method): bool
{
    return isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === $method;
}

function to_array($value): ?array
{
    if (is_array($value)) {
        return $value;
    }
    if (is_object($value)) {
        return get_object_vars($value);
    }
    return null;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return array('error' => 'empty_body');
    }
    if (strlen($raw) > MAX_BODY_BYTES) {
        return array('error' => 'body_too_large');
    }
    $decoded = json_decode($raw);
    if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
        return array('error' => 'invalid_json');
    }
    return array('body' => $decoded);
}

function write_json_atomic(string $file, array $payload): bool
{
    $directory = dirname($file);
    if (!is_dir($directory)) {
        return false;
    }
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return false;
    }
    $temporary = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($temporary, $json, LOCK_EX) === false) {
        @unlink($temporary);
        return false;
    }
    if (!rename($temporary, $file)) {
        @unlink($temporary);
        return false;
    }
    return true;
}

function truncate_title(string $title, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($title, 0, $limit);
    }
    return substr($title, 0, $limit);
}

function sanitize_tasks($raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    if (count($raw) > MAX_TASKS) {
        return null;
    }
    $result = array();
    foreach ($raw as $entry) {
        $item = to_array($entry);
        if ($item === null) {
            continue;
        }
        if (!isset($item['title']) || !is_string($item['title'])) {
            continue;
        }
        $title = trim($item['title']);
        if ($title === '') {
            continue;
        }
        $priority = isset($item['priority']) ? (int) $item['priority'] : 1;
        if ($priority !== 0 && $priority !== 1 && $priority !== 2) {
            $priority = 1;
        }
        $result[] = array(
            'title' => truncate_title($title, 500),
            'priority' => $priority,
            'status' => !empty($item['status']),
        );
    }
    return $result;
}

function load_tasks_file(): array
{
    if (!is_file(TASKS_FILE)) {
        return array();
    }
    $raw = file_get_contents(TASKS_FILE);
    if ($raw === false) {
        return array();
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || !isset($decoded['tasks']) || !is_array($decoded['tasks'])) {
        return array();
    }
    $sanitized = sanitize_tasks($decoded['tasks']);
    return $sanitized === null ? array() : $sanitized;
}

function store_tasks_file(array $tasks): bool
{
    return write_json_atomic(TASKS_FILE, array(
        'version' => API_VERSION,
        'updatedAt' => gmdate('c'),
        'tasks' => $tasks,
    ));
}

function read_password_hash(): ?string
{
    if (!is_file(PASSWORD_FILE)) {
        return null;
    }
    $hash = trim((string) file_get_contents(PASSWORD_FILE));
    return $hash === '' ? null : $hash;
}

function client_lock_key(): string
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    return substr(hash('sha256', $ip), 0, 16);
}

function lock_state(): array
{
    if (!is_file(LOCK_FILE)) {
        return array();
    }
    $decoded = json_decode((string) file_get_contents(LOCK_FILE), true);
    return is_array($decoded) ? $decoded : array();
}

function lock_expires_at(): int
{
    $state = lock_state();
    $key = client_lock_key();
    if (!isset($state[$key]['lockedUntil'])) {
        return 0;
    }
    return (int) $state[$key]['lockedUntil'];
}

function register_failure(): void
{
    $state = lock_state();
    $key = client_lock_key();
    $failures = 0;
    if (isset($state[$key]['failures'])) {
        $failures = (int) $state[$key]['failures'];
    }
    $failures++;
    $delay = 0;
    if ($failures >= FAILURES_BEFORE_LOCK) {
        $delay = min(60 * (int) pow(2, $failures - FAILURES_BEFORE_LOCK), MAX_LOCK_SECONDS);
    }
    $state[$key] = array('failures' => $failures, 'lockedUntil' => time() + $delay);
    write_json_atomic(LOCK_FILE, $state);
}

function clear_failures(): void
{
    $state = lock_state();
    $key = client_lock_key();
    if (!isset($state[$key])) {
        return;
    }
    unset($state[$key]);
    if ($state === array()) {
        @unlink(LOCK_FILE);
        return;
    }
    write_json_atomic(LOCK_FILE, $state);
}

function refuse_if_locked(): void
{
    if (lock_expires_at() > time()) {
        respond_error('locked', 'Trop de tentatives. Reessayez dans quelques minutes.', 423);
    }
}

function require_authentication(): void
{
    refuse_if_locked();

    $hash = read_password_hash();
    if ($hash === null) {
        respond_error('no_password', "Aucun mot de passe n'est defini sur le serveur.", 503);
    }

    $provided = isset($_SERVER['HTTP_X_PASSWORD']) ? (string) $_SERVER['HTTP_X_PASSWORD'] : '';
    if (!password_verify($provided, $hash)) {
        register_failure();
        respond_error('invalid_password', 'Mot de passe incorrect.', 401);
    }

    clear_failures();
}

function bootstrap_is_open(): bool
{
    if (read_password_hash() !== null) {
        return false;
    }
    $deployed = filemtime(__DIR__ . '/_bootstrap.php');
    if ($deployed === false) {
        return false;
    }
    return (time() - $deployed) <= BOOTSTRAP_WINDOW;
}

function bootstrap_refusal(): ?array
{
    if (!is_file(HTACCESS_FILE)) {
        return array(
            'code' => 'data_exposed',
            'message' => 'Le fichier data/.htaccess est absent : data/ serait telechargeable en HTTP. Ajoutez-le puis reessayez.',
        );
    }
    if (!is_writable(DATA_DIR)) {
        return array(
            'code' => 'data_not_writable',
            'message' => "Le dossier data/ n'est pas accessible en ecriture. Passez ses droits en 755 puis reessayez.",
        );
    }
    if (!bootstrap_is_open()) {
        return array(
            'code' => 'bootstrap_closed',
            'message' => "La fenetre de creation du mot de passe est fermee. Supprimez data/password.txt depuis l'hebergement pour la rouvrir.",
        );
    }
    return null;
}