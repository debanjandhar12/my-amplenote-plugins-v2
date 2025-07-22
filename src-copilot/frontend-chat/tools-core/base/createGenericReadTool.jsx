import {ToolCardMessage} from "../../components/tools-ui/ToolCardMessage.jsx";
import {useGenericToolFormState} from "../../hooks/useGenericToolFormState.jsx";
import {errorToString} from "../../helpers/errorToString.js";
import {useGenericToolParameters} from "../../hooks/useGenericToolParameters.jsx";
import {ToolCardErrorMessage} from "../../components/tools-ui/ToolCardErrorMessage.jsx";

export const createGenericReadTool = ({
                                          toolName,
                                          description,
                                          parameters,
                                          category,
                                          onInit = ({setFormState}) => {},
                                          onCompleted = () => {},
                                          renderInit = () => {
                                              const { Spinner } = window.RadixUI;
                                              return <ToolCardMessage text={`Processing...`} icon={<Spinner />} />
                                          },
                                          renderCompleted = () => {},
                                          renderError = ({formError, toolName, args}) => {
                                              return <ToolCardErrorMessage toolName={toolName} input={args}
                                                  text={"Error: " + errorToString(formError)} color="red" />
                                          },
}) => {
    const tool = AssistantUI.makeAssistantToolUI({
        toolName,
        description,
        parameters,
        render: ({args, result, addResult, status, toolCallId}) => {
            const allParameters = useGenericToolParameters({
                toolName, toolCallId, description, parameters,
                args, status, result, addResult});

            const [formState, setFormState, formRender] = useGenericToolFormState({
                booting: {
                    eventHandler: null,
                    renderer: () => <>Booting {toolCallId}</>
                },
                init: {
                    eventHandler: onInit,
                    renderer: renderInit
                },
                completed: {
                    eventHandler: onCompleted,
                    renderer: renderCompleted
                },
                error: {
                    eventHandler: null,
                    renderer: renderError
                }
            }, allParameters);

            return formRender ? formRender({...allParameters, formState, setFormState}) : null;
        }
    });
    
    // Add category property to the tool
    if (category) {
        tool.unstable_tool.category = category;
    }
    
    return tool;
};