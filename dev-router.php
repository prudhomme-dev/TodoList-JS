<?php

/*
 * Routeur pour le serveur de developpement integre de PHP.
 *
 *   php -S 127.0.0.1:8080 dev-router.php
 *
 * Le serveur integre ne lit pas les fichiers .htaccess, donc data/ y serait
 * telechargeable en clair et l'application afficherait l'ecran "Stockage
 * expose". Ce routeur reproduit le comportement d'Apache pour permettre un
 * developpement local fidele a la production.
 */

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = $path === null ? '/' : $path;

$blocked = ['/data/', '/scripts/'];
foreach ($blocked as $prefix) {
    if (strpos($path, $prefix) === 0) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('error' => 'forbidden', 'message' => 'Acces refuse en developpement.'));
        exit;
    }
}

$file = __DIR__ . $path;
if ($path !== '/' && is_file($file)) {
    return false;
}

require __DIR__ . '/index.html';