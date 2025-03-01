import {cleanObject, toMap, Type} from "@tsed/core";
import {OpenSpecHash, OpenSpecRef, OS2Schema, OS3Example, OS3Parameter, OS3Schema} from "@tsed/openspec";
import {JsonSchemaOptions} from "../interfaces/JsonSchemaOptions";
import {execMapper} from "../registries/JsonSchemaMapperContainer";
import {NestedGenerics, popGenerics} from "../utils/generics";
import {JsonMap} from "./JsonMap";
import {formatParameterType, isParameterType, JsonParameterTypes} from "./JsonParameterTypes";
import {JsonSchema} from "./JsonSchema";
import {createRefName} from "../utils/ref";

export class JsonParameter extends JsonMap<OS3Parameter<JsonSchema>> implements NestedGenerics {
  nestedGenerics: Type<any>[][] = [];
  groups: string[];
  $schema: JsonSchema;
  expression: string;

  getName() {
    const name = this.get("name");

    if (this.get("in") === "files") {
      return name.split(".")[0];
    }

    return name;
  }

  name(name: string): this {
    this.set("name", name);

    return this;
  }

  examples(examples: OpenSpecHash<OS3Example | OpenSpecRef>) {
    super.set("examples", examples);

    return this;
  }

  description(description: string): this {
    this.set("description", description);

    return this;
  }

  in(inType: string, expression: string | any = ""): this {
    this.set("in", formatParameterType(inType));
    this.expression = expression;

    return this;
  }

  required(required: boolean): this {
    this.set("required", required);

    return this;
  }

  schema(schema: JsonSchema): this {
    this.$schema = schema;

    return this;
  }

  toJSON(options: JsonSchemaOptions = {}) {
    if (!isParameterType(this.get("in"))) {
      return null;
    }

    const schemasContainer = toMap<string, OS2Schema | OS3Schema>(options.schemas || {});

    return this.build({...options, groups: this.groups}, schemasContainer);
  }

  private build(options: JsonSchemaOptions, schemasContainer: Map<string, OS3Schema | OS2Schema>) {
    const {type, schema, ...parameter} = super.toJSON(options);

    const jsonSchema = execMapper("item", this.$schema, {
      ...options,
      ...popGenerics(this)
    });

    parameter.required = parameter.required || this.get("in") === JsonParameterTypes.PATH;

    if (this.get("in") === JsonParameterTypes.FILES) {
      const schema = {
        type: "string",
        format: "binary",
        oneOf: undefined
      };

      if (jsonSchema.type === "array") {
        jsonSchema.items = cleanObject({
          ...jsonSchema.items,
          ...schema
        });

        parameter.schema = jsonSchema;
      } else {
        parameter.schema = cleanObject({
          ...jsonSchema,
          ...schema
        });
      }

      return parameter;
    }

    if (["query"].includes(this.get("in")) && jsonSchema.$ref) {
      if (!parameter.name) {
        return this.refToParameters(parameter, options, schemasContainer);
      }

      parameter.style = "deepObject";
    }

    parameter.schema = jsonSchema;

    return parameter;
  }

  private refToParameters(parameter: any, options: JsonSchemaOptions, schemasContainer: Map<string, OS3Schema | OS2Schema>) {
    const name = createRefName(this.$schema.getName(), options);
    const schema = options.schemas![name];

    if (options.schemas![name] && !schemasContainer.has(name)) {
      delete options.schemas![this.$schema.getName()];
    }

    return Object.entries(schema.properties || {}).reduce((params, [key, {description, ...prop}]: [string, any]) => {
      return [
        ...params,
        cleanObject({
          ...parameter,
          name: key,
          required: (schema.required || []).includes(key),
          description,
          schema: prop,
          style: prop.$ref ? "deepObject" : undefined
        })
      ];
    }, []);
  }
}
