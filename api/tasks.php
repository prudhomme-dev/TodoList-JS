<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

require_authentication();

if (request_method_is('GET')) {
    respond_json(array('tasks' => load_tasks_file(), 'version' => API_VERSION));
}

if (request_method_is('POST')) {
    $parsed = read_json_body();
    if (isset($parsed['error'])) {
        respond_error($parsed['error'], 'Corps de requete invalide.', 400);
    }

    $tasks = sanitize_tasks($parsed['body']);
    if ($tasks === null) {
        respond_error('invalid_payload', 'Liste de taches invalide.', 422);
    }

    if (!store_tasks_file($tasks)) {
        respond_error('write_failed', "Echec de l'ecriture sur le serveur.", 500);
    }

    respond_json(array('ok' => true, 'saved' => count($tasks), 'version' => API_VERSION));
}

respond_error('method_not_allowed', 'Methode non autorisee.', 405);