// ─── Plugin SDK — TypeScript interfaces for the LogistikApp Plugin System ────

/** Describes a single configuration field a plugin exposes to users. */
export interface PluginConfigField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[]; // only for type "select"
}

/** An event a plugin can subscribe to. */
export interface PluginEvent {
  name: string;
  label: string;
  description?: string;
}

/** Full manifest describing a plugin. */
export interface PluginManifest {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string; // tabler icon name, e.g. "IconFileImport"
  category: "import" | "export" | "integration" | "utility";
  events: PluginEvent[];
  configSchema: PluginConfigField[];
  webhookUrl?: string;
  isBuiltin?: boolean;
}

/** Context passed to a plugin during execution. */
export interface PluginExecutionContext {
  pluginId: string;
  organizationId: string;
  event: string;
  config: Record<string, unknown>;
  timestamp: string;
}

/** Result returned after plugin execution. */
export interface PluginExecutionResult {
  success: boolean;
  pluginId: string;
  event: string;
  statusCode?: number;
  message?: string;
  duration?: number;
}
