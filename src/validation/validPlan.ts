interface TranslatedText {
  en?: string;
  nl?: string;
  fr?: string;
  es?: string;
}

interface CreatePlanPayload {
  key: string;
  name: TranslatedText;
  description: TranslatedText;
  trialDays: number;
  eurAmount: number;
  gbpAmount: number;
  fullAccess: any;
  trialAccess: any;
  features:any;
}

export const validateCreatePlanPayload = (
  body: any,
  type: "create" | "update"
): { valid: boolean; message?: string; data?: CreatePlanPayload } => {
  const {
    key,
    name,
    description,
    trialDays,
    eurAmount,
    gbpAmount,
    fullAccess,
    trialAccess,
    features,
  } = body;

  if ((!key || typeof key !== "string") && type=="create") {
    throw new Error("Plan key is required and must be a string");
  }

  if (!name || typeof name !== "object") {
    throw new Error("Plan name is required and must be a string");
  }

  if (!description || typeof description !== "object") {
    throw new Error("Plan description is required and must be a string");
  }

  if (typeof trialDays !== "number" || trialDays < 0) {
    throw new Error("Trial days must be a non-negative number");
  }

  if (typeof eurAmount !== "number" || eurAmount <= 0) {
    throw new Error("EUR amount must be a positive number");
  }

  if (typeof gbpAmount !== "number" || gbpAmount <= 0) {
    throw new Error("GBP amount must be a positive number");
  }

  return {
    valid: true,
    data: {
      key,
      name,
      description,
      trialDays,
      eurAmount,
      gbpAmount,
      fullAccess,
      trialAccess,
      features
    },
  };
};
