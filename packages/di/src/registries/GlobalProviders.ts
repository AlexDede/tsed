import {getClassOrSymbol, Type} from "@tsed/core";
import {Provider} from "../domain/Provider";
import {ProviderType} from "../domain/ProviderType";
import type {IProvider, RegistrySettings, TokenProvider} from "../interfaces";
import {FactoryProvider} from "../domain/FactoryProvider";
import {AsyncFactoryProvider} from "../domain/AsyncFactoryProvider";
import {ValueProvider} from "../domain/ValueProvider";

export class GlobalProviderRegistry extends Map<TokenProvider, Provider> {
  #settings: Map<string, RegistrySettings> = new Map();

  /**
   * The get() method returns a specified element from a Map object.
   * @param key Required. The key of the element to return from the Map object.
   * @returns {T} Returns the element associated with the specified key or undefined if the key can't be found in the Map object.
   */
  get(key: TokenProvider): Provider | undefined {
    return super.get(getClassOrSymbol(key));
  }

  /**
   * The has() method returns a boolean indicating whether an element with the specified key exists or not.
   * @param key
   * @returns {boolean}
   */
  has(key: TokenProvider): boolean {
    return super.has(getClassOrSymbol(key));
  }

  /**
   * The set() method adds or updates an element with a specified key and value to a Map object.
   * @param key Required. The key of the element to add to the Map object.
   * @param metadata Required. The value of the element to add to the Map object.
   */
  set(key: TokenProvider, metadata: Provider): this {
    super.set(getClassOrSymbol(key), metadata);

    return this;
  }

  /**
   *
   * @param target
   * @param options
   */
  merge(target: TokenProvider, options: Partial<IProvider>): void {
    const meta = this.createIfNotExists(target, options);

    Object.keys(options).forEach((key) => {
      meta[key] = (options as any)[key];
    });

    this.set(target, meta);
  }

  /**
   * The delete() method removes the specified element from a Map object.
   * @param key Required. The key of the element to remove from the Map object.
   * @returns {boolean} Returns true if an element in the Map object existed and has been removed, or false if the element does not exist.
   */
  delete(key: TokenProvider): boolean {
    return super.delete(getClassOrSymbol(key));
  }

  createRegistry(type: string, model: Type<Provider>, options: Partial<RegistrySettings> = {}) {
    const defaultOptions = this.getRegistrySettings(type);

    options = Object.assign(defaultOptions, {
      ...options,
      model
    });

    this.#settings.set(type, options);

    return this;
  }

  onInvoke(provider: Provider, locals: Map<TokenProvider, any>, deps: any[]) {
    const settings = this.#settings.get(provider.type);

    if (settings?.onInvoke) {
      settings.onInvoke(provider, locals, deps);
    }
  }

  getRegistrySettings(target: string | TokenProvider): RegistrySettings {
    let type: string = "provider";

    if (typeof target === "string") {
      type = target;
    } else {
      const provider = this.get(target);
      if (provider) {
        type = provider.type;
      }
    }

    return (
      this.#settings.get(type) || {
        model: Provider
      }
    );
  }

  createRegisterFn(type: string) {
    return (provider: any | IProvider, instance?: any): void => {
      // istanbul ignore next
      if (!provider.provide) {
        provider = {
          provide: provider
        };
      }

      provider = Object.assign({instance}, provider, {type});
      this.merge(provider.provide, provider);
    };
  }

  createProvider(options: IProvider): Provider {
    const model = this.getProviderModel(options);
    const {provide, ...opts} = options;
    return new model(provide, opts);
  }

  protected getProviderModel(options: Partial<IProvider>) {
    const type = options.type || ProviderType.PROVIDER;
    const {model} = this.#settings.get(type) || {};

    if (model) {
      return model;
    }

    if (options.useAsyncFactory) {
      return AsyncFactoryProvider;
    }

    if (options.useFactory) {
      return FactoryProvider;
    }

    if ("useValue" in options) {
      return ValueProvider;
    }

    return Provider;
  }

  /**
   *
   * @param key
   * @param options
   */
  protected createIfNotExists(key: TokenProvider, options: Partial<IProvider>): Provider {
    if (!this.has(key)) {
      this.set(key, this.createProvider({...options, provide: key}));
    }

    return this.get(key)!;
  }
}

/**
 *
 * @type {GlobalProviders}
 */
// tslint:disable-next-line: variable-name
export const GlobalProviders = new GlobalProviderRegistry();

export function createProvider(options: IProvider) {
  return GlobalProviders.createProvider(options);
}
