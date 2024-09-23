import { Static, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

export const GenericRecord = Type.Record(Type.String(), Type.Unknown());
export const GenericRecordCheck = TypeCompiler.Compile(GenericRecord).Check;
export type GenericRecordType = Static<typeof GenericRecord>;

export const GenericObject = Type.Object({}, { additionalProperties: true });
export const GenericObjectCheck = TypeCompiler.Compile(GenericObject).Check;
export type GenericObjectType = Static<typeof GenericObject>;

export const GenericArray = Type.Array(Type.Unknown());
export const GenericArrayCheck = TypeCompiler.Compile(GenericArray);
export type GenericArrayType = Static<typeof GenericArray>;
