export const useToolFormState = (states, initialState = null, params = {}) => {
    const [formState, setFormState] = React.useState(initialState || Object.keys(states)[0]);
    const render = states[formState].renderer;

    React.useEffect(() => {
        if (!params.result && states[formState].eventHandler) {   // only run if result is not already set
            (async () => {
                try {
                    await states[formState].eventHandler({...params, formState, setFormState});
                } catch (e) {
                    console.error(e);
                    console.log('wtf');
                    const errorMessage = e.message || JSON.stringify(e) || e.toString();
                    params.setFormError(errorMessage);
                }
            })();
        }
    }, [formState]);

    React.useEffect(() => {
        if (params.formError && states['error']) {
            setFormState("error");
        }
    }, [params.formError]);

    return [formState, setFormState, render];
}
