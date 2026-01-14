export type SupportedLang = "en" | "nl" | "fr" | "es";

export const messages = {
  success: {
    en: "Success",
    nl: "Succes",
    fr: "Succès",
    es: "Éxito",
  },
  created: {
    en: "Resource created successfully",
    nl: "Bron succesvol aangemaakt",
    fr: "Ressource créée avec succès",
    es: "Recurso creado con éxito",
  },
  error: {
    en: "Something went wrong",
    nl: "Er is iets misgegaan",
    fr: "Une erreur s'est produite",
    es: "Algo salió mal",
  },
  notFound: {
    en: "Resource not found",
    nl: "Bron niet gevonden",
    fr: "Ressource introuvable",
    es: "Recurso no encontrado",
  },
  unauthorized: {
    en: "Unauthorized access",
    nl: "Niet gemachtigd",
    fr: "Non autorisé",
    es: "No autorizado",
  },
  forbidden: {
    en: "Forbidden",
    nl: "Verboden",
    fr: "Interdit",
    es: "Prohibido",
  },
  badRequest: {
    en: "Bad request",
    nl: "Ongeldig verzoek",
    fr: "Requête invalide",
    es: "Solicitud incorrecta",
  },
  conflict: {
    en: "Conflict occurred",
    nl: "Conflict opgetreden",
    fr: "Conflit survenu",
    es: "Conflicto ocurrido",
  },
  validationError: {
    en: "Validation failed",
    nl: "Validatie mislukt",
    fr: "Échec de la validation",
    es: "La validación falló",
  },
};

