import type { MessageQueue, ObjectStorage } from './products.ts';

// AbstractFactory: uma operação de criação por produto da família.
// Quem recebe uma CloudProviderFactory nunca mistura um storage da AWS com uma fila da Azure.
export interface CloudProviderFactory {
  createStorage(): ObjectStorage;
  createQueue(): MessageQueue;
}
