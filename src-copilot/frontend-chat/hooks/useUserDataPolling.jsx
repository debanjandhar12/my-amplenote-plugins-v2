export function useUserDataPolling() {
    const runtime = AssistantUI.useAssistantRuntime();
    React.useEffect(() => {
        const updateUserData = async () => {
            window.appConnector.getUserCurrentNoteData().then(async (userData) => {
                window.userData = {...window.userData, ...userData};
            });
            window.appConnector.getUserDailyJotNote().then(async (userData) => {
                window.userData = {...window.userData, ...userData};
            });
        }
        updateUserData();
        const intervalId = setInterval(() => updateUserData(), 4000);
        const unsubscribe = runtime.thread.subscribe(() => updateUserData());
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        }
    }, [runtime]);
}