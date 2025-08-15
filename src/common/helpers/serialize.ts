import { ClassConstructor, plainToInstance } from 'class-transformer';

export function serialize<T, V>(cls: ClassConstructor<T>, plain: V[]): T[];
export function serialize<T, V>(cls: ClassConstructor<T>, plain: V): T;
export function serialize<T, V>(cls: ClassConstructor<T>, plain: V | V[]) {
  return plainToInstance(cls, plain as any, { excludeExtraneousValues: true });
}

export function serializeMany<T, V>(cls: ClassConstructor<T>, plain: V[]): T[] {
  return plainToInstance(cls, plain as any, {
    excludeExtraneousValues: true,
  }) as T[];
}
