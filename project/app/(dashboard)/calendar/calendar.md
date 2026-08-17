# LockIn Calendar — Cross-Project Tasks, Task Preview Modal, and Quick Create UX

Apply these requirements **in addition to the existing LockIn Calendar implementation plan**.

The Calendar remains a **date-based view of LockIn's existing project/Kanban tasks**.

Do not weaken the existing project/list relationship to support these requirements.

---

# 1. Calendar Must Fetch All Tasks Across All User Projects

The Calendar must show **all calendar-eligible tasks belonging to the authenticated user across every project they have access to**.

Do not scope the calendar to:

* the currently selected project;
* the project currently open in the UI;
* the last visited project;
* a single project/list;
* a single Kanban board.

The calendar should aggregate tasks across the user's projects into one unified timeline.

Conceptually:

```text
Current User
    │
    ├── Project A
    │    ├── List A
    │    └── Tasks
    │
    ├── Project B
    │    ├── List B
    │    └── Tasks
    │
    └── Project C
         ├── List C
         └── Tasks
              ↓
          Calendar
```

The query should retrieve the user's tasks across all projects while respecting the application's existing:

* Clerk authentication;
* authorization;
* ownership;
* project membership/access rules;
* task visibility rules.

Do not expose tasks from projects the current user should not be able to access.

---

# 2. Calendar Query Must Include Project Context

Every calendar task should retain the associated project and Kanban list/status information.

The calendar-ready data should conceptually contain:

```text id="d3q8d0"
Task
├── id
├── title
├── shortDescription / description
├── dueDate
├── priority
├── labels
├── List / Status
└── Project
    ├── id
    └── name
```

Do not fetch only the task title and due date.

The project relationship is important because the Calendar combines tasks from multiple projects.

Do not make additional per-task database requests from the client.

Prefer a properly joined/selected server-side query to avoid an N+1 query pattern.

---

# 3. Calendar Task Tile / Event Design

Each task displayed on the calendar must communicate enough information to identify it without opening the task.

At minimum, the calendar task tile should show:

1. **Task title**
2. **Short description**
3. **Project name**

The title should have the strongest visual hierarchy.

The description should be concise and visually secondary.

The project should be clearly identifiable but not visually overpower the task itself.

Example:

```text id="l53hle"
┌───────────────────────────────────┐
│ Finish landing page               │
│ Update hero section and CTA...    │
│                                   │
│ ● Website Redesign                │
└───────────────────────────────────┘
```

The exact design should follow LockIn's existing visual language.

Do not simply render the raw React Big Calendar event title.

---

# 4. Short Description Handling

Use the existing task description field if one exists.

Do not add a new database field solely for the calendar.

The calendar tile should:

* show a short preview;
* truncate long descriptions gracefully;
* avoid excessively tall events;
* preserve the full description in the task preview modal.

Use a sensible character/line limit or CSS line clamp.

Do not alter the stored description.

---

# 5. Project Identification

Because the Calendar aggregates multiple projects, the project name must be visually recognizable on every task tile.

Reuse existing LockIn project badges/colors/visual conventions where available.

Do not invent a new project-color system if the application already has one.

The project name should remain readable in both light and dark themes.

Example:

```text id="o6bq51"
Finish landing page
Refine hero section and CTA
[ Website Redesign ]
```

The exact layout is up to the existing LockIn design system.

---

# 6. Clicking a Calendar Task Must NOT Immediately Redirect

When the user clicks a calendar task:

**Do not immediately redirect to the full Task Detail Panel/page.**

Instead, open a **Calendar Task Preview Modal**.

The interaction should be:

```text id="8q5z05"
Calendar task
     ↓ click
Task Preview Modal
     ↓
View information
     ↓
Optional:
"Open Task Details"
     ↓
Existing Task Detail Panel/Page
```

This is an important UX requirement.

The calendar should allow users to inspect a task without losing their current calendar position/context.

---

# 7. Calendar Task Preview Modal

