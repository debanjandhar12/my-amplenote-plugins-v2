export function useIntervalPingPlugin() {
    React.useEffect(() => {
        const intervalId = setInterval(() => {
            window.appConnector.ping();
        }, 300);
        window.appConnector.ping();
        return () => clearInterval(intervalId);
    }, []);
}