<?php

declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

if (!request_method_is('GET')) {
    respond_error('method_not_allowed', 'Methode non autorisee.', 405);
}

respond_json(array(
    'mode' => bootstrap_is_open() ? 'bootstrap' : 'lock',
    'minimumPasswordLength' => MIN_PASSWORD_LENGTH,
    'bootstrapWindowSeconds' => BOOTSTRAP_WINDOW,
));