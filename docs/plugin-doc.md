# Plugin Creation

To create a plugin, you'll need a note that contains two things: a table of plugin information, and a code block containing the Javascript code of the plugin.

## Metadata Table

A plugin metadata table contains (at least) two columns: the name of the setting, and a value for the setting.

### Setting Name

The setting name is not case sensitive. All columns are interpreted as strings.

### Setting Value

The setting value is a string that is used to configure the plugin.

## Code Block

The first code block in the note will be used as the plugin's code. Any subsequent code blocks will be ignored. The plugin code should define a Javascript object.

### Functions

The plugin object can define functions that match the name of an action. These functions will register the plugin to handle that action.

### Variables

The plugin object can define variables that are used to store state.

## Example

```javascript
{
  insertText: function(app) {
    return "Hello World!";
  }
}
```

This plugin defines a single function `insertText` that returns the string "Hello World!".

## Actions

Plugin actions are the interaction points that define how a plugin's code gets called. Actions functions that return values can either return the value directly, or return a Promise that resolves to the value when ready. All action functions are passed an App Interface object as the first argument.

### App Interface

The App Interface provides the means of interacting with the application. It is passed to all plugin action functions as the first argument. All App Interface functions should be considered asynchronous, returning a Promise that will either resolve to the result, or reject if there is an error.

### Example

```javascript
{
  insertText: function(app) {
    return app.alert("Hello World!");
  }
}
```

This plugin defines a single function `insertText` that calls the `alert` function on the App Interface to display a message to the user.

## App Interface Functions

### app.addNoteTag

Add a tag to a note.

* Arguments:
	+ noteHandle: The note handle identifying the note to add the tag to.
	+ tag: The string text of the tag to add.
* Returns:
	+ boolean: Whether the tag was added.

### app.addTaskDomainNote

Ensure the specified note is included in the specified task domain.

* Arguments:
	+ taskDomainUUID: The task domain UUID.
	+ noteHandle: The note handle identifying the note to add to the task domain.
* Returns:
	+ boolean: Whether the note was added to the task domain.

### app.alert

Show the user a message.

* Arguments:
	+ message: The string to show the user.
	+ options: An optional object describing additional options.
* Returns:
	+ null: If the user dismisses the dialog.
	+ -1: If the user presses the "DONE" button.
	+ integer: The index of the action the user selected, or the value associated with the action.

### app.attachNoteMedia

Upload a media file, associating it with a the specified note.

* Arguments:
	+ noteHandle: The note handle describing the note to attach the media to.
	+ dataURL: A data URL describing the media file data.
* Returns:
	+ string: The URL of the uploaded media.

### app.context

Provides details about where the plugin action was invoked, and allows for interaction at that location.

* link: A link object describing properties of the link the plugin action was invoked from.
* noteUUID: The string UUID of the note the plugin action was invoked from.
* pluginUUID: The string UUID of the plugin itself.
* replaceSelection: Replaces the selection with markdown content.
* selectionContent: The markdown representation of the content that is currently selected.
* taskUUID: The string UUID of the task in question.
* updateImage: Updates image properties.
* updateLink: Updates link properties.

### app.createNote

Create a new note, optionally specifying a name and/or tags to apply.

* Arguments:
	+ name: The string name to give the new note.
	+ tags: An array of string tag names to apply to the new note.
* Returns:
	+ uuid: The uuid of the newly created note.

### app.deleteNote

Delete a note.

* Arguments:
	+ noteHandle: The note handle describing the note to delete.
* Returns:
	+ boolean: Whether the note exists such that it can be deleted.

### app.filterNotes

Find note handles for all notes matching a set of filter criteria.

* Arguments:
	+ options: An object describing filter parameters.
* Returns:
	+ array: An array of note handles for all notes that match the filter parameters.

### app.findNote

Returns a note handle identifying a note, with additional note metadata attributes populated, if the note is extant and not marked as deleted.

* Arguments:
	+ noteHandle: The note handle identifying the note to find.