export const notificationMessages = {
  en: {
    TASK_COMPLETED: {
      title: "Task Completed",
      description: "You’ve unlocked a new task. Keep going!",
    },
    TASK_REJECTED: {
      title: "Task Rejected",
      description: "Your submitted task did not pass. Please try again.",
    },
    JOB_SHORTLISTED: {
      title: "Job Shortlisted",
      description: "Congratulations! Your application has been shortlisted.",
    },
    JOB_REJECTED: {
      title: "Job Rejected",
      description: "Unfortunately, your job application was not successful.",
    },
    JOB_ALERT: {
      title: "New Job Alert",
      description: "New job opportunities are available. Check them out!",
    },
    MILESTONE_UNLOCKED: {
      title: "Milestone Unlocked",
      description: "Great work! You’ve unlocked a new milestone.",
    },
    FREETRIAL_STARTED: {
      title: "Free Trial Started",
      description: "Your free trial has been started, Enjoy the benefits!",
    },
    SUBSCRIPTION_STARTED: {
      title: "Subscription Started",
      description: "Your subscription is now active. Enjoy the benefits!",
    },
    SUBSCRIPTION_RENEWED: {
      title: "Subscription Renewed",
      description: "Your subscription has been successfully renewed.",
    },
    SUBSCRIPTION_FAILED: {
      title: "Payment Failed",
      description: "Your subscription payment could not be processed.",
    },
    SUBSCRIPTION_CANCELLED: {
      title: "Subscription Cancelled",
      description: "Your subscription has been cancelled.",
    },
    // New Notifications,
    PORTFOLIO_BOOTCAMP_CANCELLED: {
      title: "Portfolio Bootcamp Cancelled",
      description:
        "Unfortunately, your Portfolio Bootcamp has been cancelled by Disstrikt.",
    },
    SKILL_BOOTCAMP_CANCELLED: {
      title: "Skill Bootcamp Cancelled",
      description:
        "Unfortunately, your Skill Bootcamp has been cancelled by Disstrikt.",
    },
    SHOOT_CANCELLED: {
      title: "Shoot Cancelled",
      description:
        "Unfortunately, your scheduled shoot has been cancelled by Disstrikt.",
    },
    PORTFOLIO_BOOTCAMP_REVIEWED: {
      title: "Portfolio Bootcamp Reviewed",
      description:
        "Your Portfolio Bootcamp has been successfully reviewed by Disstrikt.",
    },
    SKILL_BOOTCAMP_REVIEWED: {
      title: "Skill Bootcamp Reviewed",
      description:
        "Your Skill Bootcamp has been successfully reviewed by Disstrikt.",
    },
    SHOOT_REVIEWED: {
      title: "Shoot Reviewed",
      description: "Your shoot has been successfully reviewed by Disstrikt.",
    },
  },
  nl: {
    TASK_COMPLETED: {
      title: "Taak Voltooid",
      description: "Je hebt een nieuwe taak ontgrendeld. Ga zo door!",
    },
    TASK_REJECTED: {
      title: "Taak Afgewezen",
      description:
        "Je ingediende taak is niet goedgekeurd. Probeer het opnieuw.",
    },
    JOB_SHORTLISTED: {
      title: "Vacature Geselecteerd",
      description: "Gefeliciteerd! Je sollicitatie is geselecteerd.",
    },
    JOB_REJECTED: {
      title: "Vacature Afgewezen",
      description: "Helaas is je sollicitatie niet succesvol geweest.",
    },
    JOB_ALERT: {
      title: "Nieuwe Vacature",
      description: "Nieuwe vacatures zijn beschikbaar. Bekijk ze nu!",
    },
    MILESTONE_UNLOCKED: {
      title: "Mijlpaal Behaald",
      description: "Goed gedaan! Je hebt een nieuwe mijlpaal behaald.",
    },
    FREETRIAL_STARTED: {
      title: "Gratis Proefperiode Gestart",
      description:
        "Je gratis proefperiode is gestart, geniet van de voordelen!",
    },
    SUBSCRIPTION_STARTED: {
      title: "Abonnement Gestart",
      description: "Je abonnement is nu actief. Veel plezier!",
    },
    SUBSCRIPTION_RENEWED: {
      title: "Abonnement Vernieuwd",
      description: "Je abonnement is succesvol verlengd.",
    },
    SUBSCRIPTION_FAILED: {
      title: "Betaling Mislukt",
      description: "Je abonnementsbetaling kon niet worden verwerkt.",
    },
    SUBSCRIPTION_CANCELLED: {
      title: "Abonnement Geannuleerd",
      description: "Je abonnement is geannuleerd.",
    },

    // New Notifications
    PORTFOLIO_BOOTCAMP_CANCELLED: {
      title: "Portfolio Bootcamp Geannuleerd",
      description:
        "Helaas is jouw Portfolio Bootcamp geannuleerd door Disstrikt.",
    },
    SKILL_BOOTCAMP_CANCELLED: {
      title: "Skill Bootcamp Geannuleerd",
      description: "Helaas is jouw Skill Bootcamp geannuleerd door Disstrikt.",
    },
    SHOOT_CANCELLED: {
      title: "Fotoshoot Geannuleerd",
      description:
        "Helaas is jouw geplande fotoshoot geannuleerd door Disstrikt.",
    },
    PORTFOLIO_BOOTCAMP_REVIEWED: {
      title: "Portfolio Bootcamp Beoordeeld",
      description:
        "Jouw Portfolio Bootcamp is succesvol beoordeeld door Disstrikt.",
    },
    SKILL_BOOTCAMP_REVIEWED: {
      title: "Skill Bootcamp Beoordeeld",
      description:
        "Jouw Skill Bootcamp is succesvol beoordeeld door Disstrikt.",
    },
    SHOOT_REVIEWED: {
      title: "Fotoshoot Beoordeeld",
      description: "Jouw fotoshoot is succesvol beoordeeld door Disstrikt.",
    },
  },
  fr: {
    TASK_COMPLETED: {
      title: "Tâche Terminée",
      description:
        "Vous avez débloqué une nouvelle tâche. Continuez comme ça !",
    },
    TASK_REJECTED: {
      title: "Tâche Rejetée",
      description: "Votre tâche soumise n’a pas été acceptée. Réessayez.",
    },
    JOB_SHORTLISTED: {
      title: "Candidature Sélectionnée",
      description: "Félicitations ! Votre candidature a été présélectionnée.",
    },
    JOB_REJECTED: {
      title: "Candidature Rejetée",
      description: "Malheureusement, votre candidature n’a pas été retenue.",
    },
    JOB_ALERT: {
      title: "Nouvelle Offre d’Emploi",
      description:
        "De nouvelles offres d’emploi sont disponibles. Consultez-les !",
    },
    MILESTONE_UNLOCKED: {
      title: "Étape Atteinte",
      description: "Bravo ! Vous avez atteint une nouvelle étape.",
    },
    FREETRIAL_STARTED: {
      title: "Essai Gratuit Commencé",
      description: "Votre essai gratuit a commencé, profitez-en pleinement !",
    },
    SUBSCRIPTION_STARTED: {
      title: "Abonnement Démarré",
      description: "Votre abonnement est maintenant actif. Profitez-en !",
    },
    SUBSCRIPTION_RENEWED: {
      title: "Abonnement Renouvelé",
      description: "Votre abonnement a été renouvelé avec succès.",
    },
    SUBSCRIPTION_FAILED: {
      title: "Paiement Échoué",
      description: "Votre paiement d’abonnement n’a pas pu être traité.",
    },
    SUBSCRIPTION_CANCELLED: {
      title: "Abonnement Annulé",
      description: "Votre abonnement a été annulé.",
    },

    //New Notifications
    PORTFOLIO_BOOTCAMP_CANCELLED: {
      title: "Bootcamp Portfolio Annulé",
      description:
        "Malheureusement, votre Bootcamp Portfolio a été annulé par Disstrikt.",
    },
    SKILL_BOOTCAMP_CANCELLED: {
      title: "Bootcamp de Compétences Annulé",
      description:
        "Malheureusement, votre Bootcamp de Compétences a été annulé par Disstrikt.",
    },
    SHOOT_CANCELLED: {
      title: "Séance Photo Annulée",
      description:
        "Malheureusement, votre séance photo programmée a été annulée par Disstrikt.",
    },
    PORTFOLIO_BOOTCAMP_REVIEWED: {
      title: "Bootcamp Portfolio Évalué",
      description:
        "Votre Bootcamp Portfolio a été évalué avec succès par Disstrikt.",
    },
    SKILL_BOOTCAMP_REVIEWED: {
      title: "Bootcamp de Compétences Évalué",
      description:
        "Votre Bootcamp de Compétences a été évalué avec succès par Disstrikt.",
    },
    SHOOT_REVIEWED: {
      title: "Séance Photo Évaluée",
      description:
        "Votre séance photo a été évaluée avec succès par Disstrikt.",
    },
  },
  es: {
    TASK_COMPLETED: {
      title: "Tarea Completada",
      description: "Has desbloqueado una nueva tarea. ¡Sigue así!",
    },
    TASK_REJECTED: {
      title: "Tarea Rechazada",
      description: "Tu tarea enviada no fue aprobada. Intenta de nuevo.",
    },
    JOB_SHORTLISTED: {
      title: "Solicitud Seleccionada",
      description: "¡Felicidades! Tu solicitud ha sido preseleccionada.",
    },
    JOB_REJECTED: {
      title: "Solicitud Rechazada",
      description: "Desafortunadamente, tu solicitud no fue aceptada.",
    },
    JOB_ALERT: {
      title: "Nueva Oferta de Trabajo",
      description:
        "Hay nuevas oportunidades de empleo disponibles. ¡Revisa ahora!",
    },
    MILESTONE_UNLOCKED: {
      title: "Hito Alcanzado",
      description: "¡Bien hecho! Has alcanzado un nuevo hito.",
    },
    FREETRIAL_STARTED: {
      title: "Prueba Gratuita Iniciada",
      description:
        "Tu prueba gratuita ha comenzado, ¡disfruta de los beneficios!",
    },
    SUBSCRIPTION_STARTED: {
      title: "Suscripción Iniciada",
      description: "Tu suscripción está activa. ¡Disfruta los beneficios!",
    },
    SUBSCRIPTION_RENEWED: {
      title: "Suscripción Renovada",
      description: "Tu suscripción se ha renovado con éxito.",
    },
    SUBSCRIPTION_FAILED: {
      title: "Pago Fallido",
      description: "No se pudo procesar el pago de tu suscripción.",
    },
    SUBSCRIPTION_CANCELLED: {
      title: "Suscripción Cancelada",
      description: "Tu suscripción ha sido cancelada.",
    },

    //New Notifications
    PORTFOLIO_BOOTCAMP_CANCELLED: {
      title: "Bootcamp de Portafolio Cancelado",
      description:
        "Lamentablemente, tu Bootcamp de Portafolio ha sido cancelado por Disstrikt.",
    },
    SKILL_BOOTCAMP_CANCELLED: {
      title: "Bootcamp de Habilidades Cancelado",
      description:
        "Lamentablemente, tu Bootcamp de Habilidades ha sido cancelado por Disstrikt.",
    },
    SHOOT_CANCELLED: {
      title: "Sesión de Fotos Cancelada",
      description:
        "Lamentablemente, tu sesión de fotos programada ha sido cancelada por Disstrikt.",
    },
    PORTFOLIO_BOOTCAMP_REVIEWED: {
      title: "Bootcamp de Portafolio Revisado",
      description:
        "Tu Bootcamp de Portafolio ha sido revisado con éxito por Disstrikt.",
    },
    SKILL_BOOTCAMP_REVIEWED: {
      title: "Bootcamp de Habilidades Revisado",
      description:
        "Tu Bootcamp de Habilidades ha sido revisado con éxito por Disstrikt.",
    },
    SHOOT_REVIEWED: {
      title: "Sesión de Fotos Revisada",
      description:
        "Tu sesión de fotos ha sido revisada con éxito por Disstrikt.",
    },
  },
};

