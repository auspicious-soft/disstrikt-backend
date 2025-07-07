import { Response } from 'express';
import { customMessages, messages, SupportedLang } from './messages';

type Data = Record<string, any> | null;

const getMessage = (key: keyof typeof messages, lang: SupportedLang): string => {
  return messages[key]?.[lang] || messages[key]?.['en'];
};

export const OK = (
  res: Response,
  data: Data = null,
  lang: SupportedLang = 'en',
  message: any = null,
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message: customMessages[lang]?.[message] || getMessage('success', lang),
    data,
  });
};

export const CREATED = (
  res: Response,
  data: Data = null,
  lang: SupportedLang = 'en'
) => {
  return res.status(201).json({
    success: true,
    message: getMessage('created', lang),
    data,
  });
};

export const BADREQUEST = (
  res: Response,
  message: any = "badrequest",
  lang: SupportedLang = 'en'
) => {
  return res.status(400).json({
    success: false,
    message: customMessages[lang]?.[message] || message,
  });
};

export const UNAUTHORIZED = (
  res: Response,
  message: any = "unauthorized",
  lang: SupportedLang = 'en'
) => {
  return res.status(401).json({
    success: false,
    message: customMessages[lang]?.[message] || getMessage('unauthorized', lang),
  });
};

export const FORBIDDEN = (
  res: Response,
  lang: SupportedLang = 'en'
) => {
  return res.status(403).json({
    success: false,
    message: getMessage('forbidden', lang),
  });
};

export const NOT_FOUND = (
  res: Response,
  lang: SupportedLang = 'en'
) => {
  return res.status(404).json({
    success: false,
    message: getMessage('notFound', lang),
  });
};

export const CONFLICT = (
  res: Response,
  lang: SupportedLang = 'en'
) => {
  return res.status(409).json({
    success: false,
    message: getMessage('conflict', lang),
  });
};

export const INVALID = (
  res: Response,
  errors: any,
  lang: SupportedLang = 'en'
) => {
  return res.status(422).json({
    success: false,
    message: getMessage('validationError', lang),
    errors,
  });
};

export const INTERNAL_SERVER_ERROR = (
  res: Response,
  lang: SupportedLang = 'en'
) => {
  return res.status(500).json({
    success: false,
    message: getMessage('error', lang),
  });
};
