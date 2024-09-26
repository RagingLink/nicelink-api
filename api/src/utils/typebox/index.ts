import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export const GenericRecord = Type.Record(Type.String(), Type.Unknown());
export type GenericRecordType = Static<typeof GenericRecord>;
export const GenericRecordTypeCheck = TypeCompiler.Compile(GenericRecord);

export const GenericObject = Type.Object({}, { additionalProperties: true });
export type GenericObjectType = Static<typeof GenericObject>;
export const GenericObjectTypeCheck = TypeCompiler.Compile(GenericObject);

export const GenericArray = Type.Array(Type.Unknown());
export type GenericArrayType = Static<typeof GenericArray>;
export const GenericArrayTypeCheck = TypeCompiler.Compile(GenericArray);
