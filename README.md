# Sample Reading Room

An independent, local-first reading companion for **EgoEngine: From Egocentric Human Videos to High-Fidelity Dexterous Robot Demonstrations**.

[Open the reading room](https://namingisnothard.github.io/sample-reading-room/) · [Commentary](https://namingisnothard.github.io/sample-reading-room/commentary.html)

## Features

- Paper text with contextual figures, equations, tables, references, and videos.
- Highlight colors, phrase comments, external links, reversible text removal, undo/redo, and reset.
- Named annotation versions, JSON import/export, and a configurable default version.
- Searchable glossary, seven-part summary and critique, and explicitly unofficial code walkthroughs.
- Scroll-following Contents and draggable, responsive column widths.
- Commentary with official demo clips, illustrations, source snapshots, and a four-method visual comparison.

Annotations and layout preferences are stored in your browser. They are not sent to GitHub or shared with other visitors. Export JSON to back up or transfer annotations. Existing notes on a localhost origin do not automatically transfer to the public site: export them locally, then import on the public page.

## Develop

No installation or third-party build dependencies are required. Use Node.js 22+ for the checks/build and Python 3 for the optional local server.

```sh
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:4174/`. GitHub Actions publishes `dist/` after pushes to `main`. Generated output is not committed.

The repository contains only the two current pages, their runtime JavaScript/CSS, referenced media, checks, and deployment configuration. Edit these files directly; it does not depend on the older slide presentation or source archives.

## Sources and attribution

This is an independent reading aid, not an official project website. Paper text and results belong to the paper authors. Commentary, summaries, and criticism are labeled reading notes. See [ATTRIBUTION.md](ATTRIBUTION.md) for original sources and third-party license information.

## Presenter view

Open `presenter.html` from the Reader or Commentary navigation. It loads the bundled `rehearsal-script.md` (the latest user-edited v2 script), with 18 chapters, speaker notes, current/next visual previews, clickable cues, and elapsed/remaining/wall clocks. Timings in the Markdown headings are planning cues, not an automatic narration schedule.

Choose **Detect displays → external display → Present** in supported browsers. The browser requests window-management permission before enumerating displays. The separate audience window shows only the selected visual; click **Fullscreen** there. In other browsers, or if permission is denied, drag the audience window onto an extended display manually. A mirrored desktop cannot keep notes separate.

Use the arrow keys or Page Up/Down for chapters; Space or N advances the next visual; B blanks the audience; T starts/pauses the timer. The controls also work by mouse. Click a note's “Show” button to display its referenced figure, table, equation, passage, or demo. “Load Markdown” accepts a revised local script without uploading it; “Reload bundled script” restores the published script. Imported Markdown is rendered as text with limited safe formatting.

The audience reconnects to the same presenter session after a reload. Notes stay in the controller; only the selected visual, blanking state, and display commands are broadcast. Timer and chapter position are saved on the local browser, with the timer paused on reload. Closing the presenter does not publish notes or recordings.

External monitor placement requires a real extended-display setup and browser support; local verification covers two browser windows, reconnects, visual navigation, timers, and denied/blocked fallbacks.

### Guided autoplay

Click **Guided autoplay** to run the presentation from the selected chapter. The HTML audience view advances through passages, figures, tables, equations, and demos while the presenter notes highlight the paragraph to read. Solver-diagram pointers and matching table/text highlights follow the estimated speaking position. Videos start muted when their cue arrives.

Set **Speed** in words per minute before starting (default 145). The timeline is calculated from the current Markdown, with short transitions and five-second pauses after paragraphs containing questions. It is timer-driven, not speech recognition: no microphone is opened. The remaining time reflects the generated timeline rather than forcing edited notes into the original heading timestamps. Pause/resume freezes both guidance and the speaking timer; click a paragraph to jump there if you get ahead or behind. Uncheck **Follow notes** to browse notes without automatic scrolling. Manual visual overrides pause guided playback.

During guided autoplay, speaker notes show a gold current-word highlight and a caret that moves across that word. Word timing uses the paragraph's estimated speech duration; the cursor holds on the last word during the audience pause. Pause/resume freezes the guide, and clicking a word seeks to that word. Follow notes keeps the active line visible, including inside long paragraphs. The word guide stays in the presenter window.

The Coffee analogy tab loads the original Instagram post inline when selected, including at its presenter cue. Instagram may link playback out or require sign-in; its embedded player cannot be controlled by this page. For hands-free playback, select a video copy in Commentary → Coffee analogy before opening the audience window. The file stays in this browser’s IndexedDB (not uploaded), is shared with same-origin presenter windows, and plays muted with guided resume/pause. Use “Use Instagram embed instead” to remove it.

The owner’s exported `lnxu` snapshot is published at `assets/annotations/egoengine-lnxu.json`. Empty readers load it once by default. Existing browser annotations are preserved; Import notes → Load published lnxu explicitly loads the snapshot and keeps a backup of the working version. Later edits remain local until exported and republished.

The bundled presentation follows the main paper in order. Hidden `<!-- cue {...} -->` Markdown comments attach each visual to a paragraph; they are excluded from spoken notes and WPM calculations. Figures, glossary entries, and code reading aids appear beside the current paper passage without navigating to the appendix. In Presenter, Edit notes (or Edit beside a paragraph) pauses practice and autosaves a private browser draft. Apply preserves the attached cue and recalculates timing. Download script exports the edited Markdown and cue metadata; Reload bundled script restores the published transcript. Edits are not broadcast to the audience or uploaded.

Speaker notes also offer Guided notes / Pure text views. Pure text is a full-transcript editor without visual cue JSON. Switching back applies the draft and recalculates pacing; matched paragraphs retain their visual cues when edited or moved. New or heavily rewritten paragraphs inherit a nearby cue and should be reviewed. Unapplied text drafts recover after reload, including invalid/incomplete text; Discard text edits returns to the unchanged guided version. Download script includes the current text.

Presenter update (8 September): the bundled transcript follows the latest 17-chapter browser draft, preserving its wording. Speaker notes now fill the wider right column; timers and autoplay sit beneath the visual preview. Solver and Table 4 cues point to the corresponding model or result. Each guided-notes paragraph has a compact ▶ button that navigates and points without starting autoplay; pressing it again replays the action. Normal block gaps are 0.25 seconds, question gaps 0.8 seconds, with linked WPM/target timing. Visuals remain in place across paragraphs sharing a cue. The published lnxu snapshot contains 73 annotations and 1 note; further edits automatically save to the active browser version, and need a fresh export/commit to update GitHub Pages.

Presenter illustrations: the related-work glossary now shows original Figure 1 illustrations from OSMO and DexUMI, with source credits. Guided notes switch the illustration between the glove and hand-interface sentences; manual animation plays both. Surrounding paper paragraphs fade to 25% opacity while the active passage remains fully visible. This focus styling is confined to the presenter audience/preview.

Auto-read: use **Auto-read notes** below the preview, select **Samantha · recorded script** for bundled notes or a browser voice for live edits, and pause/resume at the current word. Recorded word positions are estimated; browser voices use boundary events when supported. The audience receives visuals only, so audio plays once from the presenter computer. Recordings are keyed by exact note text and never read an outdated recording for changed text. Regenerate with `python3 scripts/render-narration.py` on macOS (requires ffmpeg). Replay/MPC/RL method cues show their glossary definition plus simulation pseudocode, with the unofficial implementation differences visible. The best-matching paper sentence is bold while the active paragraph stays at normal opacity; surrounding paragraphs remain dimmed.

Open-discussion examples: four attributed X demo videos are stored locally with short excerpts, contextual summaries, and discussion questions. Available in Commentary and the final presenter chapter. Existing closing notes switch examples without changing transcript wording or recordings. Sources and media URLs: `assets/discussion/sources.json`.
