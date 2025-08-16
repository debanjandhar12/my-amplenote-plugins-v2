export class SimplePdfAttachmentAdapter {
    accept = "application/pdf";

    async add(state) {
        return {
            id: state.file.name,
            type: "file",
            name: state.file.name,
            contentType: state.file.type,
            file: state.file,
            status: { type: "requires-action", reason: "composer-send" }
        };
    }

    async send(attachment) {
        return {
            ...attachment,
            status: { type: "complete" },
            content: [
                {
                    type: "file",
                    data: await getFileDataURL(attachment.file),
                    mimeType: attachment.contentType,
                },
            ],
        };
    }

    async remove() {
        // noop
    }
}

const getFileDataURL = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);

        reader.readAsDataURL(file);
    });