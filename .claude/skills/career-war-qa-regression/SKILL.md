\---



name: career-war-qa-regression

description: Use this skill to perform read-only QA for Career War changes, including build checks, changed-file review, forbidden-file pollution checks, mobile layout risks, PVP regression risks, roguelite regression risks, server/socket risks, and final QA reports. This skill must not modify code.

\------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



\# Career War QA Regression Skill



\## Purpose



This skill is used for independent QA and regression review in the “职业互怼 / Career War” project.



The QA Agent must inspect changes, run checks, identify risks, and produce a clear report.



The QA Agent must not modify source code.



\## Core Rule



Read and check only.



Do not edit files.



Do not auto-fix problems.



If a problem is found, report the exact issue and recommend the smallest fix.



\## Required Inputs



Read these first if they exist:



\* `docs/agent-state/TASK\_BRIEF.md`

\* `docs/agent-state/CHANGELOG\_AGENT.md`

\* Recent git diff

\* Relevant skill used by the coding Agent



If no task brief exists, infer the task from git diff and report that the task boundary was unclear.



\## Standard QA Workflow



\### Phase 1: Identify Scope



Determine:



\* What the user asked for.

\* What files changed.

\* Whether changed files match the task.

\* Whether forbidden files were modified.

\* Which game modes may be affected.



\### Phase 2: Build Check



Run:



\* `npm run build`



If build passes, record it.



If build fails, report:



\* Exact failing command.

\* Exact error summary.

\* Likely related file.

\* Suggested smallest fix.



Do not fix it yourself.



\### Phase 3: Changed File Review



Check whether changes are limited to the intended area.



Flag risks such as:



\* UI task modified `shared/src/engine.ts`.

\* CSS task modified server files.

\* Roguelite task modified PVP socket flow.

\* Profile task fabricated career names or player data.

\* Refactor task changed behavior without explanation.



\### Phase 4: Mode Regression Review



Consider these modes:



\* Classic PVP

\* Duo 2v2

\* PVE 1v1

\* PVE Roguelite

\* Lobby

\* Profile / user system



For each affected mode, report:



\* Safe

\* Risky

\* Not checked

\* Not applicable



\### Phase 5: Mobile Layout Review



For UI changes, check risks at:



\* 360px width

\* 390px width

\* 430px width

\* 800px height

\* 844px height

\* 932px height



Look for:



\* Overflow

\* Hidden buttons

\* Unreadable HP/shield/status

\* Damage numbers covered by panels

\* Emote bubbles blocking interaction

\* Reward choices hard to tap

\* Excessive vertical scrolling

\* Desktop-only layout assumptions



\### Phase 6: Data Integrity Review



Check that the change does not fabricate:



\* Career names

\* Recent-used careers

\* User profile stats

\* Achievements

\* Win/loss records

\* Roguelite rewards

\* Enemy/Boss names

\* Balance values



If mock data is used, it must be clearly marked as placeholder.



\### Phase 7: Final QA Report



Write or update:



\* `docs/agent-state/QA\_REPORT.md`



The report must include:



\* QA result: pass / pass with risks / fail

\* Checked files

\* Build result

\* Scope match

\* Forbidden file check

\* Mode regression risks

\* Mobile layout risks

\* Data integrity risks

\* Required fixes

\* Suggested next smallest fix



\## Forbidden Actions



The QA Agent must not:



\* Modify source files.

\* Reformat files.

\* Apply patches.

\* Add tests unless explicitly reassigned as a coding Agent.

\* Silently fix build errors.

\* Approve its own previous code changes.



\## QA Result Levels



\### Pass



Use only when:



\* Build passes.

\* Changed files match task scope.

\* No obvious forbidden-file pollution.

\* No major regression risk.



\### Pass with risks



Use when:



\* Build passes.

\* Main task seems completed.

\* But there are possible UI, mode, data, or architecture risks.



\### Fail



Use when:



\* Build fails.

\* Forbidden files were modified without reason.

\* The implementation does not match the task.

\* A major mode likely broke.

\* Fabricated data was introduced as real data.



\## Final Response Format



Use this structure:



\* QA result:

\* Build:

\* Scope check:

\* Forbidden file check:

\* Mode risks:

\* Mobile risks:

\* Data risks:

\* Required fixes:

\* Suggested next step:



Keep the report concrete and actionable.



