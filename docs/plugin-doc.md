If you're interested in building plugins (even if only for your own use) and would be interested in a chance to influence the plugin system, feel free to email support@amplenote.com from the email address associated with your account. Feedback can be provided in the `#plugin-atelier` channel on our [discord](https://discord.gg/nAj4wp4sJm).

___

Amplenote provides support for client-side plugins that execute in the application on all platforms, allowing for enhancement of the default client behavior. A plugin is defined by a single note in a user's account - as the note is changed and updated, the plugin will be updated as well.

This document provides an overview of what plugins are capable of, and describes the available options for plugins. Related help pages that may be of use to plugin authors include:

This page is the most comprehensive reference guide of Plugin API functionality. Its sections are as follow:

___

## Plugin creation

To create a plugin, you'll need a note that contains two things: a table of plugin information, and a code block containing the Javascript code of the plugin.

![](https://images.amplenote.com/2ae961e0-bc5d-11ed-808b-e21efa2d8566/c7582134-fdf7-431e-9f7d-85d8f73c01dd.png)



## Metadata table

A plugin metadata table contains (at least) two columns: the name of the setting, and a value for the setting.

The setting name is not case sensitive. All columns are interpreted as strings.

### name

The only required setting is the `name` of the plugin, which can be defined as:

This is the name that the user will see when invoking the plugin, and will be used as a prefix in cases where the plugin defines multiple options presented to the user.

### icon

The name of a [Material Design Icon](https://fonts.google.com/icons?icon.set=Material+Icons) that will be used to identify the plugin. If not provided, a generic "extension" icon will be used.

### description

A short description shown when installing or configuring a plugin.

<table><tbody><tr><td data-column-index="0" data-row-index="0"></td><td data-background-color="cell-color-11" data-column-index="1" data-row-index="0"><div><p>Count the number of words in a note.</p></div></td></tr></tbody></table>

### instructions

More detailed information about using the plugin that will be shown if the plugin is published to the [Plugin Directory](https://www.amplenote.com/help/published_plugins_directory).

<table><tbody><tr><td data-column-index="0" data-row-index="0"></td><td data-background-color="cell-color-11" data-column-index="1" data-row-index="0"><div><p>Here are some helpful words of advice on using this plugin:<br>1. Instruction one<br>2. Instruction two<br>3. Instruction three</p></div></td></tr></tbody></table>

### setting

Defines settings that the user can provide to configure the plugin. The user will be able to supply a string for each setting when configuring the note as a plugin. When plugin code is invoked, it has access to the settings values that the user has provided. All setting values are provided as strings.

This setting name can be repeated multiple times to define multiple settings.

## Code

The first code block in the note will be used as the plugin's code. Any subsequent code blocks will be ignored. The plugin code should define a Javascript object. Any functions defined on this object that match the name of an [action](https://www.amplenote.com/help/developing_amplenote_plugins#Actions) will register the plugin to handle that action.

To define multiple actions for a single action type, make the action-named field an object. The keys should be the name of the action, with the corresponding function as the value.

Plugin actions can either be a function - as shown above - or an object with `run` and `check` keys with functions as the values (see [actions](https://www.amplenote.com/help/developing_amplenote_plugins#Actions) section for further explanation):

and:

When plugin code is invoked, the plugin object will be `this`, for example:

The plugin object will be instantiated when the plugin is installed in the client, retaining any state until it is reloaded (e.g. due to the plugin code being changed in the source note).

Plugin action functions (both `run` and `check`) can return promises, which will be awaited.

Or, they can use async/await syntax:

The first argument passed to a plugin action function is an application interface object that can be used to access settings and call into the host application itself.

### Accessing settings

Given a plugin with the following metadata table entry:

A plugin can access the setting through `app.settings`:

### Action function arguments

For action functions that receive arguments, the `app` argument will still be the first argument, before any other arguments:

When using `check` and `run` functions, they will receive the same arguments as the action would. So for the `linkOption` action, for example:

___

## Actions

Plugin actions are the interaction points that define how a plugin's code gets called. Actions functions that return values can either return the value directly, or return a Promise that resolves to the value when ready. All action functions are passed an [App Interface](https://www.amplenote.com/help/developing_amplenote_plugins#App_Interface) object as the first argument.

Each action can optionally define a `check` function that will be called before displaying the plugin to the user in the context of the specific action. The check function receives the same arguments as the plugin action (`run`) function, and returns a boolean indicating whether the plugin should be displayed or not. Returning a promise that resolves to the boolean is supported, and will show a loading indicator to the user in most cases. Note, however, that the user may no longer be viewing the plugin action context when an asynchronous check completed (e.g. if the user dismisses the menu the plugin action would be listed in).

## appOption

Adds app-wide options that can be invoked from the "jump to note" (web) or quick search (mobile app) dialogs.

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/188f9755-da0e-470e-8d40-e111f45d1cdf.png)



## dailyJotOption

Adds an option to the suggestions shown below today's daily jot note in jots mode, with a button to run the plugin action. Implementing a check function is advisable to conditionally show the option, otherwise it will always be shown to the user.

`noteHandle` [noteHandle](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) of the daily jot note that the option is being shown in

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/9da23331-2073-4ce7-8a01-0c515697142f.png)

To customize the text shown on the "Run" button, return a non-empty string from the plugin action's `check` function:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/d0d1f3ba-14bd-40cc-93c4-126473b31d01.png)



## eventOption

Adds an option to the popup menu shown for events (tasks and scheduled bullets) on the calendar.

`taskUUID` `String` identifier for the task or scheduled bullet the menu is being shown for.

## imageOption

Adds an option to the drop-down menu on each image in a note.

`image` [image](https://www.amplenote.com/help/developing_amplenote_plugins#image) object describing the selected image

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/99427c5b-e917-4372-b2e9-47d76ce75ae5.png)



## insertText

Called to insert text at a specific location in a note, when using an `{expression}`.

`String` new text to insert in the note in place of the `{expression}`

The auto-complete menu for expression will include any installed plugins:

![](https://images.amplenote.com/2ae961e0-bc5d-11ed-808b-e21efa2d8566/011fd085-edee-4650-a24c-97278fcac158.png)

The plugin's `insertText` action will be called to replace the `{Test Plugin}` expression, where "Test Plugin" is the configured plugin [name](https://www.amplenote.com/help/developing_amplenote_plugins#name).

To use a different keyword than the plugin's name, return a string from the `check` function:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/5001d613-ce83-4508-8040-e6bbba13ede1.png)



## linkOption

Adds a button to the Rich Footnote popup, shown when the cursor is in a specific link.

`link` [link](https://www.amplenote.com/help/developing_amplenote_plugins#link) object describing the link the action was triggered from

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/deac9f00-e496-4420-a0b0-8397a29bc87b.png)



## noteOption

Adds options to the per-note menu, shown when editing a specific note.

`noteUUID` the UUID of the note that the menu option was invoked in

![](https://images.amplenote.com/2ae961e0-bc5d-11ed-808b-e21efa2d8566/3ae0c6a7-1147-4453-afe9-303eb00613fb.png)



## onEmbedCall

Called when code running in an embed that was rendered by this plugin (see [`renderEmbed`](https://www.amplenote.com/help/developing_amplenote_plugins#renderEmbed)) calls `window.callAmplenotePlugin`.

`...args` any arguments passed to `window.callAmplenotePlugin` - note that these arguments are serialized to JSON then deserialized to Javascript values, so they should be able to round-trip through a JSON serialize/deserialize.

Any Javascript value that can be serialized as JSON, which will be deserialized before it is resolved as the result of the promise returned by `window.callAmplenotePlugin` in the embed.

See [calling the plugin from the embed](https://www.amplenote.com/help/developing_amplenote_plugins#Calling_the_plugin_from_the_embed) for a more detailed example.

## renderEmbed

Called when an embed assigned to the plugin needs to render HTML. Embeds are HTML documents loaded in an isolated iFrame that does not have access to the outer application, and operates with relaxes CSP rules compared to the outer application. Once rendered, an embed will stay loaded / running until the user navigates away from the note containing the embed or closes the Peek Viewer (for sidebar embeds).

`...args` any additional arguments passed to [`app.openSidebarEmbed`](https://www.amplenote.com/help/developing_amplenote_plugins#app.openSidebarEmbed). For embeds inline in note content, no additional arguments can be passed.

`String` of HTML that will be loaded in the embed

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/8dcb94e1-ca68-4c9f-af6e-a34708c1fb03.png)



### Inserting embeds in notes

Embeds are supported in markdown as `<object>` HTML tags with a specific protocol specified in the `data` attribute. To insert an embed in a specific location in a note, an [`insertText`](https://www.amplenote.com/help/developing_amplenote_plugins#insertText) action can be used:

By default, plugin embeds render in a fixed 1:1 aspect ratio (width == height). An aspect ratio can be supplied in the `data-aspect-ratio` attribute, as shown in the code above, dictating the desired width/height for the embed.

Alternatively, any `app` call that can receive markdown can be used to add embeds to note content. Note that embeds aren't valid in all locations (e.g. they can't be inserted in tasks), so the embed object might be placed after a task if it is included in the body of the task, or dropped in cases where there isn't a valid insertion position nearby.

### Calling the plugin from the embed

The code running in the embed can call out to the plugin itself, and the plugin code can return values back to the embed from this call. Within the embed itself, a call can be made to the controlling plugin (the plugin that `renderEmbed` was called on) by using `window.callAmplenotePlugin`:

Any arguments will be passed to the plugin's [`onEmbedCall`](https://www.amplenote.com/help/developing_amplenote_plugins#onEmbedCall) after the `app` argument.

Putting together `onEmbedCall` and `window.callAmplenotePlugin`, we can implement a basic plugin that renders an embed with a button. When the button is clicked, the embed calls into the plugin to show the user a prompt, returning the result to the embed:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/f2ff1507-0b95-436f-9fb1-3ec1d8e6667a.png)

Upon clicking the "call host" button:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/9cd1936e-5d0b-4732-ae88-aa309918ccdf.png)

After clicking "submit":

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/3c9861e2-9fdf-4767-8220-1e36da4f2695.png)



## replaceText

Called to replace some highlighted text, invoked via the selection menu.

`text` the `String` of selected text

`String` new text to replace the selected text with

`null` to cancel the replacement. Note that the replacement will also be cancelled if the user changes the selection before this action returns a value.

![](https://images.amplenote.com/2ae961e0-bc5d-11ed-808b-e21efa2d8566/06f99dcf-1a52-4093-9f7b-8ab762174e55.png)

To use a different keyword than the plugin's name, return a string from the `check` function:

This code will result in the returned `check` function text being displayed to the user:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/9f580c1e-57f3-4ec5-b907-ff520f19f8de.png)



## taskOption

Adds options to the task commands menu (invoked when typing `!` in the body of a task).

[`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) the task the option was invoked on

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/18f9018d-61d0-49fa-82cc-9abe417b377a.png)



___

## App Interface

The app interface provides the means of interacting with the application. It is passed to all plugin action functions as the first argument. All app interface functions should be considered asynchronous, returning a `Promise` that will either resolve to the result, or reject if there is an error.

## app.addNoteTag

Add a tag to a note.

`String` text of the tag to add - note that this will be normalized to conform to allowed tag names (lowercase, dashes), if it is not a valid tag name

`boolean` indicating whether the tag was added. In some cases, shared tags cannot be added to notes - and this will return `false`.

If the given tag argument is not a string

## app.alert

Show the user a message. The name of the plugin is shown in the title of the dialog. Similar to `app.prompt`, except that this doesn't offer inputs, and instead offers "actions", which are buttons the user can pick at the bottom of the notification.

`message` the `String` to show the user. Use "\\n" to output new lines. Unicode characters are supported. Markdown is not (yet).

(optional) `object` describing additional options, containing any of the following properties:

`actions` optional `Array` of action objects that will be added as buttons on the dialog. Each action object can have the following properties:

`icon` optional `String` name of a [Material Icon](https://fonts.google.com/icons?icon.set=Material+Icons) to show on the button

`label` the `String` text to show on the button

`value` optional value (of any basic JS type) that will be returned when the action is triggered, instead of the index in the actions array

`primaryAction` an object describing the presentation of the rightmost button on the dialog (the "DONE" button), with the following properties:

`icon` optional `String` name of a [Material Icon](https://fonts.google.com/icons?icon.set=Material+Icons) to show on the button

`label` the `String` text to show on the button

`scrollToEnd` a `boolean` indicating whether the message shown to the user should be scrolled down so the end is visible, if it is long enough that the alert dialog has a scrollbar

`null` if the user dismisses the dialog

`-1` if the user presses the "DONE" button (or the `primaryAction` button, if supplied)

If `options.actions` is provided:

The integer index corresponding to the action the user selected, or - if the selected action includes a `value` key, the value associated with the `value` key.

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/1facb8f0-33ae-4abc-98d3-9b3aae94d44c.png)



![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/2a4d7d14-a28d-4051-a444-f26725038f15.png)



## app.attachNoteMedia

Upload a media file, associating it with a the specified note. This function uploads the file directly, so the user must be online for it to work, and it may take a long time, depending on the size of the media and connectivity.

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) describing the note to attach the media to

`dataURL` a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs) describing the media file data

`String` URL of uploaded media

If the media file is too large, or otherwise not allowed

If there are network errors that prevent upload

## app.context

Provides details about where the plugin action was invoked, and allows for interaction at that location.

### app.context.link

[link](https://www.amplenote.com/help/developing_amplenote_plugins#link) object describing properties of the link the plugin action was invoked from, e.g. for `insertText` or `replaceText` actions. Will be undefined if the plugin action was not invoked from a context where the selection is in a link.

### app.context.noteUUID

The `String` UUID of the note the plugin action was invoked from. This will include the note UUID that a task is in when invoking an action (e.g. `insertText` or `replaceText`) in the tasks view, or other editable task lists.

### app.context.pluginUUID

The `String` UUID of the plugin itself - this is the note UUID of the plugin note.

### app.context.replaceSelection

Replaces the selection with [markdown content](https://www.amplenote.com/help/developing_amplenote_plugins#Markdown_content). This function will not be present for plugin actions that are not invoked with a user selection/cursor placed in a note - i.e. it is only defined for `insertText` and `replaceText` plugin actions. Note that the user can navigate away from a note while a plugin action is executing, in which case, calling this function is not guaranteed to do anything.

`String` of markdown content to replace the selection with

`boolean` indicating if the given markdown content replaced the selection. Returns `false` if the selection has been completely removed from the note, or if the markdown content can't be inserted at the current location (e.g. a table in a task).

If the context in which the selection existed is no longer available, e.g. the note is completely closed

### app.context.selectionContent

When invoked from an editor context, the [markdown representation](https://www.amplenote.com/help/developing_amplenote_plugins#Appendix_III:_Markdown_content) of the content that is currently selected.

### app.context.taskUUID

If the plugin action was invoked from a position in a task, this will be the `String` UUID of the task in question.

### app.context.updateImage

If the plugin action was invoked on an image (i.e. `imageOption` actions), can be called to update [image](https://www.amplenote.com/help/developing_amplenote_plugins#image) properties.

### app.context.updateLink

If the plugin action was invoked in a link, can be called to update [link](https://www.amplenote.com/help/developing_amplenote_plugins#link) properties.

## app.createNote

Create a new note, optionally specifying a name and/or tags to apply.

`name` - optional `String` name to give the new note

`tags` - optional `Array` of `String` tag names to apply to the new note

`uuid` of the newly created note. This is typically a `local-`prefixed UUID that may change once persisted to the remote servers, but can continue to be used on the same client to identify the note. Calling [`app.findNote`](https://www.amplenote.com/help/developing_amplenote_plugins#app.findNote) with this `uuid` will return a [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) with a non-local-prefixed UUID if the note has since completed persistence.

## app.deleteNote

Delete a note. Users can restore deleted notes for 30 days after they are first deleted.

`Boolean` indicating whether the note described by the `noteHandle` exists such that it can be deleted.

## app.filterNotes

Find [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s for all notes matching a set of filter criteria.

(optional) object describing filter parameters, containing any of the following properties:

`group` - filter group to apply. This corresponds to the `group=` query string parameter when viewing https://www.amplenote.com/notes and filtering on a specific group or set of groups. Multiple groups can be specified with a `,` separator.

`query` - `String` fuzzy search term to filter matching notes on. Note that this is not full-text search, and matches the behavior of not suggestion UI that matches on note names.

`tag` - tag filter to apply. This corresponds to the `tag=` query string parameter when viewing https://www.amplenote.com/notes and filtering on a specific tag or set of tags. Multiple tags can be specified with a `,` separator - matching notes must have all specified tags. A tag prefixed with `^` will only match notes that do not have the tag.

`{ tag: "daily-jots,todo" }` - matches notes that have the `daily-jots` tag and the `todo` tag.

`{ tag: "daily-jots,^todo/next" }` - matches notes that have the `daily-jots` tag and do not have the `todo/next` tag.

An array of [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s for all notes that match the filter parameters.

## app.findNote

Finds the [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) of a note, if the note is extant and not marked as deleted. In addition to verifying whether a note exists, this can be used to fill in some additional details for a note, e.g. if the plugin only has a `noteUUID` it can call this to get the name and tags applied to the note.

object identifying the note to find, with the following properties:

`uuid` the UUID identifying a specific note, if provided, will be used regardless of other properties

`name` `String` name of the note to find. If `uuid` is not provided, this must be supplied.

`tags` optional `Array` of tag filter `String`s that the note must match, in addition to the `name`. Each array entry can be the name of a tag e.g. `[ "some-tag" ]` or can include a negation operator to only match notes that _don't_ have that tag, e.g. `[ "^not-this-tag" ]`

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) of the note, or `null` if the note does not exist or has been marked as deleted

## app.getNoteBacklinks

Returns the list of notes that link to the specified note.

Array of [noteHandle](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s identifying the notes that have links to the specified note

## app.getNoteContent

Get the content of a note, as markdown.

The content of the note, as markdown.

## app.getNoteImages

Get all the inline images in a note (does not include images in Rich Footnotes).

## app.getNotePublicURL

Get a public URL for the note, if it has been published. Note that this call requires internet connectivity.

`String` URL for the published note, or `null` if the note is not published

If a request to the server fails, e.g. if the client is offline

## app.getNoteSections

Gets a list of the [`section`s](https://www.amplenote.com/help/developing_amplenote_plugins#section) in a note. Sections are areas of the note delimited by either a heading or a horizontal rule. Sections are identified by the heading (if any) that opens the section, and when relevant, an index to disambiguate between multiple sections with matching headings.

An `Array` of the [`section`s](https://www.amplenote.com/help/developing_amplenote_plugins#section) the note is comprised of

## app.getNoteTasks

Returns the tasks that are present in the specified note.

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) identifying the note to get tasks from. If the note handle identifies a note that does not yet exist, the note will _not_ be created.

options object, with the following optional properties:

`includeDone` - `boolean` indicating whether completed and dismissed tasks in the note should be returned in addition to the un-done tasks. Defaults to `false`.

## app.getNoteURL

Returns a full URL for the specified note. This URL can be used to link to the note (and will be detected as a note link in Amplenote editors/views), and can be used to open the note via [app.navigate](https://www.amplenote.com/help/developing_amplenote_plugins#app.navigate).

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)identifying the note to get the URL of. If the note handle is for a note that does not yet exist, the note will be created.

## app.getTask

Get the details of a single task.

UUID `String` identifying the task

[`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) object, or `null` if no task with the given UUID exists

## app.getTaskDomains

Get the list of configured Task Domains for the user.

`Array` of task domains, each entry an object with the following properties:

`name` the `String` display name of the Task Domain

`notes` an `Array` of [noteHandle](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s, for each note in the Task Domain. This includes notes that are part of the Task Domain due to the tags applied to the note, notes that have been individually specified to be part of the Task Domain, and - for legacy Task Domains - potentially all notes.

`uuid` the `String` identifier that uniquely identifies the Task Domain

## app.getTaskDomainTasks

Gets the list of tasks that belong to the given task domain. Note that this includes tasks that are not scheduled (on the calendar).

`Array` of [`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) objects describing the tasks in the task domain

Note that this function can return a large amount of data, so it's highly recommended to use an async iterator to reduce the potential for performance impact.

## app.insertNoteContent

Inserts content into a note.

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) identifying the note to insert the text into

(optional) `object` of additional options, with the following properties:

`atEnd` `boolean` indicating that content should be inserted at the end of the note. Defaults to `false`.

If markdown content is over 100k characters

If the target note is readonly

## app.insertTask

Inserts a new task at the beginning of a note. See also: [note.insertTask](https://www.amplenote.com/help/developing_amplenote_plugins#note.insertTask).

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) identifying the note to insert the task into

[`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) object, with the following attributes (all are optional):

`hideUntil`: `Number` a unix timestamp (seconds) to use for the "Hide until" time

`startAt`: `Number` a unix timestamp (seconds) to use for the "Start at" time

The UUID of the newly created task

If the provided `content` is not valid in a task (e.g. `- a bullet list item`)

If note is readonly/locked

## app.navigate

Opens the app to the location corresponding tot he given Amplenote app URL. Amplenote app URLs start with `https://www.amplenote.com/notes`. Examples:

Jots area: `"https://www.amplenote.com/notes/jots"`

Notes area: `"https://www.amplenote.com/notes"`

Notes list filtered to a tag: `"https://www.amplenote.com/notes?tag=some-tag"`

Jots area on a specific tag: `https://www.amplenote.com/notes/jots?tag=some-tag`

A specific note: `"https://www.amplenote.com/notes/NOTE_UUID"` (replacing `NOTE_UUID` with a specific note's UUID).

`url` an Amplenote URL `string`

`true` if the given `url` was a valid Amplenote URL and was navigated to, `false` otherwise

## app.notes

The `notes` object provides an alternative - and simpler - way to interact with specific notes. Depending on the purpose, it may be preferable than the [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)\-based functions available on the main app interface. Functions on the `notes` object return [Note interface](https://www.amplenote.com/help/developing_amplenote_plugins#Note_interface) objects. As with [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s, a note interface object may represent a note that does not (yet) exist. Calling any note interface function that requires an extant note will create the note first, if it doesn't already exist.

### app.notes.create

Create a new note. This is an alternative interface to [app.createNote](https://www.amplenote.com/help/developing_amplenote_plugins#app.createNote).

`name` the `String` to use as the new note's name

`tags` an `Array` of `String` tag names to apply to the new note

### app.notes.dailyJot

Gets a note interface for the daily jot note on the day corresponding to the given timestamp.

`timestamp` unix timestamp `Number` (seconds) indicating any time on the day the daily jot note should be for

### app.notes.filter

Find [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s for all notes matching a set of filter criteria. This is an alternative interface to [app.filterNotes](https://www.amplenote.com/help/developing_amplenote_plugins#app.filterNotes).

(optional) object describing filter parameters, containing any of the following properties:

`group` - filter group to apply. This corresponds to the `group=` query string parameter when viewing https://www.amplenote.com/notes and filtering on a specific group or set of groups. Multiple groups can be specified with a `,` separator.

`{ group: "taskList,archived" }`

`tag` - tag filter to apply. This corresponds to the `tag=` query string parameter when viewing https://www.amplenote.com/notes and filtering on a specific tag or set of tags. Multiple tags can be specified with a `,` separator - matching notes must have all specified tags. A tag prefixed with `^` will only match notes that do not have the tag.

`{ tag: "daily-jots,todo" }` - matches notes that have the `daily-jots` tag and the `todo` tag.

`{ tag: "daily-jots,^todo/next" }` - matches notes that have the `daily-jots` tag and do not have the `todo/next` tag.

An array of [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s for all notes that match the filter parameters.

### app.notes.find

Find a specific note. This is an alternative interface to [app.findNote](https://www.amplenote.com/help/developing_amplenote_plugins#app.findNote).

`uuid` the `String` UUID identifying the note

[Note interface](https://www.amplenote.com/help/developing_amplenote_plugins#Note_interface) object for the note, or `null` if the note does not exist or has been marked as deleted

## app.openSidebarEmbed

Opens an embed for the plugin (see [`renderEmbed`](https://www.amplenote.com/help/developing_amplenote_plugins#renderEmbed)) in the Peek Viewer, if it is available for the user. If the plugin has already opened a sidebar embed, the existing sidebar embed will be re-rendered by calling [`renderEmbed`](https://www.amplenote.com/help/developing_amplenote_plugins#renderEmbed) again with the latest passed `args`.

`Number` aspect ratio to use for embed. Embeds are fully isolated from the hosting application, so they can't be sized dynamically based on the content of the embed (content in the embed is not accessible to the hosting application). Instead, an aspect ratio is supplied here that will be maintained in the embed.

`...args` arguments that will be passed to the plugin's `renderEmbed` action

`Boolean` indicating whether the embed could be opened. Will return `false` in the mobile app, where there is no Peek Viewer.

Invoking from quick open (via `appOption`):

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/4fc7ac45-540a-4a80-b7bc-8499dfcc78eb.png)

Rendered in Peek Viewer, after selecting plugin in quick open:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/4f53f093-f4df-44a2-a5cc-8f43863309ce.png)

See [`renderEmbed`](https://www.amplenote.com/help/developing_amplenote_plugins#renderEmbed) for examples of communicating between an embed and the plugin that rendered it.

## app.prompt

Show the user a message and input fields - defaulting to a single text input - receiving the user-selected/user-entered value(s). Similar to `app.alert`, except that this allows options to be presented in a dialog, and does not allow multiple buttons at the bottom of the window, like `app.alert` does.

`message` `String` to show the user. New lines can be inserted with `\n`. Unicode characters are supported in output. Markdown isn't supported...yet.

(optional) `object` describing additional options, containing any of the following properties:

`inputs` an optional `Array` of input objects describing the input fields to show. If not provided, a single text input field will be shown (equivalent to `inputs: [ { type: "text" } ]`).

`input` object, with the following properties:

`limit` a `Number` to use as the maximum number of tags that can be selected in a `type: "tags"` input. If omitted, defaults to `1`

`options` `Array` of options to use in a `type: "select"` [drop-down input](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/813918ec-d8e2-4d4d-9de2-1f9bb1235b32.png) or `type: "radio"` input each option an object with the following properties:

`label` the `String` to show as a label on the input field

`value` the value corresponding to the option. Will be returned as the result (verbatim) when the user selects the option.

`image` a `String` URL of an image to show with the option. Only used in `type: "radio"` inputs.

`type` `String` one of the following values:

`"checkbox"` a check box field

`"note"` a field to select a single note from the user's notes list

`"radio"` a set of radio buttons to select one option from. When specified, the `options` property should also be provided.

`"secureText"` a short text field that masks the displayed characters like a password field.

`"select"` a drop-down select field. When specified, the `options` property should also be provided.

`"string"` a single line text input field

`"tags"` an auto-complete field for the user's tags, in which a single tag can be selected by default, or more can be selected by providing a `limit` value.

`"text"` a multi-line text area field

`value` the initial value for the input. If the user does not change the input, submitting the prompt will use this value. Note that the value must match the `value` field in one of the options for `type: "radio"` and `type: "select"` inputs, or it will be ignored.

`actions` optional `Array` of action objects that will be added as buttons on the dialog. Each action object can have the following properties:

`icon` optional `String` name of a [Material Icon](https://fonts.google.com/icons?icon.set=Material+Icons) to show on the button

`label` the `String` text to show on the button

`value` optional value (of any basic JS type) that will be returned when the action is triggered, instead of the index in the actions array

`null` if the user selected "Cancel", or otherwise closed the dialog without pressing "Submit"

If no `inputs` or `actions` options are provided

The `String` text the user entered

If a single `inputs` option and no `actions` are provided, one of:

The `String` text the user entered for a `type: "text"` or `type: "string"` input

The `String` tag text the user selected for a `type: "tags"` input. If multiple tags are selected, they will be joined with a `,` to produce a single string.

The value corresponding to the `option.value` the user selected in a `type: "radio"` input

The `Bool` value corresponding to the user's selection for a `type: "checkbox"` input

The [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) of the selected note for a `type: "note"` input

The value corresponding to the `value` field of the selected `type: "select"` option

If multiple `inputs` are provided, an `Array` of values corresponding to value selected for each input (in the same order they were specified), followed by a single entry corresponding to the `actions` entry that the user selected, or `-1` if the user pressed the default "Submit" button.

![](https://images.amplenote.com/2ae961e0-bc5d-11ed-808b-e21efa2d8566/13b30929-c82f-48e1-86e1-8d4642b59e3b.png)



![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/be4385e1-2902-4fc9-a8d9-43ddff8f1dea.png)

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/f12cae67-340a-4886-90b5-af10d1b06a12.png)



![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/9d1fba7c-a047-403e-b7d9-e60f579ca917.png)



## app.removeNoteTag

Removes a tag from a note.

`String` text of the tag to remove

`boolean` indicating whether the tag was removed. In some cases, shared tags cannot be removed from notes - and this will return `false`. Note that this will return `true` even if the note did not have the tag - only a failure to remove a tag will result in `false`.

If the given tag argument is not a string

## app.replaceNoteContent

Replace the entire content of a note with new content, or replace the content of a single section of the note (see [app.getNoteSections](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteSections)for discussion of sections).

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) describing the note to replace content in

(optional) `object` of additional options, supporting the following properties

[`section`](https://www.amplenote.com/help/developing_amplenote_plugins#section) `object` describing the section of the note to replace content in. For sections that start with a heading, the heading will not be replaced, only the _content_ of the section.

`bool` indicating whether the replacement was performed. Note that the only failure state for a replacement is when a `section` is specified and that section is not found in the note.

If markdown content is over 100k characters

If the target note is readonly

With a section:

## app.saveFile

Save a file.

The `Blob`/ `File` object describing the content of the file

`String` filename to use for the file

A promise that resolves when the request to save the file has been sent. Note that the user may see a prompt to accept/name/save the file, in which case this will resolve as soon as the request has been displayed to the user - it does not wait for the user to actually save the file.

## app.setNoteName

Sets a new name for the given note.

`String` new `name` for the note

`Boolean` indicating whether the name could be changed. Generally, the only failure case is if the note handle doesn't identify an extant note.

If the `name` argument is not a string

## app.setSetting

Update the value of a single [setting](https://www.amplenote.com/help/developing_amplenote_plugins#app.settings). The value will be synchronized to all of the user's devices. Note that the updated value is not guaranteed to be updated in `app.settings` before the next invocation of a plugin function (check or run).

`String` setting name to update, or add

`String` new value for the setting. Any non-string values (with the exception of `null`) will be converted to strings.

## app.settings

An object containing the user-configured settings for the plugin. All values will be strings.

This will insert the string the user has entered for "Some setting", assuming the plugin metadata table includes:

## app.updateNoteImage

Update an image in a specific note.

[`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) identifying the note to update an image in

[`image`](https://www.amplenote.com/help/developing_amplenote_plugins#image) identifying the image to update - only the `index` and `src` keys are necessary

`object` describing the updates to the image, which can contain the properties described in by [`image`](https://www.amplenote.com/help/developing_amplenote_plugins#image), with the exception of the `index` property

`boolean` indicating whether the image could be updated

If the given markdown is not valid in an image caption

## app.updateTask

Update the properties or content of a single task.

`String` UUID identifying the task

object containing (optional) updates to apply to the task. All properties listed for a [`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) are supported, _except_ the `uuid`

`boolean` indicating whether the task could be updated. If the given task UUID doesn't correspond to any existing task, will return `false`

___

## Note interface

The note interface provides a more convenient way to interact with the app interface functions that operate on a specific [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle). Note that - like a [`noteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle) - the note described by the note interface may or may not exist. Calling functions that modify the note content will create the note if it doesn't already exist.

## note.addTag

Add a tag to the note. See [app.addNoteTag](https://www.amplenote.com/help/developing_amplenote_plugins#app.addNoteTag) for details.

## note.attachMedia

Attach a media file (image or video) to the note. See [app.attachNoteMedia](https://www.amplenote.com/help/developing_amplenote_plugins#app.attachNoteMedia) for more details.

## note.backlinks

Gets the list of notes that link to the note. See [app.getNoteBacklinks](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteBacklinks) for details.

## note.content

Get the content of the note, as markdown. See [app.getNoteContent](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteContent) for more details.

## note.delete

Delete the note. See [app.deleteNote](https://www.amplenote.com/help/developing_amplenote_plugins#app.deleteNote) for more details.

## note.images

Get all inline images in the note. See [app.getNoteImages](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteImages) for more details..

## note.insertContent

Inserts content at the beginning of a note. See [app.insertNoteContent](https://www.amplenote.com/help/developing_amplenote_plugins#app.insertNoteContent) for more details.

## note.insertTask

Inserts a new task at the beginning of a note. See [app.insertTask](https://www.amplenote.com/help/developing_amplenote_plugins#app.insertTask) for more details.

## note.name (title)

Get the title of the note.

## note.publicURL

Get a link to the published version of a note, if the note is published. See [app.getNotePublicURL](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNotePublicURL) for details.

## note.removeTag

Remove a tag from the note. See [app.removeNoteTag](https://www.amplenote.com/help/developing_amplenote_plugins#app.removeNoteTag) for details.

## note.replaceContent

Replaces the content of the entire note, or a section of the note, with new content. See [app.replaceNoteContent](https://www.amplenote.com/help/developing_amplenote_plugins#app.replaceNoteContent) for more details.

## note.sections

Gets the sections in the note. See [app.getNoteSections](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteSections) for more details.

## note.setName

Sets a new name for the note. See [app.setNoteName](https://www.amplenote.com/help/developing_amplenote_plugins#app.setNoteName) for more details.

## note.tags

Returns an Array of tags that are applied to the note.

## note.tasks

Gets the tasks in the note. See [app.getNoteTasks](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteTasks) for more details.

## note.updateImage

Update a specific image in the note. See [app.context.updateImage](https://www.amplenote.com/help/developing_amplenote_plugins#app.context.updateImage) for more details.

## note.url

Returns the `String` URL of the note. See [app.getNoteURL](https://www.amplenote.com/help/developing_amplenote_plugins#app.getNoteURL) for more details.

## Appendix I: Types

___

## image

Describes an image displayed inline in a note. `image` objects can have the following properties:

`caption` markdown `String` describing the content of the image caption

`index` when there are multiple images in a note with the same `src` value, the index can be used to disambiguate between the images. This property can not be updated.

`src` the `String` source URL of the image

`text` the `String` of OCR text recognized in the image

`width` optional `Integer` value that is the pixel width the image will be displayed at. The height is set matching the image aspect ratio.

## link

Describes a link, which may include Rich Footnote content. `link` objects have the following properties:

`description` markdown `String` describing the content of the link's Rich Footnote content. Note that the markdown content supported in Rich Footnotes is a subset of the markdown content supported in notes themselves.

`href` the `String` that the link is set to link to

Any of these properties may be `null`, if the link does not have the corresponding value set.

## noteHandle

Some app interface functions take a `noteHandle` argument. Note handles are objects that can identify notes even if they do not yet exist (e.g. future daily jot notes). Calling an app interface function with the `noteHandle` of a note that does not yet exist is likely to create that note, for example when inserting content into the note.

An individual note that exists in identified by a `uuid` - however there are some cases where a note may not yet have been acknowledged by the server (e.g. in an extended period of offline usage), in which case the note's `uuid` may be prefixed with the string `"local-"` and may change once the note is fully persisted to the Amplenote servers. The local-prefixed `uuid` can continue to be used on the same client that created the note, even after the note has been fully persisted.

When an `app.*` interface function returns a `NoteHandle` object, it will be populated with additional metadata about the note in question, including the following attributes:

`created` an ISO 8601 datetime string representing when the note was originally created

`name` the `string` name (aka "title") of the note. For notes that do not have a name and show up as "untitled note", this will be `null`, not the string `"untitled note"`.

`published` a `boolean` indicating that the note has one or more public links. This attribute is only present when `true`, otherwise it is elided.

`shared` a `boolean` indicating that the note is shared with additional users. This attribute is only present when `true`, otherwise it is elided.

`tags` an array of strings representing each tag applied to the note. For notes tagged with child/sub tags, e.g. `"top-level/sub-tag"`, note that this array won't necessarily include `"top-level"` as a separate entry.

`updated` an ISO 8601 date-time string representing when the note was last modified

`uuid` the `string` identifier of the note

`vault` a `boolean` indicating that the note is a vault note. This attribute is only present when `true`, otherwise it is elided.

## section

Describes a chunk of a note, where each note can be broken up into multiple sections, encompassing entirety of the note's content. A note is divided into sections by using headings and horizontal rules. The first part of a note before any headings appear is considered a section (that has no heading), while content after a horizontal rule is also considered a separate section (also with no heading).

Section objects have the following properties:

`heading` - will be `null` if the section does not start with a heading (e.g. if this is the first part of the note before any headings, or a section after a horizontal rule); otherwise, will be an object describing the heading, with the following properties:

`anchor` - the `String` anchor that can be used to navigate to the heading in the note

`href` - a `String` URL that is linked to from the heading - note only a link at the start of the heading content will be considered - links elsewhere in the heading are ignored.

`level` - the `integer` level of the heading (i.e. for H1-H3)

`text` - the `String` text of the heading, without any formatting that may be applied (bold/italic/etc)

`index` - if there are multiple sections with headings that otherwise match (either because they are all `heading: null` or the `text` of the heading is the same), sections after the first section will include this `integer` index of the heading.

Examples:

![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/c553df7f-08ca-47f9-b2cd-dce6dc48668c.png)



![](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/c4d34ddd-25b8-4e40-9ac4-0a698742f8dd.png)



## task

Some app interface functions return - or accept - `task` objects that can have the following properties:

`completedAt` `integer` unix (seconds) timestamp describing the (UTC) time at which the task was completed - only present if the task has been completed.

`content` markdown `String` describing the content of the task

`dismissedAt` `integer` unix (seconds) timestamp describing the (UTC) time at which the task was dismissed - only present if the task has been dismissed.

`endAt` `integer` unix (seconds) timestamp describing the (UTC) time at which the task should end. When updating a task, must be after the `startAt` time of the task - and can not be set for a task that does not have a `startAt` time set (or provided in the same update call). The seconds between the `startAt` and `endAt` times define the duration of the task.

`hideUntil` `integer` unix (seconds) timestamp describing the (UTC) time that the task will be hidden until, or `null` if the task is not hidden.

`important` `boolean` indicating if the task is marked as important

`noteUUID` `String` uuid identifying the note that the task resides in. Passing this attribute to app interface functions that receive `task` objects will not have any effect.

`score` `Number` corresponding to the total task score attributed to the task at the current moment. Note that this accumulates once daily, depending on interaction with the task and/or note the task is in.

`startAt` `integer` unix (seconds) timestamp describing the (UTC) time that the task starts at, or `null` if the task does not have a start time set.

`urgent` `boolean` indicating if the task is marked as urgent

`uuid` `String` UUID uniquely identifying this task.

___

## Appendix II: Plugin code execution environment

Plugin code is executed in a sandboxed iFrame, preventing direct access to the outer page/application. In the native mobile applications, plugin iFrames are loaded inside an isolated (hidden) WebView, with each plugin iFrame providing isolation from any other plugins that may be loaded.

Plugin code is executed in the user's browser on web and in the system WebView on mobile, so it's worth keeping browser compatibility in mind. There are no polyfills applied in the plugin code sandbox, nor is any processing performed on plugin code.

___

## Appendix III: Markdown content

Read all about Amplenote markdown in our [dedicated reference page on Plugin API Markdown](https://www.amplenote.com/help/plugin_api_markdown_reference_parse_markdown). This documentation shows how to apply a foreground or background color to markdown text, as well as how to create Rich Footnotes, tables, and other interesting facets of markdown formatting.

Generally, markdown support follows the [GitHub Flavored Markdown Spec](https://github.github.com/gfm/).

**Note that the markdown passed by plugins** _**to**_ **the app is somewhat limited** as of July 2024, but will continue to be expanded to eventually support all Amplenote features.

___

## Appendix IV: Loading external libraries

The plugin execution context is isolated so it can loosen restrictions the application imposes on loading external resources. There are a couple patterns that can be used in plugin code to load external dependencies, depending on how the dependency is packaged.

## Loading browser builds

The simplest dependency to load is a library that has a browser build. This is a build that can normally be used in a `<script>` tag - in plugin code a `script` tag can be appended to the document to load the dependency.

For example, to load the RecordRTC library's browser build:

A couple things to note in the above code:

The plugin execution context is kept loaded, so the dependency doesn't need to be loaded on every single call to the plugin - only the first call.

The library in question - RecordRTC - will be available as `window.RecordRTC` because it is packaged up as a browser build.

This can be used in the plugin's actions as:

## Loading UMD builds

Dependencies that define UMD modules can be loaded with a small code shim:

Given a dependency that provides a UMD build, the above helper can be used as:

___

## Appendix V: Update history

May (mobile app version 3.98)

Add `created`, `updated`, `shared`, `published`, and `vault` attributes to [`NoteHandle`](https://www.amplenote.com/help/developing_amplenote_plugins#noteHandle)s

Document `imporant` and `urgent` attributes of [`task`](https://www.amplenote.com/help/developing_amplenote_plugins#task) objects

April (mobile app version 3.94)

March 22nd, 2024 (mobile app version 3.92)

March 10th, 2024 (mobile app version 3.90)

February 20th, 2024 (mobile app version 3.90)

February 8th, 2024 (mobile app version 3.89)

January 19th, 2024 (mobile app version 3.88)

January 12th, 2024 (mobile app version 3.88)

`check` functions for [replaceText](https://www.amplenote.com/help/developing_amplenote_plugins#replaceText) actions can return a string that will be used as the replacement text, instead of the name of the plugin.

[`app.alert`](https://www.amplenote.com/help/developing_amplenote_plugins#app.alert) `actions` entries can include a `value` that will be returned if the action is selected, instead of the index of the action in the `actions` array

Dec 2023 (mobile app version 3.87)

`check` functions for [insertText](https://www.amplenote.com/help/developing_amplenote_plugins#insertText) actions can return a string that will be used as the replacement text, instead of the name of the plugin. [Example](https://images.amplenote.com/fae505fa-bd40-11ed-8e3b-9a67e5fef0db/2330644c-7bc0-47aa-bbd8-61ea64552355.png)

`check` functions for [dailyJotOption](https://www.amplenote.com/help/developing_amplenote_plugins#dailyJotOption) actions can return a string that will be used as the text on the button instead of "Run".

Dec 1st, 2023 (mobile app version 3.86)

November 17th, 2023 (mobile app version 3.86)

November 8th, 2023 (mobile app version 3.84)

October 23rd, 2023 (mobile app version 3.83)

October 13th, 2023 (mobile app version 3.83)

September 29th, 2023 (mobile app version 3.83)

Add `scrollToEnd` option to `app.alert`

September 22nd, 2023 (mobile app version 3.81)

Add `app.getNoteURL` and `note.url`

September 18th, 2023 (mobile app version 3.80)

Add `linkOption` action type

September 8th, 2023 (mobile app version 3.80)

September 4th, 2023 (mobile app version 3.78)

Add `app.context.link` and `app.context.updateLink`

August 28th, 2023 (mobile app version 3.78)

July 31st, 2023 (mobile app version 3.73)

Add `noteUUID` to `task` object

June 26th, 2023 (mobile app version 3.71)

Add `dailyJotOption` action type

Add `inputs[i].value` option for `app.prompt` inputs.

Add `query` option to `app.filterNotes`

June 15th, 2023 (mobile app version 3.71)

Add support for plugin action `check` functions, to determine if the plugin should be shown as an option

June 2023 (mobile app version 3.71)

Update `app.notes.find` to allow either a `noteHandle` argument _or_ a UUID argument

Add `app.context.updateImage`

May 22nd, 2023 (mobile app version 3.70)

May 12th, 2023 (mobile app version 3.70)

Add `app.getNoteTasks`, `app.updateTask`, and `note.tasks`

Include `taskUUID` in `app.context` when insertText or replaceText actions are invoked in a task.

April 30th, 2023 (mobile app version 3.67)

Add `type: "radio"` to `app.prompt`

April 18th, 2023 (mobile app version 3.66)

Add `app.context.replaceSelection`

April 12th, 2023 (mobile app version 3.66)

Rename `app.insertContent` to `app.insertNoteContent` - `app.insertContent` will remain as an alias to support existing plugins using it.

Add `options.atEnd` to `app.insertNoteContent`

April 11th, 2023 (mobile app version 3.66)

Add `app.getNoteSections`/ `note.sections`

Add `app.replaceNoteContent` / `note.replaceContent`

April 7th, 2023 (mobile app version 3.66)

Add `{ type: "note" }` input type to `app.prompt`

April 6th, 2023 (mobile app version 3.65)

March 31st, 2023 (mobile app version 3.65)

Throw exception from `insertTask` and `insertContent` when target note is locked/readonly

Handle markdown tables (e.g. `"|||\n|-|-|\n|table|content|"`) in `insertContent`

March 30th, 2023 (mobile app version 3.65)

Update `app.alert` to allow for additional action buttons

Update `app.prompt` to allow for various input types

Removes `options.placeholder` from `app.prompt`

Add `options.preface` to `app.alert`

Add `options.placeholder` to `app.prompt`

`insertText` changed to `insertContent`, handling markdown content

`insertTask` `text` attribute changed to `content`, handling markdown content