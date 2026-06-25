\---



name: career-war-ui-mobile

description: Use this skill when modifying Career War mobile UI, battle layout, lobby UI, profile UI, CSS, responsive layout, damage numbers, emotes, reward panels, buttons, or visual feedback. Do not use this skill for battle engine logic, server socket logic, auth, reconnection, or roguelite balance logic.

\---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



\# Career War UI Mobile Skill



\## Purpose



This skill is used for mobile-first UI work in the “职业互怼 / Career War” project.



It covers battle UI, lobby UI, profile UI, CSS fixes, responsive layout, visual feedback, buttons, panels, reward choices, emotes, damage/heal numbers, and mobile interaction polish.



The goal is to make safe UI changes without touching battle logic, server logic, socket logic, auth logic, or roguelite balance logic.



\## Core Principles



1\. UI-only means UI-only.

2\. Do not modify battle engine logic.

3\. Do not modify server/socket/auth/reconnect logic.

4\. Do not invent career names, profile data, achievements, or balance values.

5\. Make the smallest useful change.

6\. Preserve existing working modes unless the task explicitly targets them.

7\. Mobile readability is more important than decorative complexity.

8\. If the user gives local feedback, fix only that local slice.



\## Required First Step



Before editing, read the task brief if it exists:



\* `docs/agent-state/TASK\_BRIEF.md`



Then identify:



\* Target UI area.

\* Allowed files.

\* Forbidden files.

\* Affected modes.

\* Verification method.



If no task brief exists, create a short plan before editing.



\## Common UI Areas



\### Battle UI



Likely files:



\* `client/src/components/BattlePage.vue`

\* `client/src/components/battle/\*\*`

\* `client/src/styles/\*\*`



Focus:



\* Character seats

\* HP / shield / status readability

\* Dice area

\* Action slots

\* Turn guide

\* Bottom bar

\* Damage and heal feedback

\* Emote feedback

\* Roguelite reward panel

\* Mobile stage layout



\### Lobby UI



Likely files:



\* `client/src/components/LobbyPage.vue`

\* `client/src/components/lobby/\*\*`

\* `client/src/styles/\*\*`



Focus:



\* Player list

\* Character picker

\* Room settings

\* Start bar

\* Summoner skill panel

\* Mobile bottom sheet



\### Profile UI



Likely files:



\* `client/src/components/ProfilePage.vue`

\* `client/src/components/profile/\*\*`

\* `client/src/styles/\*\*`



Focus:



\* Login-gated profile state

\* Stats display

\* Recent-used careers

\* Achievement panels

\* Mobile layout



Do not fabricate real player data. Use placeholders only if clearly marked as placeholder.



\## Forbidden Files for UI-only Tasks



Do not modify these unless the task brief explicitly allows it:



\* `shared/src/engine.ts`

\* `shared/src/types.ts`

\* `shared/src/data/rogueliteBalance.ts`

\* `server/src/index.ts`

\* auth / socket / reconnect server files



If a UI task seems to require these files, stop and report the reason.



\## Mobile Layout Requirements



Check the design mentally or manually for:



\* 360px width

\* 390px width

\* 430px width

\* 800px height

\* 844px height

\* 932px height



Avoid:



\* Body scrolling during battle unless explicitly intended.

\* Primary action buttons hidden below the screen.

\* Reward choices hidden too low.

\* Damage numbers blocked by dice/action panels.

\* Emotes blocking clicks.

\* HP/shield/status becoming unreadable.

\* Large decorative elements taking priority over gameplay information.



\## Battle UI Rules



The battle screen should prioritize:



1\. Who is acting.

2\. Current HP / shield / status.

3\. Dice result.

4\. Available actions.

5\. Target and damage feedback.

6\. Mode-specific information.



Do not make visual changes that obscure core combat information.



For 2V2 or multi-unit layouts:



\* Keep units readable.

\* Avoid over-large avatars.

\* Keep team identity clear.

\* Avoid layout choices that only work on desktop.

\* Do not force a new 2V2 layout into classic or roguelite unless requested.



For roguelite reward UI:



\* Reward choices should be easy to tap.

\* Important reward choices should not be hidden in a bottom drawer unless explicitly requested.

\* Internal scrolling is acceptable if the overall panel remains stable.



\## CSS Rules



When changing CSS:



1\. Prefer targeted selectors over global overrides.

2\. Avoid adding new `!important` unless needed to beat existing legacy rules.

3\. If using `!important`, explain why.

4\. Do not rename classes unless necessary.

5\. Do not perform large CSS reorganization during a small visual fix.

6\. Check existing patch files before adding another override.

7\. Avoid conflicting rules across `legacy.css`, `styles.css`, and patch files.



If a layout issue is caused by CSS specificity, identify the winning rule and patch the smallest losing rule.



\## Minimal Slice Feedback Rule



If the user says:



\* “这个按钮偏了”

\* “这里太挤”

\* “伤害数字被挡住”

\* “奖励面板不好点”

\* “2V2 这里不好看”

\* “这个头像太大”



Only modify the smallest relevant component or CSS block.



Do not redesign the entire page.



Do not modify unrelated modes.



Do not rewrite approved UI.



\## Implementation Workflow



\### Phase 1: Inspect



Read relevant files.



Summarize:



\* Current UI behavior.

\* Target UI behavior.

\* Likely cause.

\* Files to modify.

\* Files not to modify.



\### Phase 2: Patch



Make the smallest safe change.



Prefer:



\* Small CSS patch.

\* Small component layout adjustment.

\* Small prop or class change.



Avoid:



\* Large file rewrite.

\* New design system.

\* Unrelated cleanup.

\* Cross-mode redesign.



\### Phase 3: Verify



Run:



\* `npm run build`



Also check:



\* Did forbidden files remain untouched?

\* Could classic PVP be affected?

\* Could roguelite be affected?

\* Could 2V2 be affected?

\* Could 360px mobile overflow?



\### Phase 4: Report



Final response must include:



\* Completed:

\* Changed files:

\* Verification:

\* What was not changed:

\* Risks:

\* Next small step:



\## Self-Check Checklist



Before final response, confirm:



\* I did not touch battle logic for a UI-only task.

\* I did not touch server/socket/auth logic.

\* I did not invent data.

\* I did not rewrite unrelated UI.

\* I preserved mobile-first layout.

\* I considered 360 / 390 / 430 widths.

\* I ran or clearly reported build verification.

\* I reported changed files honestly.