Create a polished LockIn-specific modal for viewing a calendar task.

The attached screenshots are **visual inspiration only**.

Do not copy their branding, colors, typography, or exact layout.

The modal should be adapted to the LockIn design system and existing component conventions.

The preview modal should show, where supported by the existing task model:

* Task title
* Short/full description
* Project
* Kanban status/list
* Due date
* Priority
* Labels
* Assignee
* Other useful existing task metadata

Do not invent fields that do not exist.

---

# 8. Task Preview Modal — Suggested Structure

Use a compact, polished hierarchy.

Conceptually:

```text id="g7bg0z"
┌────────────────────────────────────────────┐
│ Task title                              X  │
│                                            │
│ Project: Website Redesign                  │
│ Status: In Progress                        │
│                                            │
│ Short/full description                     │
│ Update hero section and CTA...             │
│                                            │
│ Assignee      Kenneth                      │
│ Due date      Aug 18                       │
│ Priority      Medium                       │
│                                            │
│ [ Open Task Details ]       [ Close ]      │
└────────────────────────────────────────────┘
```

Do not necessarily copy this exact layout.

Use LockIn's existing modal/dialog conventions.

The modal should feel like a **quick task inspection surface**, not a second full task-management page.

---

# 9. Open Full Task Details

The preview modal must provide an obvious action such as:

```text
Open Task Details
```

or the existing equivalent wording used elsewhere in LockIn.

When clicked:

1. Close or transition the preview modal appropriately.
2. Open the existing full Task Detail Panel/page.
3. Navigate using the application's existing task-detail mechanism.
4. Preserve the existing project/task context.

Do not create a second implementation of the full Task Detail Panel.

The Calendar Preview Modal is only the quick-view layer.

---

# 10. Task Preview Modal Must Work for Every Calendar Task

The preview must work for:

* tasks in any project;
* tasks from any Kanban list/status;
* tasks with/without optional metadata such as labels;
* tasks with different priorities;
* tasks with/without descriptions, where the existing schema permits this.

Do not show erroneous messages such as:

> "Task is not linked to any project."

All tasks shown by the Calendar should already be valid project tasks.

If that error currently occurs, fix the data flow and task lookup rather than adding a special fallback.

---

# 11. Quick Create Task from Calendar

The existing Add Task experience should be redesigned as a **LockIn quick-create modal inspired by the second attached screenshot**.

Again, the screenshot is inspiration only.

Do not copy the external product's branding.

The final UI must use LockIn's:

* typography;
* colors;
* spacing;
* buttons;
* radii;
* shadows;
* icons;
* theme tokens;
* Light/Dark behavior.

---

# 12. Calendar Quick Create Flow

When the user clicks an empty calendar date:

```text id="kt1b4m"
Empty calendar date
      ↓
Quick Create Task Modal
```

The selected date should be automatically pre-filled as the task's due date.

The user should be able to quickly enter the task title and create it without leaving the calendar.

---

# 13. Quick Create Modal — Fast First Step

The quick-create modal should prioritize speed.

The primary interaction should be:

```text id="3q0v8y"
Task title
[________________________________]
```

Then provide the necessary task/project controls.

Use a design inspired by the uploaded reference where appropriate:

* focused title input;
* clear Create action;
* Cancel action;
* optional "More Options" mechanism.

However, **LockIn's existing architecture and required fields take priority over the inspiration screenshot**.

---

# 14. Required Project and Kanban Status

Remember:

**LockIn tasks must belong to a project and Kanban list/status.**

Therefore the quick-create flow must ultimately collect:

```text id="u4i9kq"
Project
Status / List
```

The default experience should remain fast.

A good interaction is:

```text id="5tz4qn"
Task title
       ↓
Project
       ↓
Status / List
       ↓
Create
```

The available Status/List values must dynamically come from the selected project's Kanban board.

Do not use a global hard-coded status list.

---

# 15. More Options

If the existing LockIn task model contains many optional fields, use a progressive-disclosure approach.

For example:

