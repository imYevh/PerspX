import { writable } from 'svelte/store';

export interface EnvironmentState {
  sunElevation: number; // 0 to 90 degrees
}

export const environmentStore = writable<EnvironmentState>({
  sunElevation: 45
});