* Returns:
	+ noteHandle: The note handle of the note, or null if the note does not exist or has been marked as deleted.

### app.getAttachmentURL

Given the UUID of an attachment, returns a temporary URL that can be used to access the attachment.

* Arguments:
	+ attachmentUUID: The string UUID identifying the attachment.
* Returns:
	+ string: The temporary URL that can be used to access the attachment.

### app.getNoteAttachments

Returns a list of attachments in the given note.

* Arguments:
	+ noteHandle: The note handle identifying the note to list attachments for.
* Returns:
	+ array: An array of attachment objects, or null if the note handle did not identify an existing note.

### app.getNoteBacklinks

Returns the list of notes that link to the specified note.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ array: An array of note handles identifying the notes that have links to the specified note.

### app.getNoteContent

Get the content of a note, as markdown.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ string: The content of the note, as markdown.

### app.getNoteImages

Get all the inline images in a note.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ array: An array of image objects.

### app.getNotePublicURL

Get a public URL for the note, if it has been published.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ string: The public URL for the note, or null if the note is not published.

### app.getNoteSections

Gets a list of the sections in a note.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ array: An array of section objects.

### app.getNoteTasks

Returns the tasks that are present in the specified note.

* Arguments:
	+ noteHandle: The note handle identifying the note.
	+ options: An object with the following optional properties:
		- includeDone: A boolean indicating whether completed and dismissed tasks in the note should be returned in addition to the un-done tasks.
* Returns:
	+ array: An array of task objects.

### app.getNoteURL

Returns a full URL for the specified note.

* Arguments:
	+ noteHandle: The note handle identifying the note.
* Returns:
	+ string: The URL of the note.

### app.getTask

Get the details of a single task.

* Arguments:
	+ taskUUID: The string UUID identifying the task.
* Returns:
	+ task: The task object, or null if no task with the given UUID exists.

### app.getTaskDomains

Get the list of configured Task Domains for the user.

* Arguments:
	+ None
* Returns:
	+ array: An array of task domains, each entry an object with the following properties:
		- name: The string display name of the Task Domain.
		- notes: An array of note handles, for each note in the Task Domain.
		- uuid: The string identifier that uniquely identifies the Task Domain.

## Example

```javascript
{
  appOption: async function(app) {
    const taskDomains = await app.getTaskDomains();
    const descriptions = taskDomains.map(({ name, notes }) => {
      return `${name} - ${notes.length} notes`;
    });
    app.alert(descriptions.join("\n"));
  }
}
```

This plugin defines a single function `appOption` that calls the `getTaskDomains` function on the App Interface to get the list of configured Task Domains for the user. It then maps over the task domains to create an array of descriptions, and calls the `alert` function on the App Interface to display the descriptions to the user.

## app.getTaskDomainTasks

Gets the list of tasks that belong to the given task domain.

### Arguments

* `taskDomainUUID`: String, the UUID of the task domain.

### Returns

* Array of task objects describing the tasks in the task domain.

## app.insertNoteContent

Inserts content into a note.

### Arguments

* `noteHandle`: Object, identifying the note to insert the text into.
* `content`: String, markdown-formatted content to insert.
* `options`: Object, additional options.

### Returns

* Nothing.

## app.insertTask

Inserts a new task at the beginning of a note.

### Arguments

* `noteHandle`: Object, identifying the note to insert the task into.
* `task`: Object, task object with attributes.

### Returns

* The UUID of the newly created task.

## app.navigate

Opens the app to the location corresponding to the given Amplenote app URL.

### Arguments

* `url`: String, an Amplenote URL.

### Returns

* Boolean indicating whether the given URL was a valid Amplenote URL and was navigated to.

## app.notes

The notes object provides an alternative way to interact with specific notes.

### Methods

#### app.notes.create

Create a new note.

##### Arguments

* `name`: String, the name to use as the new note's name.
* `tags`: Array of String, tag names to apply to the new note.

##### Returns

* Note interface object for the newly created note.

#### app.notes.dailyJot

Gets a note interface for the daily jot note on the day corresponding to the given timestamp.

