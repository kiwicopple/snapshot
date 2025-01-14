import { Draft06 } from 'json-schema-library'

interface JsonSchema {
  [key: string]: any
}

export function generateJsonField(props: { schema: JsonSchema }) {
  const patchedSchema = patchSchema(props.schema)

  const jsonSchema = new Draft06(patchedSchema, {
    templateDefaultOptions: {
      // can be activated to generate values for optional properties
      addOptionalProps: true,
    },
  })

  const jsonTemplate = jsonSchema.getTemplate()

  return traverseJson([], jsonTemplate)
}

/**
 * Add `minItems: 1` to all array properties to generate one item element per array
 */
function patchSchema(schema: JsonSchema) {
  for (const key of Object.keys(schema)) {
    if (key === 'type' && schema[key] === 'array') {
      schema['minItems'] = 1
    }
    if (typeof schema[key] === 'object' && schema[key] !== null) {
      schema[key] = patchSchema(schema[key])
    }
  }
  return schema
}

function traverseJson(path: string[] = [], node: any): string {
  if (Array.isArray(node)) {
    return (
      '[' +
      node
        .map((item, index) => traverseJson([...path, index.toString()], item))
        .join(', ') +
      ']'
    )
  } else if (typeof node === 'object' && node !== null) {
    const properties = Object.entries(node).map(
      ([key, value]) => `'${key}': ${traverseJson([...path, key], value)}`
    )
    return `{${properties.join(', ')}}`
  } else {
    return getCopycatMethod(node, path)
  }
}

function getCopycatMethod(value: any, path: string[]): string {
  const pathString = `seed + "/${path.join('/')}"`
  switch (typeof value) {
    case 'string':
      return `copycat.word(${pathString})`
    case 'number':
      return `copycat.int(${pathString})`
    default:
      return `copycat.word(${pathString})`
  }
}
