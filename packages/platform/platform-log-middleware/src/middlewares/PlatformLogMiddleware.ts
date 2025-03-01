import {Constant} from "@tsed/di";
import {Middleware, MiddlewareMethods} from "@tsed/platform-middlewares";
import {Context} from "@tsed/platform-params";
import type {LoggerRequestFields} from "../domain/PlatformLogMiddlewareSettings";

/**
 * @middleware
 * @platform
 */
@Middleware()
export class PlatformLogMiddleware implements MiddlewareMethods {
  $onResponse: any;

  @Constant("logger.requestFields", ["reqId", "method", "url", "duration"])
  protected requestFields: LoggerRequestFields;

  @Constant("logger.logRequest", true)
  protected logRequest: boolean;

  @Constant("logger.logStart", true)
  protected logStart: boolean;

  @Constant("logger.logEnd", true)
  protected logEnd: boolean;

  @Constant("logger.level")
  protected logLevel: string;

  @Constant("debug")
  protected debug: boolean;

  constructor() {
    if (this.logLevel !== "off") {
      this.$onResponse = this.onLogEnd.bind(this);
    }
  }

  get settings() {
    return this;
  }

  /**
   * Handle the request.
   */
  public use(@Context() ctx: Context): void {
    this.configureRequest(ctx);
    this.onLogStart(ctx);
  }

  /**
   * The separate onLogStart() function will allow developer to overwrite the initial request log.
   * @param ctx
   */
  protected onLogStart(ctx: Context) {
    const {debug, logRequest, logStart} = this.settings;

    if (logStart) {
      if (debug) {
        ctx.logger.debug({
          event: "request.start"
        });
      } else if (logRequest) {
        ctx.logger.info({
          event: "request.start"
        });
      }
    }
  }

  /**
   * Called when the `$onResponse` is called by Ts.ED (through Express.end).
   */
  protected onLogEnd(ctx: Context) {
    const {debug, logRequest, logEnd} = this.settings;

    if (logEnd) {
      if (debug) {
        ctx.logger.debug({
          event: "request.end",
          status: ctx.response.statusCode,
          data: ctx.data
        });
      } else if (logRequest) {
        ctx.logger.info({
          event: "request.end",
          status: ctx.response.statusCode
        });
      }
    }

    ctx.logger.flush();
  }

  /**
   * Attach all information that will be necessary to log the request. Attach a new `request.log` object.
   */
  protected configureRequest(ctx: Context) {
    ctx.logger.minimalRequestPicker = (obj: any) => ({...this.minimalRequestPicker(ctx), ...obj});
    ctx.logger.completeRequestPicker = (obj: any) => ({...this.requestToObject(ctx), ...obj});
  }

  /**
   * Return complete request info.
   * @returns {Object}
   * @param ctx
   */
  protected requestToObject(ctx: Context): any {
    const {request} = ctx;

    return {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      query: request.query,
      params: request.params
    };
  }

  /**
   * Return a filtered request from global configuration.
   * @returns {Object}
   * @param ctx
   */
  protected minimalRequestPicker(ctx: Context): any {
    const {requestFields} = this;
    const info = this.requestToObject(ctx);

    return requestFields!.reduce((acc: any, key: string) => {
      acc[key] = info[key];

      return acc;
    }, {});
  }
}
