# Attention Survival Log
*How We Feed, Shape and Care for Attention*

**By Shiyu Lin**

## Overview
This interactive experiment translates attentional states into a digital life system. In a micro-ecosystem shaped by the audience's gaze, every look, lingering gaze, and turn away rewrites its balance.

**Live version:** [Enter the shared ecology on Render](https://attention-ecology-shared.onrender.com)
**Project demo:** [Watch the demonstration video](https://vimeo.com/1153044753?fl=tl&fe=ec)

![Project Visual Overview](<Main image.png>)
*Project Visual Overview*

## How to Participate
1. Open the Render version in a desktop browser and allow **camera** access.
2. Click Enter the Ecology.
3. Calibrate your **head and eyes**.
4. Move your head and eyes to guide the attention target.
5. Guide the target onto a lifeform.

Try looking briefly, holding your gaze, or closing your eyes.

▶Where you choose to place your attention determines which life you feed.


## Project Concept
Treating the **attention crisis** as a problem of personal efficiency obscures its public and environmental dimensions.

This project imagines attention as a digital ecology collectively shaped and cared for by its participants. Attention can nurture different lifeforms, but can also reinforce mechanisms of capture. As attention-seeking systems grow more effective, freedom of attention means not only choosing where to look, but also being able to disengage, shift, and return to quiet.

The work invites participants **to recognise attention capture and reclaim space for focus, mind-wandering, and rest.**


## Lifeforms and Attentional States
The character system draws on **cellular functional differentiation**, in which specialised cells support the stability and adaptability of a larger system (Alberts et al., 2015). Its forms and behaviours also reference **cellular dynamics** (Allen Institute, 2017): Deep Diver evokes cell division, while Guardian draws on immune-cell tracking and engulfment.

Each character translates an attentional state into personality, interaction, and ecological behaviour. Every lifeform begins as an undifferentiated **Basic Cell** and differentiates through interaction. These changes persist in the ecology, shaping the world encountered by later participants.

1. **Predator** represents stimulus-driven, impulsive attention (Corbetta and Shulman, 2002) and responds to critiques of attention merchants and persuasive systems (Wu, 2016; Williams, 2018). Notification-like lures show how attention can be attracted and captured.

2. **Parasite** represents attention residue after task switching (Leroy, 2009). It attaches to attention paths and nearby lifeforms, showing how unfinished thoughts occupy attentional space.

3. **Roamer** represents low-arousal, non-goal-directed attention and supports recovery. It draws on mind-wandering research (Schooler et al., 2011) and Attention Restoration Theory, particularly soft fascination and being away (Kaplan, 1995).

4. **Deep Diver** represents sustained attention, drawing on Posner and Petersen (1990).

5. **Guardian** represents attentional recovery and low-disturbance protection, drawing on Attention Restoration Theory (Kaplan, 1995) and Calm Technology (Weiser and Brown, 1996). It helps restore attentional space by limiting dominant species and supporting less dominant lifeforms.


## Shared Ecology and Privacy
On Render, WebSocket and PostgreSQL support **a shared ecology across devices**. Each participant enters a world shaped by previous visitors, and their attention influences what later participants experience. Detailed interactions are stored in the browser as the Attention Survival Log and can be exported as readable JSON by pressing `S`.

**Privacy notice:** The camera detects only simple interaction states in real time, such as participant count and head position. It does not record or store images or collect any personally identifiable information.

### Exhibition Log Samples
- [Full day, 28 August 2026](log-2026-08-28-full-day.json): Of more than 1,200 entries, around 70% concern Predators and Parasites. Repeated capture and residue gradually accumulated into ecological imbalance, reducing the space available to other attentional states.
- [17:45-19:45, 29 August 2026](log-2026-08-29-1745-1945.json): Of approximately 540 entries, around 89% concern Predators, Parasites, and Roamers. Attention mainly cycled between capture, residue, and wandering.


## Technical Implementation
The browser renders the ecology with **p5.js**, while **ml5.js FaceMesh** extracts facial landmarks locally for project-specific head and gaze estimation. The **Web Audio API** generates sound feedback. **IndexedDB** and **localStorage** preserve local records and continuity state; **Node.js, WebSocket, PostgreSQL, and Render** support the online shared ecology.

### Code Architecture and Data Flow
![Attention Survival Log code architecture and data flow](<Code Structure Diagram.jpg>)
*Figure: Relationships among the browser runtime, ecological system, local storage, and shared Render server.*


## Supplementary Keyboard Shortcuts
These hidden shortcuts support development, testing, and fallback modes rather than the core participant experience.

- `S`: Export the current browser's interaction log.
- `Shift + S`: Export a readable version of the Render shared ecology history (administrator access required).
- `B`: Switch to the cursor-based fallback mode.
- `G`: Switch to head-and-eye mode.
- `M`: Enable experimental multi-participant mode. Because it was not sufficiently stable during on-site testing, the project uses single-participant mode by default.


## Acknowledgements and Licence
The project uses p5.js, ml5.js, PostgreSQL, and the Web Audio API; licences for third-party libraries and fonts are included in `vendor/`. I also used ChatGPT (OpenAI) for code debugging and understanding; functions modified with AI assistance are identified in the code comments.

Copyright © 2026 Shiyu Lin. The project's original code, visuals, architecture diagram, documentation, and exhibition log samples **may be used, modified, and redistributed** with credit to “Attention Survival Log by Shiyu Lin”, a link to the original project, and an indication of any changes. The original code is licensed under the MIT License; other original content is licensed under CC BY 4.0. Third-party libraries and fonts remain subject to their respective licences.


## References
Alberts, B., Johnson, A., Lewis, J., Morgan, D., Raff, M., Roberts, K. and Walter, P. (2015) *Molecular Biology of the Cell*. 6th edn. New York: Garland Science. Available at: https://www.ncbi.nlm.nih.gov/books/NBK21054/ (Accessed: 1 May 2026).

Allen Institute (2017). *Nuclear envelope visualized via lamin B1*. Allen Cell Explorer. Available at: https://www.allencell.org/cell-observations/nuclear-envelope-visualized-via-lamin-b1 (Accessed: 16 July 2026).

Corbetta, M. and Shulman, G. L. (2002) ‘Control of goal-directed and stimulus-driven attention in the brain’, *Nature Reviews Neuroscience*, 3(3), pp. 201–215. https://doi.org/10.1038/nrn755

Kaplan, S. (1995) ‘The restorative benefits of nature: Toward an integrative framework’, *Journal of Environmental Psychology*, 15(3), pp. 169–182. https://doi.org/10.1016/0272-4944(95)90001-2

Leroy, S. (2009) ‘Why is it so hard to do my work? The challenge of attention residue when switching between work tasks’, *Organizational Behavior and Human Decision Processes*, 109(2), pp. 168–181. https://doi.org/10.1016/j.obhdp.2009.04.002

MDN Web Docs (n.d.) *IndexedDB API*. https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

ml5.js (2024) *Face Mesh with ml5.js*. https://docs.ml5js.org/#/reference/facemesh

Posner, M. I. and Petersen, S. E. (1990) ‘The attention system of the human brain’, *Annual Review of Neuroscience*, 13, pp. 25–42. https://doi.org/10.1146/annurev.ne.13.030190.000325

Schooler, J. W. et al. (2011) ‘Meta-awareness, perceptual decoupling and the wandering mind’, *Trends in Cognitive Sciences*, 15(7), pp. 319–326. https://doi.org/10.1016/j.tics.2011.05.006

W3C Audio Working Group (2021) *Web Audio API*. W3C Recommendation, 7 August. https://www.w3.org/TR/webaudio/

Weiser, M. and Brown, J. S. (1996) *The Coming Age of Calm Technology*. Xerox PARC, 5 October. https://calmtech.com/papers/coming-age-calm-technology

Williams, J. (2018) *Stand Out of Our Light: Freedom and Resistance in the Attention Economy*. Cambridge: Cambridge University Press. Available at: https://www.cambridge.org/core/books/stand-out-of-our-light/3F8D7BA2C0FE3A7126A4D9B73A89415D (Accessed: 18 May 2026).

Wu, T. (2016) *The Attention Merchants: The Epic Scramble to Get Inside Our Heads*. New York, NY: Alfred A. Knopf. https://scholarship.law.columbia.edu/books/64/
