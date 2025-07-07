export type SupportedLang = 'en' | 'nl' | 'fr' | 'es';

export const messages = {
  success: {
    en: 'Success',
    nl: 'Succes',
    fr: 'Succès',
    es: 'Éxito',
  },
  created: {
    en: 'Resource created successfully',
    nl: 'Bron succesvol aangemaakt',
    fr: 'Ressource créée avec succès',
    es: 'Recurso creado con éxito',
  },
  error: {
    en: 'Something went wrong',
    nl: 'Er is iets misgegaan',
    fr: 'Une erreur s\'est produite',
    es: 'Algo salió mal',
  },
  notFound: {
    en: 'Resource not found',
    nl: 'Bron niet gevonden',
    fr: 'Ressource introuvable',
    es: 'Recurso no encontrado',
  },
  unauthorized: {
    en: 'Unauthorized access',
    nl: 'Niet gemachtigd',
    fr: 'Non autorisé',
    es: 'No autorizado',
  },
  forbidden: {
    en: 'Forbidden',
    nl: 'Verboden',
    fr: 'Interdit',
    es: 'Prohibido',
  },
  badRequest: {
    en: 'Bad request',
    nl: 'Ongeldig verzoek',
    fr: 'Requête invalide',
    es: 'Solicitud incorrecta',
  },
  conflict: {
    en: 'Conflict occurred',
    nl: 'Conflict opgetreden',
    fr: 'Conflit survenu',
    es: 'Conflicto ocurrido',
  },
  validationError: {
    en: 'Validation failed',
    nl: 'Validatie mislukt',
    fr: 'Échec de la validation',
    es: 'La validación falló',
  }
};

export const customMessages: Record<SupportedLang, any> = {
  en: {
    loginSuccess: "Login successful",
    logoutSuccess: "Logout successful",
    badrequest: "Bad request",
    subjectEmailVerification: "Email Verification",
    subjectResetPassword: "Reset Password",
    firstNameRequired: "First name is required",
    emailExist: "Email already exists",
    registerRequiredFields: "Fullname, email, and password are required",
    invalidRegisterFields: "Country or Language is invalid",
    invalidOtp:"Invalid or expired OTP",
    userNotFound:"User not found",
    invalidPassword:"Invalid password",
    invalidToken:"Invalid or expired token",
    noSubscription:"No active subscription found",
    recordAlreadyPresent:"Data already exist",
    planNotFound:"Plan does not exist",
    invalidCurrency:"Invalid currency",
    stripeCustomerIdNotFound:"Stripe customer Id in invalid",
    userAlreadyUsedTrial:"Trial already used",
    invalidFields:"Invalid fields"
  },
  nl: {
    badrequest: "Ongeldig verzoek",
    subjectEmailVerification: "E-mailverificatie",
    subjectResetPassword: "Wachtwoord opnieuw instellen",
    firstNameRequired: "Voornaam is verplicht",
    emailExist: "E-mailadres bestaat al",
    registerRequiredFields: "Volledige naam, e-mailadres en wachtwoord zijn verplicht",
    invalidRegisterFields: "Land of taal is ongeldig",
  },
  fr: {
    badrequest: "Requête invalide",
    subjectEmailVerification: "Vérification de l'e-mail",
    subjectResetPassword: "Réinitialisation du mot de passe",
    firstNameRequired: "Le prénom est requis",
    emailExist: "L'e-mail existe déjà",
    registerRequiredFields: "Nom complet, e-mail et mot de passe sont requis",
    invalidRegisterFields: "Pays ou langue invalide",
  },
  es: {
    badrequest: "Solicitud incorrecta",
    subjectEmailVerification: "Verificación de correo electrónico",
    subjectResetPassword: "Restablecer la contraseña",
    firstNameRequired: "El nombre es obligatorio",
    emailExist: "El correo electrónico ya existe",
    registerRequiredFields: "Nombre completo, correo electrónico y contraseña son obligatorios",
    invalidRegisterFields: "País o idioma no válido",
  }
};

