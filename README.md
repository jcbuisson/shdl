
# SHDL - Simple Hardware Description Language

Credit: University of Toulouse, ENSEEIHT


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


# Authentication expiration

A chaque action manuelle utilisateur (changement de route, clic sur bouton etc.), `app.service('auth').extendExpiration()` est appelé,
qui publie un événement dont la valeur est la date d'expiration, ou null si elle est dépassée


# JWT private/public keys

// Generate a private key (2048 bits for security)
openssl genpkey -algorithm RSA -out private.pem

// Extract the public key from the private key
openssl rsa -pubout -in private.pem -out public.pem



# Ajouts

ne permettre le copier/coller qu’au sein d’un même module ?
- raccourci clavier ‘format/beautify’ pour shdl et draps
- raccourcis clavier pour la simulation

- mise à disposition de snippets / modules / programmes (en passant par les groupes ?)
- l’étudiant doit pouvoir écrire des modules de texte libre, bloquables

- montrer la présence sous forme d’un graphe d’activité, pour estimer l’assiduité rapidement
- sur le graphe d’un étudiant, visualiser les séances, l’activité, les verrouillages et la réussite des tests - bref tous les événements pour l’évaluation

- tests: on doit pouvoir les jouer pas à pas, ou continue jusqu’à une erreur

- on doit pouvoir facilement créer des groupes d’utilisateurs, qui partagent des designs. Qui peut créer des groupes ? Tuteur ?

- meilleur éditeur de texte : Ctrl-F, Ctrl-Z etc.
- freeze pour certaines circularités
- quand on lock un module, ne pas changer la date de lock des sous-modules
- ajouter $umul16x16
- faire en sorte que ‘_’ soit anonyme
- exporter une simulation sous forme d’un fichier test
- exporter un fichier mémoire à partir d’un programme CRAPS
- permettre aux fichier mémoire de contenir des commentaires

- le simulateur doit montrer le contenu des RAMs en direct
- doit pouvoir ajouter des contextes de simulation (= cartes) sous forme de plugins -> 7-segs, etc.
- lorsqu’on passe d’édition à simulation, la simulation ne doit pas se réinitialiser si le code n’a pas changé
- ajout d’une horloge automatique
- synthèse : mode hybride ? Où on aurait les I/O réelles + des I/O à distance par le câble USB

- ajouter une partie présentation bien référencée et un lien vers GitHub


## Guillaume

- j'aimerais bien que la liste des modules soit scrollable indépendamment de la fenêtre ; si je veux check un autre module qui est en bas pendant que j'écris mon module, je dois scroller tout, cliquer sur le module et remonter (c'est vivable mais bon ça pourrait être un peu mieux)
- certains mots-clefs ne sont pas colorés (on, reset, enabled, when) ; typiquement ça m'a posé problème parce que j'oublie régulièrement si c'est "enable" ou "enabled"
- on ne peut pas écrire de formule directement dans un appel de module (par ex. fulladder(a, b * /sub + /b * sub, cin : s, cout)) ; ça à la limite je comprends que c'est pour forcer à écrire les équipotentielles intermédiaires
- j'aimerais bien pouvoir faire des dossiers pour ranger mes modules ; on en a rapidement beaucoup, pouvoir les ranger serait appréciable. Par contre ça signifie que soit le système de modules à de la qualification (dossier.module) soit qu'il ignore complètement l'architecture en sous-dossiers...
- bon là c'est une feature qui demande deux stages au moins mais j'aimerais bien avoir des chronogrammes pour la logique séquentielle

Questions par ailleurs, car je n'ai rien trouvé dans la doc :
- existe-t-il un genre de "jocker" pour indiquer une sortie non utilisée ? Par ex:
fulladder(a, b, cin : s, _) // Je n'ai pas besoin de cout (et je ne veux pas que ça soit un warning "unused"

- peut-on définir un module dans un module ? Par ex:
module test(a, b : out)
module sousmodule(u, v : x, y)
x = u * /v
y = /u * v
end module
sousmodule(a, b : r, s)
sousmodule(r, s : out, z)
end module

- quand on fait Tab dans l'éditeur ça insère une tabulation, ça serait mieux si ça insérait 3 espaces (d'autant que quand on va à la ligne et que l'éditeur reproduit l'indentation, il met bien 3 espaces).
- j’aimerais pouvoir ajouter des notes concernant un étudiant
