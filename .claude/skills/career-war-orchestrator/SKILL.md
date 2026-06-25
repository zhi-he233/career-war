\# Career War Orchestrator Skill



\## Purpose



This skill is the task coordinator for the “职业互怼 / Career War” project.



The Orchestrator does not rush into coding. Its job is to understand the user request, classify the task type, choose the correct specialist skill, define file boundaries, create a task brief, and decide the verification method.



The main goal is to prevent uncontrolled edits, cross-mode pollution, and large unsafe rewrites.



\## Project Context



Career War is a mobile-first H5 dice battle game.



Main areas:



\* Client UI: `client/src`

\* Battle components: `client/src/components/battle`

\* Lobby components: `client/src/components/lobby`

\* Global styles: `client/src/styles`

\* Shared types and battle engine: `shared/src`

\* Roguelite balance data: `shared/src/data/rogueliteBalance.ts`

\* Server and Socket.IO: `server/src`

\* Documentation: `docs`



Important project modes:



\* Classic PVP

\* Duo 2v2

\* PVE 1v1

\* PVE Roguelite

\* Profile/user system



The current development direction is incremental improvement, not full rewrite.



\## Core Rule



Never treat a user request as a reason to freely modify the whole project.



Every task must be converted into a small, bounded task brief.



\## Task Classification



Before any code change, classify the task as one of:



1\. UI-only

2\. CSS-only

3\. Mobile battle layout

4\. Lobby UI

5\. Profile UI

6\. Character/profession logic

7\. Roguelite balance/data

8\. Battle engine logic

9\. Server/socket/reconnect/auth

10\. Refactor/architecture

11\. QA/regression

12\. Deployment/build issue



If the task contains multiple categories, split it into separate subtasks.



Do not combine UI, battle logic, and server changes unless absolutely necessary.



\## Specialist Routing



Use these specialist skills:



\### career-war-ui-mobile



Use for:



\* Battle UI

\* Mobile layout

\* Lobby layout

\* Profile UI

\* CSS split/cleanup

\* Visual feedback such as damage numbers, emotes, panels, buttons



\### career-war-rules-engine



Use for:



\* Character skills

\* Dice effects

\* Damage/heal/shield logic

\* Roguelite rewards

\* Enemy/Boss logic

\* Shared types

\* Engine behavior



\### career-war-server-sync



Use for:



\* Socket.IO

\* Room lifecycle

\* Reconnection

\* Player identity

\* Auth/user system

\* Server-side game state



\### career-war-qa-regression



Use for:



\* Independent check

\* Build check

\* Regression checklist

\* Risk review

\* File pollution review



The QA skill should not modify code.



\## Required Output: Task Brief



For every non-trivial task, create or update:



`docs/agent-state/TASK\_BRIEF.md`



The task brief must include:



\* User request

\* Task type

\* Goal

\* Non-goals

\* Allowed files

\* Forbidden files

\* Relevant project context

\* Implementation steps

\* Verification method

\* Human checkpoint if needed

\* Risk level



\## File Boundary Rules



\### UI-only task



Allowed examples:



\* `client/src/components/BattlePage.vue`

\* `client/src/components/battle/\*\*`

\* `client/src/components/lobby/\*\*`

\* `client/src/components/profile/\*\*`

\* `client/src/styles/\*\*`



Forbidden unless explicitly required:



\* `shared/src/engine.ts`

\* `shared/src/types.ts`

\* `server/src/index.ts`



\### Rules-engine task



Allowed examples:



\* `shared/src/engine.ts`

\* `shared/src/types.ts`

\* `shared/src/data/\*\*`

\* Relevant display text in client only if needed



Forbidden unless explicitly required:



\* Large CSS refactors

\* Lobby layout changes

\* Server reconnection logic



\### Server-sync task



Allowed examples:



\* `server/src/index.ts`

\* Auth-related server files

\* Socket identity and room lifecycle files

\* Related shared types if required



Forbidden unless explicitly required:



\* Battle UI redesign

\* Roguelite balance changes

\* CSS cleanup



\### QA task



Allowed:



\* Read files

\* Run checks

\* Produce report



Forbidden:



\* Modifying source code



\## Parallel Development Rule



Parallel work is allowed only when file ownership does not overlap.



Good parallel split:



\* Agent A modifies battle CSS.

\* Agent B modifies roguelite balance data.

\* Agent C performs read-only QA after both finish.



Bad parallel split:



\* Two Agents both modify `BattlePage.vue`.

\* One Agent refactors CSS while another changes the same class names.

\* One Agent changes `shared/src/types.ts` while another changes engine logic depending on those types without coordination.



If file overlap exists, work must be serial.



\## Human Checkpoints



Require a human checkpoint when:



\* First version of a new UI direction is complete.

\* More than one mode may be affected.

\* A central file is modified.

\* `shared/src/engine.ts` is modified.

\* `server/src/index.ts` is modified.

\* A new profession with special rules is added.

\* A large CSS split or component split is proposed.



At a checkpoint, stop after the smallest previewable version.



\## Minimal Slice Feedback Rule



If the user gives feedback on one small part, only change that part.



Examples:



\* “按钮太低” means adjust that button or its container.

\* “2V2 太挤” means adjust 2V2 layout only.

\* “伤害数字被挡住” means adjust feedback layer/z-index/position only.

\* “奖励面板不好用” means adjust reward panel only.



Do not rewrite the whole battle page after local feedback.



\## Verification Selection



Choose verification according to task type:



\* UI/CSS: build + mobile layout checklist

\* Battle logic: build + deterministic test or manual simulated scenario

\* Roguelite data: build + data consistency check

\* Server/socket: build + reconnect/PVP checklist

\* Refactor: build + changed-files review + mode regression checklist

\* QA: produce report only



Default command:



`npm run build`



If build cannot be run, explain why and provide manual verification steps.



\## Final Report Format



The Orchestrator or specialist must report:



\* Completed:

\* Changed files:

\* Verification:

\* What was not changed:

\* Risks:

\* Next small step:



Keep the final report concrete and short.



