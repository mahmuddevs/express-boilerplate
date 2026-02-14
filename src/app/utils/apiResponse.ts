import { type Response } from "express";
import { logger } from "./logger.js";

type ResponseOptions = {
  message?: string;
  data?: any;
  statusCode?: number;
};

export const response = {
  success: (res: Response, options: ResponseOptions = {}) => {
    const { message = "Success", data, statusCode = 200 } = options;

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
    } = options;

    logger.error(`ERROR ${res.req.method} ${res.req.url} - ${message}`);

    return res.status(statusCode).json({
      status: "error",
      message,
      data,
    });
  },

  warning: (res: Response, options: ResponseOptions = {}) => {
    const { message = "Warning", data, statusCode = 400 } = options;

    logger.warn(`WARNING ${res.req.method} ${res.req.url} - ${message}`);

    return res.status(statusCode).json({
      status: "warning",
      message,
      data,
    });
  },
};
