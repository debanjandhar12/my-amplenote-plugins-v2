export const useDangerousInBrowserRuntimeMod = (
    options
) => {
  const { localRuntimeOptions, otherOptions } = AssistantUIUtils.splitLocalRuntimeOptions(options);
  const [adapter] = React.useState(() => {
    const adapter = new AssistantUIUtils.DangerousInBrowserAdapter(otherOptions);
    const originalRun = adapter.run;
    adapter.run = async function* (...args) {
        try {
            for await (const chunk of originalRun.call(this, ...args)) {
                console.log('chunk', args, chunk);
                yield chunk;
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.log(e);
                options.onError?.(this, e);
            }
            throw e;
        }
    };
    return adapter;
  });
  return AssistantUI.useLocalRuntime(adapter, localRuntimeOptions);
};
