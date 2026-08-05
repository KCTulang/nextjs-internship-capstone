# Project Management Tool - Individual Implementation Tasks

## Overview

Each intern will build their own complete version of the project management tool. This ensures everyone gets the full learning experience across all aspects of full-stack development.

## Relevant Files (Each Intern's Project)

- `app/layout.tsx` - Root layout with Clerk provider and theme setup
- `app/page.tsx` - Landing/home page
- `app/globals.css` - Global styles with Tailwind CSS
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in page
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up page
- `app/(dashboard)/dashboard/page.tsx` - Main dashboard page
- `app/(dashboard)/dashboard/layout.tsx` - Dashboard layout with navigation
- `app/(dashboard)/projects/page.tsx` - Projects listing page
- `app/(dashboard)/projects/[id]/page.tsx` - Individual project board page
- `middleware.ts` - Authentication middleware for route protection
- `lib/db/schema.ts` - Database schema definitions with Drizzle
- `lib/db/index.ts` - Database connection and queries
- `lib/auth.ts` - Authentication utilities and helpers
- `lib/validations.ts` - Zod validation schemas
- `components/ui/*` - Shadcn/UI components
- `components/project-card.tsx` - Project display component
- `components/task-card.tsx` - Task display component
- `components/kanban-board.tsx` - Drag-and-drop board component
- `components/modals/create-project-modal.tsx` - Project creation modal
- `components/modals/create-task-modal.tsx` - Task creation modal
- `stores/ui-store.ts` - Zustand store for UI state
- `stores/board-store.ts` - Zustand store for board state
- `hooks/use-projects.ts` - Custom hook for project data
- `hooks/use-tasks.ts` - Custom hook for task data
- `types/index.ts` - TypeScript type definitions
- `drizzle.config.ts` - Drizzle configuration
- `package.json` - Dependencies and scripts

## Individual Tasks (Each Intern Completes All)

Each intern will work through all tasks below for their individual implementation. Tasks will be assigned on the GitHub Projects board with intern names for tracking.

### Phase 1: Foundation & Setup (Weeks 1-2)

- [x] 1.0 Project Setup & Foundation
  - [x] 1.1 Initialize Next.js 16 project with TypeScript and Tailwind CSS
  - [x] 1.2 Configure ESLint, Prettier, and development tools
  - [x] 1.3 Set up project structure and folder organization
  - [x] 1.4 Install and configure Shadcn/UI components
  - [x] 1.5 Set up environment variables and configuration files
  - [x] 1.6 Create basic layout and navigation structure

### Phase 2: Authentication (Weeks 2-3)

- [x] 2.0 Authentication System Implementation
  - [x] 2.1 Set up Clerk authentication service
  - [x] 2.2 Configure authentication middleware for route protection
  - [x] 2.3 Create sign-in and sign-up pages
  - [x] 2.4 Implement user session management
  - [x] 2.5 Set up webhook for user data synchronization
  - [x] 2.6 Create protected dashboard layout

### Phase 3: Database & Backend (Weeks 3-4)

- [x] 3.0 Database Design & Setup
  - [x] 3.1 Design database schema for users, projects, lists, and tasks
  - [x] 3.2 Configure PostgreSQL database (Vercel Postgres or Neon)
  - [x] 3.3 Set up Drizzle ORM with type-safe schema definitions
  - [x] 3.4 Create database migration system
  - [x] 3.5 Implement database connection and query utilities
  - [ ] 3.6 Set up data validation with Zod schemas

### Phase 4: Core Features (Weeks 4-6)

- [x] 4.0 Core Project Management Features
  - [x] 4.1 Implement project CRUD operations (Create, Read, Update, Delete)
  - [x] 4.2 Create project listing and dashboard interface
  - [x] 4.3 Implement list/column management within projects
  - [x] 4.4 Build task creation and editing functionality
  - [x] 4.5 Design and implement project cards and layouts
  - [x] 4.6 Add project and task search/filtering capabilities

### Phase 5: Interactive UI (Weeks 5-7)

- [x] 5.0 Interactive Kanban Board
  - [x] 5.1 Design responsive Kanban board layout
  - [x] 5.2 Implement drag-and-drop functionality with dnd-kit
  - [x] 5.3 Set up client-side state management with Zustand
  - [x] 5.4 Implement optimistic UI updates for smooth interactions
  - [x] 5.5 Add real-time persistence of board state changes
  - [x] 5.6 Create task detail modals and editing interfaces

### Phase 6: Advanced Features (Weeks 6-8)

- [ ] 6.0 Advanced Features & Polish
  - [ ] 6.1 Implement task assignment and user collaboration features
  - [ ] 6.2 Add task due dates, priorities, and labels
  - [ ] 6.3 Create task comments and activity history
  - [ ] 6.4 Implement project member management and permissions
  - [ ] 6.5 Add bulk task operations and keyboard shortcuts
  - [ ] 6.6 Optimize performance and implement loading states

### Phase 7: Testing (Weeks 7-9)

