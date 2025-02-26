

# Authentication expiration

A chaque action manuelle utilisateur (changement de route, clic sur bouton etc.), `app.service('auth').checkAuthenticationAndExtendExpiration()` est appelé,
qui publie un événement dont la valeur est la date d'expiration, ou null si elle est dépassée


# JWT private/public keys

// Generate a private key (2048 bits for security)
openssl genpkey -algorithm RSA -out private.pem

// Extract the public key from the private key
openssl rsa -pubout -in private.pem -out public.pem