```text id="gbwzpt"
Quick Create
├── Task title
├── Project
├── Status
├── Create
└── More options
      ├── Due date
      ├── Priority
      ├── Labels
      ├── Description
      ├── Assignee
      └── other existing fields
```

The exact fields must come from the existing task schema/form.

Do not invent fields.

The clicked calendar date should populate the due date whether the field is shown immediately or inside More Options.

---

# 16. Project Selection Behavior

Because the Calendar aggregates all projects, the project selector should make it easy to choose the intended project.

Use the existing project-selection component/query if one exists.

After selecting a project:

* fetch/show that project's available Kanban lists/statuses;
* reset an incompatible previously selected status/list;
* prevent submission until a valid list is selected.

The user must never be able to create:

```text
Project A + List from Project B
```

---

# 17. Calendar Should Refresh After Task Creation

After successfully creating a task from the Calendar:

* close the quick-create modal;
* refresh/revalidate the task data using the application's existing mechanism;
* immediately show the new task on the appropriate calendar date;
* ensure the correct project name appears;
* ensure the correct Kanban status appears;
* ensure upcoming task/deadline data stays consistent.

Do not maintain a separate client-only calendar task store.

The database remains the source of truth.

---

# 18. Calendar Task Filtering and Scope

The calendar should aggregate all accessible user tasks.

It should not silently omit a task because it belongs to another project.

For example, if the user has:

```text id="8dt6lb"
Project A → 5 tasks
Project B → 3 tasks
Project C → 7 tasks
```

the calendar should show all valid tasks with due dates:

```text
Calendar → 15 task events
```

subject to the application's existing visibility/authorization rules.

---

# 19. Future Filtering

The implementation should be structured so a future Calendar filter can support:

```text
All Projects
Project A
Project B
Project C
```

However, **do not implement a project filter unless explicitly required elsewhere**.

Just ensure the underlying calendar data model does not assume one project.

---

# 20. Performance

Because the calendar aggregates tasks from multiple projects:

* fetch tasks efficiently on the server;
* join project/list information in the same query where practical;
* avoid N+1 requests;
* do not fetch project data separately for every calendar event;
* avoid repeatedly querying the same task/project information from the client.

Keep the Calendar responsive even when the user has many tasks/projects.

---

# 21. Calendar Task Event Styling

Because tasks from multiple projects share one calendar, visual differentiation becomes especially important.

Use subtle project/status/priority indicators where appropriate.

For example:

```text id="6sp7vf"
┌────────────────────────────────┐
│ Task title                     │
│ Short description              │
│ ● Project Name   Medium        │
└────────────────────────────────┘
```

However:

* do not make every project use a loud arbitrary color;
* do not overwhelm the calendar;
* use existing LockIn colors/tokens;
* prioritize readability.

---

# 22. Light and Dark Theme

Everything introduced in this redesign must work with the existing LockIn theme.

Use the definitions in:

```text
app/globals.css
```

as the source of truth.

The following must match LockIn in Light and Dark mode:

* task tiles;
* project badges;
* task preview modal;
* quick-create modal;
* inputs;
* selectors;
* buttons;
* overlays;
* calendar grid;
* hover states;
* selected states;
* focus states.

Do not leave generic third-party colors in the new UI.

---

# 23. Accessibility

The Task Preview Modal and Quick Create Modal must support:

* keyboard navigation;
* Escape-to-close where consistent with existing dialogs;
* focus management;
* accessible labels;
* visible focus states;
* semantic form controls.

Do not introduce nested interactive elements such as:

```html
<button>
  <button>...</button>
</button>
```

or equivalent invalid structures.

---

# 24. Hydration Safety

The custom calendar event, toolbar, preview modal, and quick-create modal must produce valid HTML.

Pay particular attention to components that render interactive elements internally.

Do not use:

* `suppressHydrationWarning`;
* `biome-ignore`;
* invalid HTML nesting;
* client-only hacks to hide hydration errors.

Fix the underlying structure.

---

