<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

if (!request_method_is('POST')) {
    respond_error('method_not_allowed', 'Methode non autorisee.', 405);
}

$parsed = read_json_body();
if (isset($parsed['error'])) {
    respond_error($parsed['error'], 'Corps de requete invalide.', 400);
}

$body = to_array($parsed['body']);
if ($body === null) {
    respond_error('invalid_payload', 'Corps de requete invalide.', 400);
}

$next = isset($body['next']) && is_string($body['next']) ? $body['next'] : '';
$current = isset($body['current']) && is_string($body['current']) ? $body['current'] : '';

$hash = read_password_hash();

if ($hash === null) {
    $refusal = bootstrap_refusal();
    if ($refusal !== null) {
        respond_error($refusal['code'], $refusal['message'], 503);
    }
} else {
    refuse_if_locked();
    $provided = isset($_SERVER['HTTP_X_PASSWORD']) ? (string) $_SERVER['HTTP_X_PASSWORD'] : '';
    if (!password_verify($provided, $hash)) {
        register_failure();
        respond_error('invalid_password', 'Mot de passe actuel incorrect.', 401);
    }
}

if (strlen($next) < MIN_PASSWORD_LENGTH) {
    respond_error('weak_password', 'Le mot de passe doit contenir au moins ' . MIN_PASSWORD_LENGTH . ' caracteres.', 422);
}

if (!is_dir(DATA_DIR) && !mkdir(DATA_DIR, 0755, true) && !is_dir(DATA_DIR)) {
    respond_error('data_unavailable', "Le dossier data/ n'a pas pu etre cree.", 500);
}

$newHash = password_hash($next, PASSWORD_DEFAULT);
if ($newHash === false || file_put_contents(PASSWORD_FILE, $newHash . "\n", LOCK_EX) === false) {
    respond_error('write_failed', "Echec de l'ecriture du mot de passe.", 500);
}

clear_failures();
respond_json(array('ok' => true, 'created' => $hash === null));