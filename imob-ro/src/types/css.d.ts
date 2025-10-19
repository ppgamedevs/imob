declare module "*.css";
declare module "*.scss";

// Provide basic CSS module and at-rule shims for the TS language service and editor
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare namespace CSS {
  interface Properties {
    [key: string]: string | number | undefined;
  }
}

export {};
