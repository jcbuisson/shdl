
# JWT private/public keys

// Generate a private key (2048 bits for security)
openssl genpkey -algorithm RSA -out private.pem

// Extract the public key from the private key
openssl rsa -pubout -in private.pem -out public.pem