##### Arguments

* `timestamp`: Number, unix timestamp (seconds) indicating any time on the day the daily jot note should be for.

##### Returns

* Note interface object for the daily jot note.

#### app.notes.filter

Find noteHandles for all notes matching a set of filter criteria.

##### Arguments

* `options`: Object, describing filter parameters.

##### Returns

* Array of noteHandles for all notes that match the filter parameters.

#### app.notes.find

Builds an object that allows you to more concisely call app.* functions for a specific note.

##### Arguments

* `uuid`: String, the UUID identifying the note.
* `noteHandle`: Object, identifying the note.

##### Returns

* Note interface object for the note, or null if the note does not exist or has been marked as deleted.

## app.openSidebarEmbed

Opens an embed for the plugin in the Peek Viewer.

### Arguments

* `aspectRatio`: Number, aspect ratio to use for embed.
* `args`: Arguments that will be passed to the plugin's renderEmbed action.

### Returns

* Boolean indicating whether the embed could be opened.

## app.prompt

Show the user a message and input fields.

### Arguments

* `message`: String, message to show the user.
* `options`: Object, additional options.

### Returns

* Null if the user selected "Cancel", or otherwise closed the dialog without pressing "Submit".
* String, the text the user entered.
* Array of values corresponding to value selected for each input.

## app.removeNoteTag

Removes a tag from a note.

### Arguments

* `noteHandle`: Object, identifying the note to add the tag to.
* `tag`: String, text of the tag to remove.

### Returns

* Boolean indicating whether the tag was removed.

## app.replaceNoteContent

Replace the entire content of a note with new content.

### Arguments

* `noteHandle`: Object, describing the note to replace content in.
* `content`: String, markdown-formatted content to replace with.
* `options`: Object, additional options.

### Returns

* Boolean indicating whether the replacement was performed.

## app.saveFile

Save a file.

### Arguments

* `file`: Blob/File object describing the content of the file.
* `filename`: String, filename to use for the file.

### Returns

* Promise that resolves when the request to save the file has been sent.

## app.setNoteName

Sets a new name for the given note.

### Arguments

* `noteHandle`: Object, describing the note to set the name of.
* `name`: String, new name for the note.

### Returns

* Boolean indicating whether the name could be changed.

## app.setSetting

Update the value of a single setting.

### Arguments

* `name`: String, setting name to update.
* `value`: String, new value for the setting.

### Returns

* Nothing.

## app.settings

An object containing the user-configured settings for the plugin.

## app.updateNoteImage

Update an image in a specific note.

### Arguments

* `noteHandle`: Object, identifying the note to update an image in.
* `image`: Object, identifying the image to update.
* `updates`: Object, describing the updates to the image.

### Returns

* Boolean indicating whether the image could be updated.

## app.updateTask

Update the properties or content of a single task.

### Arguments

* `taskUUID`: String, UUID identifying the task.
* `updates`: Object, containing updates to apply to the task.

### Returns

* Boolean indicating whether the task could be updated.

# Note Interface
=====================================

The note interface provides a more convenient way to interact with the app interface functions that operate on a specific noteHandle.

## note.addTag
---------------

Add a tag to the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const added = await note.addTag("some-tag");
  app.alert(added ? "Tag added" : "Failed to add tag");
}
```

## note.attachMedia
-----------------

Attach a media file (image or video) to the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const dataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPcsv/MfwAHrgNAOkBd9gAAAABJRU5ErkJggg==";
  const imageURL = await note.attachMedia(dataURL);
  app.alert(`ImageURL: ${imageURL}`);
}
```

## note.attachments
-----------------

Gets a list of attachments in the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const attachments = await note.attachments();
  await app.alert(`Note has ${attachments.length} attachments`);
}
```

## note.backlinks
----------------

Gets the list of notes that link to the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  let count = 0;
  for await (const referencingNoteHandle of note.backlinks()) {
    count++;
  }
  await app.alert(`Backlinks count: ${count}`);
}
```

## note.content
----------------

