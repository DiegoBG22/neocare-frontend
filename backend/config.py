# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # Change this to a secure secret key
ALGORITHM = "HS256"
# Aumentamos la vida del token para evitar que la sesión se caiga a los pocos minutos.
# 8 horas de sesión continua es razonable para este proyecto.
ACCESS_TOKEN_EXPIRE_MINUTES = 8 * 60