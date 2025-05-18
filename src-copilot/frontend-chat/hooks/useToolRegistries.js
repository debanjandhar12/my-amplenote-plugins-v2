import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {errorToString} from "../helpers/errorToString.js";

export const useToolRegistries = () => {
    const [toolCategoryNames, setToolCategoryNames] = React.useState([]);
    const [tools, setTools] = React.useState([]);
    
    React.useEffect(() => {
        const initializeRegistries = async () => {
            try {
                await ToolRegistry.registerInbuiltTools();
                ToolCategoryRegistry.updateAllCategory();
                setToolCategoryNames(ToolCategoryRegistry.getAllCategoriesNames());
                setTools(ToolRegistry.getAllTools());
                await ToolRegistry.registerMCPTools();
                ToolCategoryRegistry.updateAllCategory();
                setToolCategoryNames(ToolCategoryRegistry.getAllCategoriesNames());
                setTools(ToolRegistry.getAllTools());
            } catch (e) {
                console.error("Failed to initialize tool registries:", e);
                appConnector.alert("Error: " + errorToString(e));
            }
        };
        initializeRegistries();
    }, []);
    
    return { toolCategoryNames, tools };
}; 