# 25. Type Safety

Do not use:

* `any`;
* `@ts-ignore`;
* `@ts-expect-error`;
* `biome-ignore`;
* unsafe casts used only to bypass TypeScript errors.

Use React Big Calendar's exported types where appropriate.

Use properly typed task/project/list models throughout the calendar.

---

# 26. Preserve Project/Kanban Integrity

Do not change the fundamental relationship:

```text id="69nfqu"
Project
 ↓
Kanban List / Status
 ↓
Task
```

The Calendar must consume and visualize this relationship.

Do not introduce:

```text id="rlj97m"
Projectless Task
```

or:

```text id="1g5gfp"
Global Task Status
```

to simplify Calendar implementation.

The Calendar is a **view**, not a replacement for the Kanban task model.

---

# 27. Final Interaction Model

The completed Calendar should work like this:

### View tasks

```text id="6h8v0y"
Open Calendar
      ↓
Fetch all accessible tasks across all projects
      ↓
Group/display by due date
      ↓
Each tile shows:
  - title
  - short description
  - project
```

### Inspect task

```text id="9n8whb"
Click task
      ↓
Calendar Task Preview Modal
      ↓
View details
      ↓
[ Open Task Details ]
      ↓
Existing Task Detail Panel/Page
```

### Create task

```text id="h2tpxd"
Click empty date
      ↓
Quick Create Modal
      ↓
Enter title
      ↓
Select Project
      ↓
Select Project's Status/List
      ↓
Optional More Options
      ↓
Create
      ↓
Task appears on calendar
```

This should feel fast, predictable, and consistent with LockIn.

---

# 28. Use the Attached Screenshots as UX Inspiration

The attached screenshots are reference material for:

1. **Task preview modal**

   * compact;
   * visually focused;
   * task information presented clearly;
   * quick access to deeper task details.

2. **Quick-create modal**

   * fast title entry;
   * prominent Create action;
   * Cancel action;
   * optional advanced fields;
   * minimal friction.

Use those interaction principles as inspiration.

**Do not copy their exact branding, colors, typography, component styling, or proprietary visual identity.**

Translate the useful UX patterns into the existing LockIn design system.

---

# 29. Validation

After implementation run:

```bash
pnpm exec tsc --noEmit
pnpm biome check --write .
pnpm build
```

Use the project's existing scripts if equivalent commands are defined.

Then manually verify:

* [ ] Calendar fetches tasks across all accessible projects.
* [ ] Tasks from different projects can coexist on the same calendar.
* [ ] Every task tile shows title.
* [ ] Every task tile shows a short description.
* [ ] Every task tile identifies its project.
* [ ] Clicking a task opens the Calendar Task Preview Modal.
* [ ] Clicking a task does not immediately redirect.
* [ ] Preview modal displays relevant task information.
* [ ] Preview modal provides an Open Task Details action.
* [ ] Open Task Details uses the existing task-detail architecture.
* [ ] Empty-date click opens Quick Create.
* [ ] Due date is pre-filled from the clicked date.
* [ ] Project is required.
* [ ] Status/List is derived from the selected project.
* [ ] More Options exposes existing optional task fields where appropriate.
* [ ] Created tasks persist correctly.
* [ ] New tasks appear immediately after creation.
* [ ] Light mode matches LockIn.
* [ ] Dark mode matches LockIn.
* [ ] No hydration errors occur.
* [ ] No nested interactive elements occur.
* [ ] No `biome-ignore` or TypeScript suppression was introduced.
* [ ] Existing Kanban behavior remains unchanged.

---

# 30. Final Product Standard

The final Calendar should feel like:

> **"My LockIn projects, organized by due date."**

The user should be able to scan all their projects in one calendar, quickly understand what each task is, inspect it without losing calendar context, and create a task for a specific date with minimal friction.

The Calendar must remain fully consistent with LockIn's existing:

**Project → Kanban Status → Task**

architecture.

Do not solve Calendar UX problems by weakening that architecture.
