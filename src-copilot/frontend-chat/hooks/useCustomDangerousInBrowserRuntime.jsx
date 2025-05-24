import {errorToString} from "../helpers/errorToString.js";

export const useCustomDangerousInBrowserRuntime = (
    options
) => {
  const { localRuntimeOptions, otherOptions } = AssistantUIUtils.splitLocalRuntimeOptions(options);
  const [adapter] = React.useState(() => {
    const adapter = new AssistantUIUtils.DangerousInBrowserAdapter(otherOptions);
    const originalRun = adapter.run;
    adapter.run = async function* (...args) {
        try {
            for await (const chunk of originalRun.call(this, ...args)) {
                yield chunk;
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error(e);
                options.onError?.(e);
                yield {
                    "content": [{"type": "text", "text": "Error Occurred."}],
                    "status": {"type": "running"}
                };
            }
            throw e;
        }
    };
    return adapter;
  });
  return AssistantUI.useLocalRuntime(adapter, localRuntimeOptions);
};
