import type { Response, CookieOptions } from "express";
import { logger } from "./logger.js";

type ResponseCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
  clear?: boolean;
};

type ResponseOptions<T = unknown> = {
  message?: string;
  data?: T;
  statusCode?: number;
  cookie?: ResponseCookie | ResponseCookie[];
};


export const handleCookies = (
  res: Response,
  cookie?: ResponseCookie | ResponseCookie[]
) => {
  if (cookie) {
    const cookies = Array.isArray(cookie) ? cookie : [cookie];
    cookies.forEach((c) => {
      if (c.clear) {
        res.clearCookie(c.name, c.options || {});
      } else {
        res.cookie(c.name, c.value, c.options || {});
      }
    });
  }
};

export const response = {
  success: (res: Response, options: ResponseOptions = {}) => {
    const { message = "Success", data, statusCode = 200, cookie } = options;

    handleCookies(res, cookie);

    logger.info(`SUCCESS ${res.req.method} ${res.req.url} - ${message}`);

    return res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  },

  error: (res: Response, options: ResponseOptions = {}) => {
    const {
      message = "Something went wrong",
      data,
      statusCode = 500,
      cookie,
    } = options;

    handleCookies(res, cookie);

    logger.error(`ERROR ${res.req.method} ${res.req.url} - ${message}`);

    return res.status(statusCode).json({
      status: "error",
      message,
      data,
    });
  },

  warning: (res: Response, options: ResponseOptions = {}) => {
    const { message = "Warning", data, statusCode = 400, cookie } = options;

    handleCookies(res, cookie);

    logger.warn(`WARNING ${res.req.method} ${res.req.url} - ${message}`);

    return res.status(statusCode).json({
      status: "warning",
      message,
      data,
    });
  },
};

