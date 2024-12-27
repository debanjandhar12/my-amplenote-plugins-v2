export const useGenericToolFormState = (states, initialState = null, params = {}) => {
    const [formState, setFormState] = React.useState();
    const render = states[formState]?.renderer || (() => null);

    // TODO: Support tool streaming
    React.useEffect(() => {
        if (!formState && params.status.type === 'requires-action') {
            setFormState(initialState || Object.keys(states)[0]);
        }
    }, [params.args, params.status]);

    React.useEffect(() => {
        if (!formState) return;
        if (!params.result && states[formState].eventHandler) {   // only run if result is not already set
            (async () => {
                try {
                    window.dispatchEvent(new CustomEvent('onToolStateChange', {detail: formState}));
                    console.log('onToolStateChange', formState);
                    await states[formState].eventHandler({...params, formState, setFormState});
                } catch (e) {
                    console.error(e);
                    params.setFormError(e);
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