Get the content of the note, as markdown.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  app.alert(await note.content());
}
```

## note.delete
-------------

Delete the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  await note.delete();
}
```

## note.images
-------------

Get all inline images in the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const images = await note.images();
  await app.alert(`Image count: ${images.length}`);
}
```

## note.insertContent
------------------

Inserts content at the beginning of a note.

### Example

```javascript
noteOption(app, noteUUID) {
  const note = app.notes.find(noteUUID);
  note.insertContent("this is some **bold** text");
}
```

## note.insertTask
-----------------

Inserts a new task at the beginning of a note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const taskUUID = await note.insertTask({ content: "this is a task" });
  app.alert(taskUUID);
}
```

## note.name (title)
------------------

Get the title of the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  app.alert(`This note is named ${note.name}`);
}
```

## note.publicURL
-----------------

Get a link to the published version of a note, if the note is published.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const publicURL = await note.publicURL();
  await app.alert(`Public URL: ${publicURL || "none"}`);
}
```

## note.removeTag
-----------------

Remove a tag from the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const removed = await note.removeTag("some-tag");
  app.alert(removed ? "Tag removed" : "Failed to remove tag");
}
```

## note.replaceContent
-------------------

Replaces the content of the entire note, or a section of the note, with new content.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  await note.replaceContent("**new content**");
}
```

## note.sections
----------------

Gets the sections in the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const sections = await note.sections();
  app.alert(`Section count: ${sections.length}`);
}
```

## note.setName
----------------

Sets a new name for the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  await note.setName(note.name + " more");
}
```

## note.tags
-------------

Returns an Array of tags that are applied to the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const tags = note.tags;
  app.alert(`Note has ${tags.length} tags: ${tags.join(", ")}`);
}
```

## note.tasks
-------------

Gets the tasks in the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const tasks = await note.tasks();
  app.alert(`Note has ${tasks.length} tasks`);
}
```

## note.updateImage
------------------

Update a specific image in the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const images = await note.images();
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    await note.updateImage(image, { caption: "**new caption**" });
  }
}
```

## note.url
-------------

Returns the String URL of the note.

### Example

```javascript
async noteOption(app, noteUUID) {
  const note = await app.notes.find(noteUUID);
  const noteURL = await note.url();
  app.alert(`Note URL: ${noteURL}`);
}
```

## Loading browser builds

The simplest dependency to load is a library that has a browser build. This is a build that can normally be used in a `<script>` tag - in plugin code a `script` tag can be appended to the document to load the dependency.

For example, to load the RecordRTC library's browser build:

```javascript
_loadRecordRTC() {
  if (this._haveLoadedRecordRTC) return Promise.resolve(true);

  return new Promise(function(resolve) {
    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "https://www.WebRTC-Experiment.com/RecordRTC.js");
    script.addEventListener("load", function() {
      this._haveLoadedRecordRTC = true;
      resolve(true);
    });
    document.body.appendChild(script);
  });
}
```

A couple things to note in the above code:

*   The plugin execution context is kept loaded, so the dependency doesn't need to be loaded on every single call to the plugin - only the first call.
*   The library in question - RecordRTC - will be available as `window.RecordRTC` because it is packaged up as a browser build.

This can be used in the plugin's actions as:

```javascript
async insertText(app) {
  await this._loadRecordRTC();
  // ... remaining plugin code can reference `window.RecordRTC`
}
```

## Loading UMD builds

Dependencies that define UMD modules can be loaded with a small code shim:

```javascript
async _loadUMD(url, module = { exports: {} }) {
  const response = await fetch(url);
  const script = await response.text();
  const func = Function("module", "exports", script);
  func.call(module, module, module.exports);
  return module.exports;
}
```

Given a dependency that provides a UMD build, the above helper can be used as:

```javascript
async imageOption(app, image) {
  const metaPNG = await this._loadUMD("https://www.unpkg.com/meta-png@1.0.6/dist/meta-png.umd.js");
  // ... remaining plugin code can use `metaPNG.*`
}
```
