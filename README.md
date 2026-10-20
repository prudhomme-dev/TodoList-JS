# TodoList-JS

Application de gestion de tâches avec authentification par mot de passe et
stockage des données dans un fichier JSON côté serveur.

Thème clair ou sombre, aligné automatiquement sur la préférence système et
commutable via le bouton en haut de page.


## Fonctionnement

- `api/tasks.php` : lit et écrit `data/tasks.json`
- `api/auth.php`   : indique si l'application attend une création de mot de passe ou un déverrouillage
- `api/password.php` : crée le premier mot de passe, ou le modifie
- `data/tasks.json` : les tâches, au format `{ "version", "updatedAt", "tasks" }`
- `data/password.txt` : hash bcrypt du mot de passe

Le mot de passe n'est jamais stocké en clair : le serveur ne conserve que son
hash, comparé via `password_verify` (à temps constant).

Les données sont réécrites en écriture atomique (fichier temporaire puis
`rename`), et le serveur revalide chaque tâche reçue avant de l'enregistrer.


## Installation sur un hébergement mutualisé PHP

1. Envoyer l'ensemble des fichiers dans la racine web, **`.htaccess` compris**.
   Certains clients FTP masquent les fichiers commençant par un point : vérifier
   que `data/.htaccess` est bien présent après envoi.
2. Vérifier que `data/` est accessible en écriture (rights `755` ou `775` dans
   le panneau de l'hébergeur).
3. Activer le HTTPS (certificat gratuit). **Obligatoire** : sans lui, le mot de
   passe circule en clair.
4. Ouvrir le site. L'écran « Première utilisation » apparaît et permet de créer
   le mot de passe.

### Vérification obligatoire après mise en ligne

Ouvrir dans un navigateur :

```
https://votre-domaine/data/tasks.json
https://votre-domaine/data/password.txt
```

Les deux doivent répondre **403**. Si l'un renvoie le contenu du fichier, le
mot de passe ne protège plus rien : l'application affiche elle-même un écran
« Stockage exposé » au lieu de démarrer.


## Fenêtre de création du mot de passe

L'application n'accepte de créer un premier mot de passe que dans les **30
minutes** suivant le dépôt des fichiers. Passé ce délai, l'API refuse.

Pour la rouvrir : supprimer `data/password.txt` via le panneau de l'hébergeur,
puis recharger le site dans les 30 minutes.

La création est également refusée si `data/.htaccess` est absent.


## Changer de mot de passe

Bouton réglages, en haut à droite de l'application : le formulaire demande le
mot de passe actuel, le nouveau, puis sa confirmation.

### Mot de passe oublié

L'application n'a ni compte ni adresse e-mail : aucune réinitialisation par
courriel n'est possible. La seule procédure consiste à passer par l'hébergeur :

1. supprimer `data/password.txt` depuis le panneau Ni-Host ;
2. recharger le site dans les **30 minutes** qui suivent, pour rouvrir la fenêtre
   de création ;
3. définir un nouveau mot de passe à l'écran « Première utilisation ».


## Protection contre la force brute

Cinq tentatives échouées par adresse IP déclenchent un blocage croissant
(60 s, puis 120 s, 240 s…), plafonné à 30 minutes. L'état est conservé dans
`data/lock.json`.


## Sauvegarde

`data/tasks.json` est la seule source de vérité. Il n'est pas versionné par git
(voir `.gitignore`) : le sauvegarder régulièrement. Le format est directement
lisible et modifiable à la main, à condition de respecter la structure JSON.


## Auteur

- [@prudhomme-dev](https://github.com/prudhomme-dev)


## License

[CreativeCommons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)


## Demo

https://todolist.cedric-prudhomme.fr/