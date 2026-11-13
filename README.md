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


## Crédits

Bibliothèques et icônes utilisées dans ce projet :

- [normalize.css v8.0.1](https://github.com/necolas/normalize.css) — © Nicolas Gallagher and Jonathan Neal, MIT
- [Feather Icons](https://github.com/feathericons/feather) — © 2013-2023 Cole Bemis, MIT (icône de réglage, et icônes soleil et lune dérivées)
- [Bootstrap Icons](https://github.com/twbs/icons) — © 2019-2024 The Bootstrap Authors, MIT (icône de corbeille)
- [Elusive Icons](https://github.com/dovy/elusive-icons) — © Team Redux / Dave Gandy, SIL Open Font License 1.1 (icône de validation)

Les textes de licence complets sont reproduits ci-dessous.

### MIT

Copyright © Nicolas Gallagher and Jonathan Neal
Copyright (c) 2013-2023 Cole Bemis
Copyright (c) 2019-2024 The Bootstrap Authors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### SIL Open Font License 1.1

Copyright © Team Redux / Dave Gandy — http://elusiveicons.com

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.


## License

[CreativeCommons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)


## Demo

https://todolist.cedric-prudhomme.fr/