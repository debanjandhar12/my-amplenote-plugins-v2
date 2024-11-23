import {ToolCardMessageWithResult} from "../components/ToolCardMessageWithResult.jsx";
import {ToolCardMessage} from "../components/ToolCardMessage.jsx";
import {Pinecone} from "../../pinecone/Pinecone.js";
import {createGenericReadTool} from "../tool-helpers/createGenericReadTool.jsx";

export const VectorSearchNotes = () => {
    return createGenericReadTool({
        toolName: "VectorSearchNotes",
        description: "Search text inside user notes",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search string",
                    minLength: 1
                }
            },
            required: ["query"]
        },
        triggerCondition: ({allUserMessages}) => JSON.stringify(allUserMessages).includes("@notes")
        || JSON.stringify(allUserMessages).includes("@all-tools"),
        renderInit: ({args, setFormData, appSettings}) => {
            return <ToolCardMessage text={`Searching for ${args.query} in pinecone...`}/>
        },
        onInit: async ({args, formData, setFormData, setFormState}) => {
            const pinecone = new Pinecone();
            const searchResults = await pinecone.search(args.query, appSettings, 4);
            setFormData({...formData, searchResults});
            setFormState('completed');
        },
        onCompleted: ({addResult, formData}) => {
            const {searchResults} = formData;
            addResult(`Search completed. Search Result: ${JSON.stringify(searchResults)}`);
        },
        renderCompleted: ({formData}) => {
            return <ToolCardMessageWithResult result={JSON.stringify(formData.searchResults)}
                                              text={`Pinecone search completed! ${formData.searchResults.length} results fetched.`}/>
        }
    });
};