- [ ] 7.0 Testing Implementation
  - [ ] 7.1 Set up Jest and React Testing Library for unit tests
  - [ ] 7.2 Write component tests for UI elements
  - [ ] 7.3 Create integration tests for user flows
  - [ ] 7.4 Set up Playwright for end-to-end testing
  - [ ] 7.5 Write E2E tests for critical user journeys
  - [ ] 7.6 Implement test coverage reporting and CI integration

### Phase 8: Deployment (Weeks 8-10)

- [ ] 8.0 Deployment & Production Setup
  - [ ] 8.1 Install Vercel CLI, log in, and link your project (`vercel link`)
  - [ ] 8.2 Add all required environment variables in the Vercel dashboard (Clerk keys, DATABASE_URL)
  - [ ] 8.3 Deploy a preview build manually with `vercel` and verify it works end-to-end
  - [ ] 8.4 Deploy to production with `vercel --prod`
  - [ ] 8.5 Configure production database and run migrations against the production DATABASE_URL
  - [ ] 8.6 Implement error monitoring and logging (e.g. Vercel error logs, Sentry)
  - [ ] 8.7 Set up performance monitoring (Vercel Analytics or similar)
  - [ ] 8.8 *(Optional)* Enable the GitHub Actions workflow for automated deploys
        - Open `.github/workflows/deploy.yml` in your fork
        - Uncomment the `push` / `pull_request` trigger block you want (see README → "Vercel Deployment")
        - Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub repository secrets
        - Push a commit to `main` to verify the pipeline runs correctly

## GitHub Projects Board Organization

### Issue Naming Convention
Each issue will include the intern's name for clarity:

**Format**: `[Intern Name] Task Number - Task Description`

**Examples**:
- `[Your Name] 1.1 - Initialize Next.js project with TypeScript`
- `[Your Name] 2.3 - Create sign-in and sign-up pages`
- `[Your Name] 5.2 - Implement drag-and-drop functionality`

### Labels for Organization
- **Timeline**: `week-1`, `week-2`, `week-3`, etc.
- **Priority**: `priority-high`, `priority-medium`, `priority-low`
- **Category**: `frontend`, `backend`, `database`, `auth`, `testing`, `deployment`
- **Individual**: `intern-[your-name]`
- **Status**: `blocked`, `in-review`, `needs-help`

### Columns
- **📋 Backlog** - All tasks waiting to be started
- **🎯 This Week** - Tasks planned for current week
- **🚧 In Progress** - Tasks currently being worked on
- **👀 Review** - Tasks ready for self/peer review
- **✅ Done** - Completed tasks

## Collaboration While Building Individually

### Daily Standups (15 minutes)
**Format**: Each person shares (2 minutes each):
- What I completed yesterday
- What I'm working on today
- Any blockers or questions

### Code Review Sessions (Optional, 30 minutes weekly)
- Share interesting code snippets
- Ask for feedback on implementation approaches
- Discuss different solutions to the same problems

### Knowledge Sharing (30 minutes weekly)
- One intern presents a topic they learned deeply
- Demo a particularly interesting feature implementation
- Share resources and learning materials

### Problem-Solving Sessions (As needed)
- Anyone can call for help when stuck
- Group debugging sessions
- Pair programming opportunities

## Individual Milestones & Tracking

### Milestone 1: Working Development Environment (End of Week 2)
**Success Criteria**:
- [x] Next.js project running locally
- [x] Authentication working with Clerk
- [x] Database connected and schema implemented
- [x] Basic dashboard accessible after login

### Milestone 2: Core CRUD Functionality (End of Week 5)
**Success Criteria**:
- [x] Projects can be created, edited, deleted
- [x] Lists can be managed within projects
- [x] Tasks can be created, edited, deleted
- [x] All data persists correctly

### Milestone 3: Interactive Kanban Board (End of Week 7)
**Success Criteria**:
- [x] Drag-and-drop working smoothly
- [x] Real-time updates without page refresh
- [x] State management working correctly
- [x] Mobile-responsive design

### Milestone 4: Production Ready (End of Week 10)
**Success Criteria**:
- [ ] Application deployed and publicly accessible on Vercel
- [ ] Tests written and passing
- [ ] Error monitoring in place
- [ ] Documentation complete
- [ ] *(Optional)* GitHub Actions workflow enabled and deploying automatically

## Final Showcase

Each intern will present their individual implementation:

### Individual Presentation (15 minutes each)
- **Live Demo** (8 minutes): Show all major features working
- **Technical Deep Dive** (5 minutes): Explain one interesting technical decision
- **Reflection** (2 minutes): What was most challenging and what they learned

### Group Discussion (30 minutes)
- Compare different implementation approaches
- Identify best practices that emerged
- Discuss lessons learned and future improvements

## Benefits of Individual Development

### For Learning
- ✅ Everyone experiences the full development lifecycle
- ✅ Complete ownership and responsibility
- ✅ Full portfolio project for job applications
- ✅ Experience with all parts of the tech stack
- ✅ Problem-solving skills across all domains

### For Collaboration
- ✅ Learn from different approaches to the same problems
- ✅ Rich discussions comparing implementation strategies
- ✅ Help each other without dependency bottlenecks
- ✅ Build communication and mentoring skills
- ✅ Create a supportive learning environment

This approach ensures everyone gets the complete learning experience while maintaining the collaborative spirit of the internship program!
