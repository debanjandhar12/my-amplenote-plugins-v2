import {DeleteUserNotes} from "../../tools/DeleteUserNotes.jsx";
import {DeleteTasks} from "../../tools/DeleteTasks.jsx";
import {EditNoteContent} from "../../tools/EditNoteContent.jsx";
import {UpdateUserTasks} from "../../tools/UpdateUserTasks.jsx";
import {UpdateUserNotes} from "../../tools/UpdateUserNotes.jsx";
import {CreateNewNotes} from "../../tools/CreateNewNotes.jsx";
import {FetchNoteDetailByNoteUUID} from "../../tools/FetchNoteDetailByNoteUUID.jsx";
import {SearchNotesByTitleTagsContent} from "../../tools/SearchNotesByTitleTagsContent.jsx";
import {WebBrowser} from "../../tools/WebBrowser.jsx";
import {WebSearch} from "../../tools/WebSearch.jsx";
import {FetchUserTasks} from "../../tools/FetchUserTasks.jsx";
import {InsertTasksToNote} from "../../tools/InsertTasksToNote.jsx";
import {SearchHelpCenter} from "../../tools/SearchHelpCenter.jsx";

export class ToolRegistry {
    static tools = [];

    static registerAllTools() {
        ToolRegistry.tools = [InsertTasksToNote(), FetchUserTasks(), WebSearch(), WebBrowser(),
            CreateNewNotes(), FetchNoteDetailByNoteUUID(), SearchNotesByTitleTagsContent(),
            UpdateUserNotes(), UpdateUserTasks(),
            EditNoteContent(),
            // DeleteTasks(), // No api support for deleting task yet
            DeleteUserNotes(),
            SearchHelpCenter()];
    }

    static getTool(toolName) {
        return ToolRegistry.tools.find(tool => tool.toolName === toolName);
    }

    static getToolsByCategory(categoryName) {
        // Fake lastUserMessage and allUserMessages with category name and check if tool gets triggered
        const messageWithCategoryName = {
            message: '@'+categoryName,
        };
        return Object.values(ToolRegistry.tools).filter(tool => tool.unstable_tool.triggerCondition({
            lastUserMessage: messageWithCategoryName,
            allUserMessages: messageWithCategoryName
        }));
    }

    static getAllTools() {
        return ToolRegistry.tools;
    }
}