export const customMessages: Record<SupportedLang, any> = {
  en: {
    registerAgain: "Session expired, please register again",
    loginSuccess: "Login successful",
    invalidEmailDomain: "Invalid email domain.",
    otpResent: "OTP resent successfully",
    logoutSuccess: "Logout successful",
    badrequest: "Bad request",
    subjectEmailVerification: "Email Verification",
    subjectResetPassword: "Reset Password",
    firstNameRequired: "First name is required",
    emailExist: "Email already exists",
    registerRequiredFields: "Fullname, email, and password are required",
    invalidRegisterFields: "Country or Language is invalid",
    invalidOtp: "Invalid or expired OTP",
    userNotFound: "User not found",
    invalidPassword: "Invalid password",
    invalidOldPassword: "Invalid Old Password",
    adminRequired: "Name and email cannot be empty",
    invalidToken: "Invalid or expired token",
    noSubscription: "No active subscription found",
    recordAlreadyPresent: "Data already exist",
    planNotFound: "Plan does not exist",
    invalidCurrency: "Invalid currency",
    stripeCustomerIdNotFound: "Stripe customer Id is invalid",
    userAlreadyUsedTrial: "Trial already used",
    invalidFields: "Invalid fields",
    accountDeleted: "Account deleted successfully",
    planExist: "Plan already exist",
    sectionExist: "Section already exist",
    profileUpdated: "Profile updated successfully",
    requestAlreadyExist: "Request already exist",
    jobExpired: "Job has expired",
    invalidGender: "Invalid gender",
    jobAppliedSuccessfully: "Job applied successfully",
    taskNotFound: "No task found!",
    taskAlreadySubmitted: "Task already submitted",
    noProfilePic: "No profile pic found, please upload one.",
    noBioFound: "No bio found",
    insuffecientJobApplication: "Insufficient job applications",
    insufficientSelection: "Insufficient selection",
    notEnough: "Cannot submit empty text",
    enoughImagesNotFound: "Enough images not found",
    noImageFound: "No image found.",
    noVideoFound: "No video found.",
    noFilesFound: "No files found.",
    quizFailed: "Quiz failed.",
    lessImageCount: "Less image count",
    introVideoNotFound: "Intro video not found",
    preReviewPending: "Previous task review is still pending!",
    noOptionSelected: "No option is selected",
    dailyApplicationLimitReached:
      "Your daily limit to apply on job has finished",
    monthlyApplicationLimitReached:
      "Your monthly limit to apply on job has finished",
    youAreOnFreeTrial: "Free trial limited to 3 tasks. Upgrade to unlock more.",
    upgradeForJob:
      "You Are on Free Trial. Upgrade your plan to apply for jobs.",
    upgradeYourPlan: "Upgrade your plan to unlock more tasks.",
  },
  nl: {
    registerAgain: "Sessie verlopen, registreer opnieuw",
    loginSuccess: "Inloggen geslaagd",
    invalidEmailDomain: "Ongeldig e-maildomein",
    otpResent: "OTP succesvol opnieuw verzonden",
    logoutSuccess: "Uitloggen geslaagd",
    badrequest: "Ongeldig verzoek",
    subjectEmailVerification: "E-mailverificatie",
    subjectResetPassword: "Wachtwoord opnieuw instellen",
    firstNameRequired: "Voornaam is verplicht",
    emailExist: "E-mailadres bestaat al",
    registerRequiredFields:
      "Volledige naam, e-mailadres en wachtwoord zijn verplicht",
    invalidRegisterFields: "Land of taal is ongeldig",
    invalidOtp: "Ongeldige of verlopen OTP",
    userNotFound: "Gebruiker niet gevonden",
    invalidPassword: "Ongeldig wachtwoord",
    invalidOldPassword: "Oud wachtwoord ongeldig",
    adminRequired: "Naam en e-mail mogen niet leeg zijn",
    invalidToken: "Ongeldig of verlopen token",
    noSubscription: "Geen actieve abonnementen gevonden",
    recordAlreadyPresent: "Gegevens bestaan al",
    planNotFound: "Abonnement niet gevonden",
    invalidCurrency: "Ongeldige valuta",
    stripeCustomerIdNotFound: "Stripe klant-ID is ongeldig",
    userAlreadyUsedTrial: "Proefperiode al gebruikt",
    invalidFields: "Ongeldige velden",
    accountDeleted: "Account succesvol verwijderd",
    planExist: "Abonnement bestaat al",
    sectionExist: "Sectie bestaat al",
    profileUpdated: "Profiel succesvol bijgewerkt",
    requestAlreadyExist: "Verzoek bestaat al",
    jobExpired: "Vacature is verlopen",
    invalidGender: "Ongeldig geslacht",
    jobAppliedSuccessfully: "Succesvol gesolliciteerd",
    taskNotFound: "Geen taak gevonden!",
    taskAlreadySubmitted: "Taak al ingediend",
    noProfilePic: "Geen profielfoto gevonden, upload er een.",
    noBioFound: "Geen bio gevonden",
    insuffecientJobApplication: "Onvoldoende sollicitaties",
    insufficientSelection: "Onvoldoende selectie",
    notEnough: "Kan geen lege tekst indienen",
    enoughImagesNotFound: "Onvoldoende afbeeldingen gevonden",
    noImageFound: "Geen afbeelding gevonden.",
    noVideoFound: "Geen video gevonden.",
    noFilesFound: "Geen bestanden gevonden.",
    quizFailed: "Quiz gefaald.",
    lessImageCount: "Te weinig afbeeldingen",
    introVideoNotFound: "Introductievideo niet gevonden",
    preReviewPending: "Beoordeling van vorige taak is nog in behandeling!",
    noOptionSelected: "Geen optie geselecteerd",
    dailyApplicationLimitReached:
      "Je dagelijkse limiet voor sollicitaties is bereikt",
    monthlyApplicationLimitReached:
      "Je maandelijkse limiet voor sollicitaties is bereikt",
    youAreOnFreeTrial:
      "Gratis proef beperkt tot 3 taken. Upgrade om meer te ontgrendelen.",
    upgradeForJob:
      "Je gebruikt een gratis proef. Upgrade je plan om op banen te solliciteren.",
    upgradeYourPlan: "Upgrade je plan om meer taken te ontgrendelen.",
  },
  fr: {
    registerAgain: "Session expirée, veuillez vous réinscrire",
    loginSuccess: "Connexion réussie",
    invalidEmailDomain: "Domaine de courriel invalide",
    otpResent: "OTP renvoyé avec succès",
    logoutSuccess: "Déconnexion réussie",
    badrequest: "Requête invalide",
    subjectEmailVerification: "Vérification de l'e-mail",
    subjectResetPassword: "Réinitialisation du mot de passe",
    firstNameRequired: "Le prénom est requis",
    emailExist: "L'e-mail existe déjà",
    registerRequiredFields: "Nom complet, e-mail et mot de passe sont requis",
    invalidRegisterFields: "Pays ou langue invalide",
    invalidOtp: "OTP invalide ou expiré",
    userNotFound: "Utilisateur non trouvé",
    invalidPassword: "Mot de passe invalide",
    invalidOldPassword: "Ancien mot de passe invalide",
    adminRequired: "Le nom et l'email ne peuvent pas être vides",
    invalidToken: "Jeton invalide ou expiré",
    noSubscription: "Aucun abonnement actif trouvé",
    recordAlreadyPresent: "Les données existent déjà",
    planNotFound: "Plan non trouvé",
    invalidCurrency: "Devise invalide",
    stripeCustomerIdNotFound: "Identifiant client Stripe invalide",
    userAlreadyUsedTrial: "Essai déjà utilisé",
    invalidFields: "Champs invalides",
    accountDeleted: "Compte supprimé avec succès",
    planExist: "Le plan existe déjà",
    sectionExist: "La section existe déjà",
    profileUpdated: "Profil mis à jour avec succès",
    requestAlreadyExist: "La demande existe déjà",
    jobExpired: "L'emploi a expiré",
    invalidGender: "Genre invalide",
    jobAppliedSuccessfully: "Candidature soumise avec succès",
    taskNotFound: "Aucune tâche trouvée !",
    taskAlreadySubmitted: "Tâche déjà soumise",
    noProfilePic:
      "Aucune photo de profil trouvée, veuillez en télécharger une.",
    noBioFound: "Aucune bio trouvée",
    insuffecientJobApplication: "Candidatures insuffisantes",
    insufficientSelection: "Sélection insuffisante",
    notEnough: "Impossible de soumettre un texte vide",
    enoughImagesNotFound: "Pas assez d'images trouvées",
    noImageFound: "Aucune image trouvée.",
    noVideoFound: "Aucune vidéo trouvée.",
    noFilesFound: "Aucun fichier trouvé.",
    quizFailed: "Quiz échoué.",
    lessImageCount: "Nombre d'images insuffisant",
    introVideoNotFound: "Vidéo d'introduction non trouvée",
    preReviewPending: "L'examen de la tâche précédente est toujours en cours !",
    noOptionSelected: "Aucune option sélectionnée",
    dailyApplicationLimitReached:
      "Votre limite quotidienne de candidatures est atteinte",
    monthlyApplicationLimitReached:
      "Votre limite mensuelle de candidatures est atteinte",
    youAreOnFreeTrial:
      "Essai gratuit limité à 3 tâches. Passez à la version supérieure pour en débloquer davantage.",
    upgradeForJob:
      "Vous êtes en essai gratuit. Mettez à niveau votre plan pour postuler à des emplois.",
    upgradeYourPlan:
      "Mettez à niveau votre plan pour débloquer plus de tâches.",
  },
  es: {
    registerAgain: "Sesión expirada, por favor regístrate de nuevo",
    loginSuccess: "Inicio de sesión exitoso",
    invalidEmailDomain: "Dominio de correo electrónico no válido",
    otpResent: "OTP reenviado con éxito",
    logoutSuccess: "Cierre de sesión exitoso",
    badrequest: "Solicitud incorrecta",
    subjectEmailVerification: "Verificación de correo electrónico",
    subjectResetPassword: "Restablecer la contraseña",
    firstNameRequired: "El nombre es obligatorio",
    emailExist: "El correo electrónico ya existe",
    registerRequiredFields:
      "Nombre completo, correo electrónico y contraseña son obligatorios",
    invalidRegisterFields: "País o idioma no válido",
    invalidOtp: "OTP inválido o expirado",
    userNotFound: "Usuario no encontrado",
    invalidPassword: "Contraseña inválida",
    invalidOldPassword: "Contraseña antigua no válida",
    adminRequired: "El nombre y el correo electrónico no pueden estar vacíos",
    invalidToken: "Token inválido o expirado",
    noSubscription: "No se encontró ninguna suscripción activa",
    recordAlreadyPresent: "Los datos ya existen",
    planNotFound: "Plan no encontrado",
    invalidCurrency: "Moneda inválida",
    stripeCustomerIdNotFound: "El ID de cliente de Stripe es inválido",
    userAlreadyUsedTrial: "Prueba ya utilizada",
    invalidFields: "Campos inválidos",
    accountDeleted: "Cuenta eliminada con éxito",
    planExist: "El plan ya existe",
    sectionExist: "La sección ya existe",
    profileUpdated: "Perfil actualizado con éxito",
    requestAlreadyExist: "La solicitud ya existe",
    jobExpired: "El trabajo ha expirado",
    invalidGender: "Género inválido",
    jobAppliedSuccessfully: "Solicitud de trabajo enviada con éxito",
    taskNotFound: "¡No se encontró ninguna tarea!",
    taskAlreadySubmitted: "Tarea ya enviada",
    noProfilePic: "No se encontró foto de perfil, por favor sube una.",
    noBioFound: "No se encontró biografía",
    insuffecientJobApplication: "Solicitudes de trabajo insuficientes",
    insufficientSelection: "Selección insuficiente",
    notEnough: "No se puede enviar texto vacío",
    enoughImagesNotFound: "No se encontraron suficientes imágenes",
    noImageFound: "No se encontró ninguna imagen.",
    noVideoFound: "No se encontró ningún video.",
    noFilesFound: "No se encontraron archivos.",
    quizFailed: "Quiz fallido.",
    lessImageCount: "Menos cantidad de imágenes",
    introVideoNotFound: "Video de introducción no encontrado",
    preReviewPending: "¡La revisión de la tarea anterior aún está pendiente!",
    noOptionSelected: "No se ha seleccionado ninguna opción",
    dailyApplicationLimitReached:
      "Tu límite diario de solicitudes de trabajo ha terminado",
    monthlyApplicationLimitReached:
      "Tu límite mensual de solicitudes de trabajo ha terminado",
    youAreOnFreeTrial:
      "Prueba gratuita limitada a 3 tareas. Mejora tu plan para desbloquear más.",
    upgradeForJob:
      "Estás en una prueba gratuita. Mejora tu plan para postular a empleos.",
    upgradeYourPlan: "Mejora tu plan para desbloquear más tareas.",
  },
};
