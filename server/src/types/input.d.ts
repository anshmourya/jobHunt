declare module "input" {
  /**
   * Get text input from the user
   */
  export function text(prompt: string): Promise<string>;

  /**
   * Get password input from the user (masked)
   */
  export function password(prompt: string): Promise<string>;

  /**
   * Get a single keypress from the user
   */
  export function key(prompt: string): Promise<string>;

  /**
   * Get a confirmation (yes/no) from the user
   */
  export function confirm(prompt: string): Promise<boolean>;

  /**
   * Get a selection from a list of options
   */
  export function select(prompt: string, choices: string[]): Promise<string>;

  export default {
    text,
    password,
    key,
    confirm,
    select,
  };
}
