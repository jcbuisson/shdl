
# Utilisation des observables

## Analyse syntaxique

La méthode habituelle consisterait à faire un fetch du document racine, en faire l'analyse syntaxique, puis réitérer le processus
avec les sous-modules. Cette méthode ne serait pas temps réel, et nous serait difficile car nous avons perdu la possibilité
d'avoir la "dernière version" d'un objet de base de données. Tout ce que nous avons, c'est la possibilité d'avoir une nouvelle version
d'un objet de base de données chaque fois qu'il est modifié.
Pour procéder à l'analyse syntaxique d'un module et de ses sous-modules dans ce contexte temps-réel, il faut le faire directement
en créant un observable qui renverra la structure syntaxique au fur et à mesure que les différentes sous-parties seront émises.
Tant que des sous-modules seront en attente d'être émis, l'observable racine émettra une erreur "sous-module X indisponible"
mais il finira par émettre la structure complète lorsque toutes les sous-parties auront été émises.

Attention à ne pas utiliser de promesses dans le code des observables


# SHDL - Simple Hardware Description Language

Credit: University of Toulouse, ENSEEIHT

# Authentication expiration

A chaque action manuelle utilisateur (changement de route, clic sur bouton etc.), `app.service('auth').extendExpiration()` est appelé,
qui publie un événement dont la valeur est la date d'expiration, ou null si elle est dépassée


# JWT private/public keys

// Generate a private key (2048 bits for security)
openssl genpkey -algorithm RSA -out private.pem

// Extract the public key from the private key
openssl rsa -pubout -in private.pem -out public.pem
