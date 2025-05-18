export function useIntervalPingPlugin(enabled = true) {
    React.useEffect(() => {
        if (!enabled) return;
        const intervalId = setInterval(() => {
            window.appConnector.ping();
        }, 300);
        window.appConnector.ping();
        return () => clearInterval(intervalId);
    }, [enabled]);
}