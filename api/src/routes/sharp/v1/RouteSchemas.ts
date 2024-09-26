import { Type } from '@sinclair/typebox';

export const GetParamsSchema = Type.Object({ image: Type.String() });
export const GetResponseSchema = Type.Object({
    200: Type.Uint8Array(),
    404: Type.String(),
    500: Type.String()
});
