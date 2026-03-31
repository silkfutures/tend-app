export const STEPS = ["Reset", "Reframe", "Rebuild", "Release", "Rise"];

export const STEP_COLORS = {
  Reset: "#2563EB",
  Reframe: "#7C3AED",
  Rebuild: "#047857",
  Release: "#C2410C",
  Rise: "#B45309",
};

export const STEP_SUBTITLES = {
  Reset: "Stabilising the Inner World",
  Reframe: "Rewriting Identity & Belief Systems",
  Rebuild: "Discipline, Skills & Creative Practice",
  Release: "A Responsible & Self-Aware Creative Voice",
  Rise: "Leadership, Contribution & Influence",
};

export const PARTNER_ORGS = [
  "SilkFutures",
  "Set Pace",
  "Grangetown Project",
  "Ely Project",
  "St Mellons",
];

export const SCALE_LABELS = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

export const QUICK_FIELDS = [
  {
    key: "emotionalState",
    label: "Emotional State",
    color: "#C97070",
    labels: {
      1: "Distressed or shut down",
      2: "Unsettled",
      3: "Stable and present",
      4: "Calm and open",
      5: "Deeply grounded",
    },
  },
  {
    key: "engagement",
    label: "Engagement",
    color: "#2563EB",
    labels: {
      1: "Disengaged",
      2: "On/off",
      3: "Mostly engaged",
      4: "Fully engaged",
      5: "Driving the session",
    },
  },
  {
    key: "confidence",
    label: "Creative Confidence",
    color: "#E8A44A",
    labels: {
      1: "Won't express themselves",
      2: "Needs encouragement",
      3: "Expressing with confidence",
      4: "Taking creative risks",
      5: "Owning their voice completely",
    },
  },
  {
    key: "relationalConnection",
    label: "Trust & Openness",
    color: "#6BAF7C",
    labels: {
      1: "Guarded, walls up",
      2: "Surface-level",
      3: "Genuine, honest",
      4: "Vulnerable, real",
      5: "Deep mutual trust",
    },
  },
  {
    key: "reflection",
    label: "Willingness to Reflect",
    color: "#7C3AED",
    labels: {
      1: "Deflects all reflection",
      2: "Engages when prompted",
      3: "Reflects with support",
      4: "Actively self-aware",
      5: "Initiating their own insight",
    },
  },
];

export const FORM_SECTIONS = {
  Reset: {
    subsections: [
      {
        title: "Consistency & Engagement",
        subtitle: "Turns up, stays present, participates",
        indicators: [
          "Generally arrives on time and ready to engage",
          "Stays present and focused through the session",
          "Follows what's being asked without needing constant redirection",
          "Actively takes part rather than withdrawing or switching off",
        ],
      },
      {
        title: "Emotional Regulation",
        subtitle: "Can calm, manage reactions, reduce conflict",
        indicators: [
          "Seems to be managing frustration or difficulty without blowing up",
          "Responds to feedback or correction without shutting down or escalating",
          "Shows some ability to pause or calm themselves when emotions rise",
          "Avoids unnecessary conflict with peers or mentors",
        ],
      },
      {
        title: "Safety & Trust",
        subtitle: "Respects boundaries, builds safe relationships",
        indicators: [
          "Respects personal, physical, and verbal boundaries",
          "Follows agreed safety rules and guidance",
          "Interacts with others in a way that feels safe and appropriate",
          "Seems honest and reliable in how they show up",
        ],
      },
      {
        title: "Detaching from Harmful Influences",
        subtitle: "Making safer choices around people and environments",
        indicators: [
          "Seems to be moving away from harmful behaviours or peer influences",
          "Appears to be making choices that support their wellbeing generally",
          "Shows some awareness of the difference between safer and riskier choices",
          "Seems more willing to choose positive environments and people",
        ],
      },
      {
        title: "Help-Seeking",
        subtitle: "Reaches out for support rather than masking or shutting down",
        indicators: [
          "Asks for help or support when they need it",
          "Communicates when struggling rather than pretending everything's fine",
          "Accepts offered support without brushing it off",
          "Trusts the mentor or group enough to be honest about how they're doing",
        ],
      },
    ],
  },
  Reframe: {
    subsections: [
      {
        title: "Self-Awareness",
        subtitle: "Recognises triggers, patterns, emotions",
        indicators: [
          "Can name or describe how they're feeling when asked",
          "Shows awareness of their own triggers or recurring patterns",
          "Reflects on their own behaviour rather than blaming everyone else",
          "Starting to see how emotions drive their actions",
        ],
      },
      {
        title: "Lyrics & Creative Reflection",
        subtitle: "Themes show maturity and self-awareness",
        indicators: [
          "Creative output reflects personal insight or genuine reflection",
          "Themes are moving beyond surface-level toward meaning or growth",
          "Expresses thoughts and emotions with more clarity or intention",
          "Work shows a personal perspective rather than just copying others",
        ],
      },
      {
        title: "Responsibility & Accountability",
        subtitle: "Owns actions, choices, impact",
        indicators: [
          "Acknowledges their role in outcomes or situations",
          "Takes responsibility for mistakes without deflecting or downplaying",
          "Recognises how their actions affect other people",
          "Shows willingness to put things right or adjust their approach",
        ],
      },
      {
        title: "Future Orientation",
        subtitle: "Talks about goals, change, next steps",
        indicators: [
          "Talks about goals, aspirations, or things they want to change",
          "Can identify realistic next steps or areas to work on",
          "Shows hope, direction, or intention for the future",
          "Curious about progression, opportunities, or what's possible",
        ],
      },
      {
        title: "Separating Past from Present Self",
        subtitle: "Distinguishes who they were from who they are becoming",
        indicators: [
          "References their past with reflection rather than being stuck in it",
          "Uses language that separates old patterns from current choices",
          "Shows awareness that their identity isn't fixed by their history",
          "Believes change is possible and already happening for them",
        ],
      },
    ],
  },
  Rebuild: {
    subsections: [
      {
        title: "Commitment & Reliability",
        subtitle: "Shows up prepared, keeps commitments",
        indicators: [
          "Arrives prepared with the right mindset or materials",
          "Follows through on attendance and session expectations",
          "Honours commitments made to mentors or the group",
          "Dependable rather than pulling out or avoiding at the last minute",
        ],
      },
      {
        title: "Follow-Through",
        subtitle: "Completes tasks, projects, creative work",
        indicators: [
          "Completes tasks or exercises within the session",
          "Follows through on agreed actions between sessions",
          "Sticks with tasks even when they get challenging",
          "Makes the effort to finish what they start rather than abandoning it",
        ],
      },
      {
        title: "Skill Development & Standards",
        subtitle: "Quality improves, responds to feedback",
        indicators: [
          "Showing improvement in skill, technique, or understanding",
          "Responds constructively to feedback and instruction",
          "Shows care for quality rather than rushing or cutting corners",
          "Applies guidance to refine their work or performance",
        ],
      },
      {
        title: "Response to Challenge or Failure",
        subtitle: "Bounces back from setbacks, mistakes, or difficult sessions",
        indicators: [
          "Responds to difficulty without giving up or shutting down",
          "Acknowledges mistakes without excessive self-criticism or deflection",
          "Re-engages after a setback rather than withdrawing",
          "Keeps trying even when outcomes are frustrating",
        ],
      },
    ],
  },
  Release: {
    subsections: [
      {
        title: "Mature Creative Expression",
        subtitle: "Themes show growth, insight, responsibility",
        indicators: [
          "Creative output reflects thought, intention, or genuine reflection",
          "Themes show growth, learning, or increased self-awareness",
          "Content avoids glorifying harm, exploitation, or risky behaviour",
          "Shows care about how their message might land with others",
        ],
      },
      {
        title: "Communication & Emotional Insight",
        subtitle: "Expresses feelings clearly and respectfully",
        indicators: [
          "Able to express thoughts or feelings clearly",
          "Communicates emotions without aggression, withdrawal, or disrespect",
          "Uses appropriate language when discussing sensitive topics",
          "Aware of how their words may affect other people",
        ],
      },
      {
        title: "Positive Peer Influence",
        subtitle: "Encourages others, models respect",
        indicators: [
          "Interacts with peers in a supportive and respectful way",
          "Encourages others' participation or confidence",
          "Models positive behaviour during group activities",
          "Avoids language or actions that undermine others",
        ],
      },
      {
        title: "Intentionality in Creative Choices",
        subtitle: "Makes deliberate, conscious artistic decisions",
        indicators: [
          "Makes conscious choices about words, themes, or delivery rather than defaulting to habit",
          "Can explain why they made a particular creative choice when asked",
          "Shows awareness of the difference between expression and impact",
          "Owns their creative voice as something deliberate and evolving",
        ],
      },
    ],
  },
  Rise: {
    subsections: [
      {
        title: "Leadership & Support of Others",
        subtitle: "Supports peers, especially younger participants",
        indicators: [
          "Offers help, encouragement, or guidance to others without being asked",
          "Shows patience and respect when supporting peers",
          "Looks out for the wellbeing or inclusion of younger or less confident participants",
          "Contributes positively to group morale and cooperation",
        ],
      },
      {
        title: "Role Modelling & Integrity",
        subtitle: "Reliable, trustworthy, sets positive tone",
        indicators: [
          "Consistently models respectful and appropriate behaviour",
          "Follows rules and expectations even when no one's watching",
          "Acts with honesty and integrity in their interactions",
          "Helps set or maintain a positive tone within the group",
        ],
      },
      {
        title: "Representation & Responsibility",
        subtitle: "Represents SilkFutures/SetPace positively on/offline",
        indicators: [
          "Represents the programme positively through behaviour and language",
          "Aware that their actions reflect on the group or organisation",
          "Shows responsibility when in public, community, or online spaces",
          "Avoids behaviour that could negatively impact others or the programme",
        ],
      },
      {
        title: "Integrity Under Pressure",
        subtitle: "Maintains values and leadership when challenged or tested",
        indicators: [
          "Maintains respectful behaviour when peers push back or test boundaries",
          "Holds their position or values calmly without becoming reactive",
          "De-escalates or redirects tension rather than feeding it",
          "Leadership doesn't depend on conditions being easy",
        ],
      },
    ],
  },
};

// ── ONBOARDING QUESTIONS ─────────────────────
// Conversational questions that covertly map to pathway stages.
// Each answer scores toward one or more stages.
// The mentor works through these naturally in a first session.
export const ONBOARDING_QUESTIONS = [
  {
    id: "show_up",
    question: "How do you feel about being here today?",
    context: "Just checking in — no wrong answer",
    options: [
      { label: "Didn't really want to come", scores: { Reset: 1 } },
      { label: "Not sure yet", scores: { Reset: 2 } },
      { label: "I'm alright with it", scores: { Reset: 3 } },
      { label: "I actually wanted to come", scores: { Reset: 4 } },
    ],
  },
  {
    id: "trust",
    question: "When things get difficult, what do you usually do?",
    context: "Think about the last time something went wrong",
    options: [
      { label: "Kick off / walk out / shut down", scores: { Reset: 1 } },
      { label: "Keep it to myself", scores: { Reset: 2 } },
      { label: "Talk to someone I trust", scores: { Reset: 3, Reframe: 2 } },
      { label: "Try to figure out what happened and why", scores: { Reset: 4, Reframe: 3 } },
    ],
  },
  {
    id: "influences",
    question: "Who do you spend most of your time with?",
    context: "Not about judging — just getting a picture",
    options: [
      { label: "People who get me into trouble sometimes", scores: { Reset: 1 } },
      { label: "Mix of people — some good, some not", scores: { Reset: 2 } },
      { label: "Mostly people who are alright", scores: { Reset: 3 } },
      { label: "People who push me to be better", scores: { Reset: 4, Rebuild: 2 } },
    ],
  },
  {
    id: "self_awareness",
    question: "Do you know what sets you off — what makes you angry or upset?",
    context: "Everyone has triggers",
    options: [
      { label: "Not really — it just happens", scores: { Reframe: 1 } },
      { label: "Sometimes I can tell after", scores: { Reframe: 2 } },
      { label: "Yeah I know what my triggers are", scores: { Reframe: 3 } },
      { label: "I know them and I'm working on managing them", scores: { Reframe: 4 } },
    ],
  },
  {
    id: "identity",
    question: "Do you feel like you're the same person you were a year ago?",
    context: "People change — or don't. Both are real",
    options: [
      { label: "Yeah, nothing's really changed", scores: { Reframe: 1 } },
      { label: "Maybe a bit different but not really", scores: { Reframe: 2 } },
      { label: "I've changed in some ways", scores: { Reframe: 3 } },
      { label: "I'm definitely different — I've grown", scores: { Reframe: 4, Rebuild: 2 } },
    ],
  },
  {
    id: "goals",
    question: "If someone asked you what you want to be doing in a year, what would you say?",
    context: "Doesn't have to be a career — just where you're headed",
    options: [
      { label: "No idea / don't think about it", scores: { Reframe: 1 } },
      { label: "I've got some vague ideas", scores: { Reframe: 2 } },
      { label: "I know what I want but not how to get there", scores: { Reframe: 3, Rebuild: 2 } },
      { label: "I've got a plan and I'm working on it", scores: { Reframe: 4, Rebuild: 3 } },
    ],
  },
  {
    id: "commitment",
    question: "When you start something — a project, a song, a plan — do you usually finish it?",
    context: "Be honest, not what you think I want to hear",
    options: [
      { label: "Nah, I get bored or give up", scores: { Rebuild: 1 } },
      { label: "Sometimes, if it's something I care about", scores: { Rebuild: 2 } },
      { label: "Most of the time I see it through", scores: { Rebuild: 3 } },
      { label: "Yeah — I finish what I start", scores: { Rebuild: 4 } },
    ],
  },
  {
    id: "feedback",
    question: "How do you feel when someone gives you feedback or tells you to do something differently?",
    context: "Like a mentor, teacher, or someone in charge",
    options: [
      { label: "I don't take it well — feels like an attack", scores: { Rebuild: 1, Reset: 1 } },
      { label: "Depends who's saying it", scores: { Rebuild: 2 } },
      { label: "I can usually take it on board", scores: { Rebuild: 3 } },
      { label: "I want feedback — it helps me improve", scores: { Rebuild: 3, Release: 2 } },
    ],
  },
  {
    id: "expression",
    question: "If you made a song or wrote something, what would it be about?",
    context: "First thing that comes to mind",
    options: [
      { label: "Money, status, looking good", scores: { Release: 1 } },
      { label: "What I've been through — the struggle", scores: { Release: 2, Reframe: 2 } },
      { label: "How I'm feeling right now — real stuff", scores: { Release: 3, Reframe: 3 } },
      { label: "Something that might help someone else hear it", scores: { Release: 4, Rise: 2 } },
    ],
  },
  {
    id: "others",
    question: "Do you look out for other people — younger ones, friends going through stuff?",
    context: "Not what you should do — what you actually do",
    options: [
      { label: "Not really my thing", scores: { Rise: 1 } },
      { label: "For close friends, yeah", scores: { Rise: 2 } },
      { label: "I try to — I notice when people need help", scores: { Rise: 3 } },
      { label: "Yeah — I naturally step up for others", scores: { Rise: 4, Release: 3 } },
    ],
  },
];

// ── SPARK CARDS (Core Deck) ─────────────────
// For young people looking for inspiration — finding ideas, themes, titles, directions.
// Used BEFORE or AT THE START of creative work. Open-ended, imaginative, permission-giving.
// AI generates additional contextual cards alongside these.
export const SPARK_CARDS_CORE = [
  {
    id: "spark_1",
    question: "When you realized someone wasn't who you thought",
    hint: "Write about the moment you realized someone was different from who you believed them to be. What changed? How did you see them before, and what do you see now?",
    mapsTo: "Reflection / Relationships",
    depth: 2,
  },
  {
    id: "spark_2",
    question: "The first time you felt properly betrayed",
    hint: "Write about a time someone let you down in a way that stayed with you. It doesn't have to be dramatic — small betrayals count too.",
    mapsTo: "Memory / Trust",
    depth: 2,
  },
  {
    id: "spark_3",
    question: "A time you should've said something but didn't",
    hint: "Write about a moment you stayed quiet when you wish you'd spoken up. What would you have said if you could go back?",
    mapsTo: "Regret / Voice",
    depth: 2,
  },
  {
    id: "spark_4",
    question: "The moment you knew a friendship was done",
    hint: "Write about when you realized a friendship had run its course. Was there a specific moment, or did it fade slowly?",
    mapsTo: "Relationships / Loss",
    depth: 2,
  },
  {
    id: "spark_5",
    question: "Someone who changed you but doesn't know it",
    hint: "Write about someone who had an impact on your life but has no idea. What did they do or say that stuck with you?",
    mapsTo: "Identity / Influence",
    depth: 2,
  },
  {
    id: "spark_6",
    question: "Why you stopped doing something you used to love",
    hint: "Write about something you once cared about but walked away from. What made you stop? Do you miss it?",
    mapsTo: "Loss / Change",
    depth: 2,
  },
  {
    id: "spark_7",
    question: "Someone you miss that you can't get back",
    hint: "Write about a person, place, or time in your life that's gone and can't be retrieved. What would you say to that version of your life if you could?",
    mapsTo: "Grief / Nostalgia",
    depth: 3,
  },
  {
    id: "spark_8",
    question: "A version of yourself you left behind",
    hint: "Write a letter to a past version of yourself — the one you used to be before something changed. What would you tell them?",
    mapsTo: "Identity / Growth",
    depth: 3,
  },
  {
    id: "spark_9",
    question: "A letter to someone you care about",
    hint: "Write to someone important to you, living or not. Say what you've never said out loud.",
    mapsTo: "Relationships / Honesty",
    depth: 3,
  },
  {
    id: "spark_10",
    question: "Something you do that you know is toxic but can't stop",
    hint: "Write about a habit, pattern, or behavior you know isn't good for you but you keep doing anyway. Be honest.",
    mapsTo: "Self-awareness / Patterns",
    depth: 3,
  },
  {
    id: "spark_11",
    question: "What you're pretending not to care about",
    hint: "Write about something that actually bothers you more than you let on. Why are you hiding it?",
    mapsTo: "Honesty / Defence",
    depth: 2,
  },
  {
    id: "spark_12",
    question: "The unspoken rules of your friend group",
    hint: "Write about the invisible rules everyone follows but no one talks about. What happens if someone breaks them?",
    mapsTo: "Social dynamics / Belonging",
    depth: 2,
  },
  {
    id: "spark_13",
    question: "Something everyone pretends is normal but is actually mad",
    hint: "Write about something people act like is fine but really isn't. Call it out.",
    mapsTo: "Truth / Observation",
    depth: 2,
  },
  {
    id: "spark_14",
    question: "A lie you told that you still think about",
    hint: "Write about a lie you told that stuck with you. Why did you tell it? Do you regret it?",
    mapsTo: "Regret / Honesty",
    depth: 2,
  },
  {
    id: "spark_15",
    question: "What you're actually scared of",
    hint: "Write about a real fear — not spiders or heights, but something deeper. What would happen if it came true?",
    mapsTo: "Fear / Vulnerability",
    depth: 3,
  },
  {
    id: "spark_16",
    question: "What you'd tell yourself from 3 years ago",
    hint: "If you could send one message back to yourself three years ago, what would it be? One sentence or a whole paragraph — your choice.",
    mapsTo: "Wisdom / Reflection",
    depth: 2,
  },
  {
    id: "spark_17",
    question: "Give advice to a younger you",
    hint: "Write about what you wish someone had told you when you were younger. What did you have to figure out the hard way?",
    mapsTo: "Wisdom / Growth",
    depth: 2,
  },
  {
    id: "spark_18",
    question: "Write about someone who broke your trust",
    hint: "Write from the perspective of someone you trusted who let you down. What would you say to them?",
    mapsTo: "Betrayal / Truth",
    depth: 3,
  },
  {
    id: "spark_19",
    question: "A song about the place you grew up",
    hint: "Write about the streets, the sounds, the people. What does that place mean to you now?",
    mapsTo: "Place / Identity",
    depth: 2,
  },
  {
    id: "spark_20",
    question: "A song about home",
    hint: "Write about what 'home' means to you. Is it a place, a person, a feeling? Or is it something you're still searching for?",
    mapsTo: "Belonging / Identity",
    depth: 2,
  },
  {
    id: "spark_21",
    question: "Something you need to let go of but keep holding onto",
    hint: "Write about something — a grudge, a memory, a person — that you know you should release but can't. Why are you still carrying it?",
    mapsTo: "Release / Attachment",
    depth: 3,
  },
  {
    id: "spark_22",
    question: "A moment you wish you could take back",
    hint: "Write about something you said or did that you'd change if you could. What would you do differently?",
    mapsTo: "Regret / Redemption",
    depth: 2,
  },
  {
    id: "spark_23",
    question: "The last time you felt completely yourself",
    hint: "Write about a moment when you felt fully like yourself — no performance, no pretending. What were you doing? Who were you with?",
    mapsTo: "Authenticity / Identity",
    depth: 2,
  },
  {
    id: "spark_24",
    question: "A promise you made to yourself that you broke",
    hint: "Write about a commitment you made to yourself but didn't keep. What happened? Do you still want to keep it?",
    mapsTo: "Integrity / Self-trust",
    depth: 2,
  },
  {
    id: "spark_25",
    question: "What you'd do if no one was watching",
    hint: "Write about how you'd live if judgment, expectations, and opinions didn't exist. What would change?",
    mapsTo: "Freedom / Authenticity",
    depth: 2,
  },
  {
    id: "spark_26",
    question: "Someone who doesn't rate you — what would they say?",
    hint: "Write from the perspective of someone who doesn't think highly of you. What criticism would they give? Is any of it true?",
    mapsTo: "Perspective / Self-awareness",
    depth: 3,
  },
  {
    id: "spark_27",
    question: "A secret you're keeping from someone specific",
    hint: "Write about something you're hiding from a particular person. Why can't you tell them?",
    mapsTo: "Secrets / Honesty",
    depth: 3,
  },
  {
    id: "spark_28",
    question: "What changed after everything changed",
    hint: "Write about a turning point in your life — before and after. How are you different now?",
    mapsTo: "Transformation / Identity",
    depth: 2,
  },
  {
    id: "spark_29",
    question: "The first time you felt alone in a room full of people",
    hint: "Write about a moment of isolation even when surrounded by others. What made you feel disconnected?",
    mapsTo: "Loneliness / Belonging",
    depth: 3,
  },
  {
    id: "spark_30",
    question: "If you could delete one year, which one and why?",
    hint: "Write about a year you'd erase if you could. What happened that made it so hard?",
    mapsTo: "Hardship / Survival",
    depth: 3,
  },
];

// ── SIGNAL CARDS (Core Deck) ────────────────
// For young people working on refining their message — used DURING or AFTER creative work.
// These help a young person interrogate what they've just written or recorded.
// They're reflection-in-action prompts, not check-in questions.
// AI generates additional contextual cards alongside these.
export const SIGNAL_CARDS_CORE = [
  {
    id: "signal_1",
    question: "What is the emotion of this song? Can you convey it better?",
    hint: "Gets them to name the core feeling and consider if it's landing. Listen for clarity vs confusion.",
    mapsTo: "Emotional clarity / Expression",
    stage: "Reframe",
    depth: 2,
  },
  {
    id: "signal_2",
    question: "If the younger you heard this — would it help or harm them?",
    hint: "Checks the impact of their message on their past self. Reveals what they needed vs what they're giving.",
    mapsTo: "Self-awareness / Impact",
    stage: "Reframe",
    depth: 3,
  },
  {
    id: "signal_3",
    question: "If you played this to the person you care about most, what would they think?",
    hint: "Surfaces who matters and what their internal compass looks like. The answer reveals their values.",
    mapsTo: "Relationships / Values",
    stage: "Reframe",
    depth: 2,
  },
  {
    id: "signal_4",
    question: "If this was a conversation, what's one line that would summarise your message?",
    hint: "Cuts through the noise. Gets them to distill the core truth of what they're trying to say.",
    mapsTo: "Clarity / Message",
    stage: "Rebuild",
    depth: 2,
  },
  {
    id: "signal_5",
    question: "Every song has a target. Who are you really talking to with this one?",
    hint: "Gets them to name the audience. Often reveals who the song is actually for — and it's not who they first say.",
    mapsTo: "Intentionality / Audience",
    stage: "Release",
    depth: 2,
  },
  {
    id: "signal_6",
    question: "What does this track do for you? What are you hoping for by making it?",
    hint: "What need is the music meeting? Escape, expression, control, identity? Listen for what's underneath.",
    mapsTo: "Purpose / Need",
    stage: "Reframe",
    depth: 2,
  },
  {
    id: "signal_7",
    question: "If this song could only be heard by one person — who is it?",
    hint: "Reveals the emotional centre of the track. The answer often surprises them.",
    mapsTo: "Relationships / Vulnerability",
    stage: "Reframe",
    depth: 2,
  },
  {
    id: "signal_8",
    question: "What happened for you to make this?",
    hint: "Origin story. What life event, feeling, or moment sparked this track? Don't assume — let them tell you.",
    mapsTo: "Self-awareness / Context",
    stage: "Reframe",
    depth: 2,
  },
  {
    id: "signal_9",
    question: "Is this your authentic voice? What or who taught you to sound like this? How could you put more of 'you' in there?",
    hint: "Identity and influence check. Are they choosing this sound or defaulting to it? Opens the door to authenticity.",
    mapsTo: "Authenticity / Identity",
    stage: "Rebuild",
    depth: 3,
  },
  {
    id: "signal_10",
    question: "What could you say that would communicate your truth?",
    hint: "The big one. Separates the performance from the person. Use when trust is high.",
    mapsTo: "Truth / Vulnerability",
    stage: "Release",
    depth: 3,
  },
];

// ── PULSE CARDS (Core Deck) ─────────────────
// Three types: Unpack (surface what's going on), Spark (creative energy), Go Deeper (reflection).
// ── 64 PULSE CARDS (I Ching-inspired, youth-friendly) ───────
export const PULSE_CARDS_64 = [
  { theme: "POWER", question: "What's something you're good at that you don't show enough?", mantra: "I've got more in me than I let on" },
  { theme: "TRUST", question: "What would happen if you stopped trying to control everything and just let things play out?", mantra: "I don't have to force it" },
  { theme: "GRIT", question: "What's hard in your life right now that you're still pushing through?", mantra: "The struggle is part of the story" },
  { theme: "LEARNING", question: "What's something you pretend to know but actually don't — and what would it feel like to just say that?", mantra: "Asking questions is strength, not weakness" },
  { theme: "PATIENCE", question: "What are you rushing into that you know you're not ready for yet?", mantra: "My time is coming — I don't have to chase it" },
  { theme: "PEACE", question: "What's the argument inside your head that won't stop — and what would shut it up?", mantra: "I don't have to win every battle in my mind" },
  { theme: "FOCUS", question: "If you could only work on one thing for the next month, what would actually matter?", mantra: "One thing done well beats ten things half done" },
  { theme: "PEOPLE", question: "Who actually knows the real you — not the version you perform?", mantra: "The right people don't need the act" },
  { theme: "SMALL STEPS", question: "What's one tiny thing you could change today that would make tomorrow a bit better?", mantra: "Small moves still count" },
  { theme: "REALNESS", question: "If everyone could see everything you do — would you be proud of it all?", mantra: "I move the same whether people watch or not" },
  { theme: "FLOW", question: "When's the last time everything just clicked — what were you doing?", mantra: "I know what my flow feels like" },
  { theme: "STUCK", question: "What's something you feel stuck with right now — and what would it take to get unstuck?", mantra: "Being stuck isn't permanent" },
  { theme: "CONNECTION", question: "Who have you been dodging that you actually miss?", mantra: "I don't have to do everything alone" },
  { theme: "GRATITUDE", question: "What's something good in your life that you keep forgetting to appreciate?", mantra: "I've got more than I realise" },
  { theme: "EGO", question: "Where are you trying too hard to impress people — and what would you be like if you just stopped?", mantra: "I don't need to prove myself to everyone" },
  { theme: "JOY", question: "What makes you lose track of time because you love it that much?", mantra: "Joy isn't a waste of time — it's the point" },
  { theme: "LETTING GO", question: "What's something from your past that still controls how you act today?", mantra: "I'm allowed to let old things go" },
  { theme: "COURAGE", question: "What's the hardest thing you've been through — and what did it teach you about yourself?", mantra: "I'm tougher than I think" },
  { theme: "HONESTY", question: "What's something you need to be real with yourself about — even if it's uncomfortable?", mantra: "The truth sets things straight" },
  { theme: "BOUNDARIES", question: "Who or what is draining your energy — and what would it look like to step back from it?", mantra: "Saying no is looking after yourself" },
  { theme: "GROWTH", question: "How are you different from who you were a year ago — and do you give yourself credit for that?", mantra: "I've come further than I realise" },
  { theme: "RESILIENCE", question: "Where do you feel like you can't be yourself — and what would it take to change that?", mantra: "My real self is worth protecting" },
  { theme: "ROOTS", question: "What have you picked up from your family — good or bad — that you need to decide if you want to keep?", mantra: "I choose what I carry forward" },
  { theme: "VOICE", question: "What's something you've been wanting to say but haven't said yet?", mantra: "My voice matters" },
  { theme: "REST", question: "When's the last time you properly switched off — no phone, no noise, just nothing?", mantra: "Rest isn't lazy — it's how I recharge" },
  { theme: "CHANGE", question: "What old version of yourself are you ready to leave behind?", mantra: "I'm allowed to become someone new" },
  { theme: "SURVIVAL", question: "What's something difficult you've been through that actually made you stronger?", mantra: "What I survived built who I am" },
  { theme: "STILLNESS", question: "What are you running from by always staying busy?", mantra: "Slowing down doesn't mean falling behind" },
  { theme: "BELONGING", question: "Where's the one place you feel most like yourself?", mantra: "I belong somewhere — and I know where" },
  { theme: "TRUTH", question: "Are you being real with the people closest to you, or just telling them what they want to hear?", mantra: "Real ones can handle the truth" },
  { theme: "NEW CHAPTER", question: "Something new is starting in your life — what do you need to remember about yourself going into it?", mantra: "I bring everything I've learned with me" },
  { theme: "LOYALTY", question: "Who's been there for you when it actually mattered — and have you told them?", mantra: "Loyalty runs both ways" },
  { theme: "FEAR", question: "What scares you most right now — and what would you do if you weren't scared?", mantra: "Fear means it matters" },
  { theme: "FORGIVENESS", question: "Who do you need to forgive — even if it's yourself?", mantra: "Forgiveness is for me, not for them" },
  { theme: "RESPECT", question: "Do you treat yourself with the same respect you give to people you admire?", mantra: "I deserve what I give" },
  { theme: "ENERGY", question: "What gives you energy and what takes it away — and are you honest about the difference?", mantra: "I protect my energy like it matters" },
  { theme: "AMBITION", question: "What do you actually want from life — not what you're supposed to want, what you really want?", mantra: "My dreams are allowed to be mine" },
  { theme: "PRESSURE", question: "Where are you putting pressure on yourself that nobody else is actually putting on you?", mantra: "I don't owe anyone perfection" },
  { theme: "PRIDE", question: "What's something you've done recently that you're genuinely proud of — even if nobody noticed?", mantra: "I see my own wins" },
  { theme: "ANGER", question: "What's something you're angry about that you haven't dealt with yet?", mantra: "Anger is information — not the enemy" },
  { theme: "TRUST YOURSELF", question: "When's the last time you trusted your gut — and were you right?", mantra: "I know more than I think I do" },
  { theme: "ISOLATION", question: "Are you choosing to be alone, or are you hiding?", mantra: "There's a difference between space and avoidance" },
  { theme: "CONTROL", question: "What would happen if you let go of something you've been gripping too tight?", mantra: "Not everything is mine to hold" },
  { theme: "INFLUENCE", question: "Who do you become when you're around certain people — and is that who you want to be?", mantra: "I choose who I become" },
  { theme: "SACRIFICE", question: "What are you giving up to get where you want to go — and is it worth it?", mantra: "Every choice costs something" },
  { theme: "HOME", question: "What does 'home' feel like to you — is it a place, a person, or something inside you?", mantra: "I carry home with me" },
  { theme: "MISTAKES", question: "What's a mistake you keep repeating — and what would breaking that pattern look like?", mantra: "Noticing the pattern is the first step" },
  { theme: "STRENGTH", question: "What's the strongest thing about you that other people might not see?", mantra: "Quiet strength is still strength" },
  { theme: "EXPRESSION", question: "If you could say anything right now with zero consequences — what would it be?", mantra: "My words carry weight" },
  { theme: "LEGACY", question: "What do you want people to say about you when you're not in the room?", mantra: "My reputation is what I build daily" },
  { theme: "VULNERABILITY", question: "What's something you find hard to talk about — and what makes it hard?", mantra: "Being open takes more guts than staying closed" },
  { theme: "DIRECTION", question: "Are you moving toward something or running away from something — and do you know the difference?", mantra: "I choose where I'm headed" },
  { theme: "SELF-WORTH", question: "Do you believe you deserve good things — honestly?", mantra: "I am worth what I'm building toward" },
  { theme: "MASKS", question: "Which version of yourself are you performing today — and which one is real?", mantra: "The mask gets heavy eventually" },
  { theme: "HOPE", question: "What's one thing you're genuinely hopeful about right now?", mantra: "Hope isn't soft — it's survival" },
  { theme: "TIME", question: "If you knew you only had one year to do something meaningful — what would you start today?", mantra: "Time is the one thing I can't get back" },
  { theme: "SUPPORT", question: "Who do you let support you — and who do you push away when they try?", mantra: "Accepting help is not weakness" },
  { theme: "FREEDOM", question: "What does freedom actually look like for you — not the Instagram version, the real one?", mantra: "Freedom starts inside" },
  { theme: "COMPARISON", question: "Who are you comparing yourself to — and what would happen if you stopped?", mantra: "My journey is mine" },
  { theme: "PURPOSE", question: "When do you feel most alive — like you're doing exactly what you're meant to do?", mantra: "My purpose shows up when I pay attention" },
  { theme: "LOSS", question: "What have you lost that still affects you — and have you let yourself feel it properly?", mantra: "Grief is love with nowhere to go" },
  { theme: "PRESENCE", question: "Right now, in this exact moment — how are you actually doing?", mantra: "This moment is the only one that's real" },
  { theme: "CREATION", question: "What do you want to make that doesn't exist yet?", mantra: "If I can imagine it, I can build it" },
  { theme: "COMPLETION", question: "What's something you started and never finished that still nags at you?", mantra: "Finishing is a form of respect — for yourself" },
];

// ── ARRIVAL CHECK-IN ────────────────────────
// Quick skippable check-in after starting a session. Captures arrival state.
export const ARRIVAL_QUESTIONS = [
  { id: "arrival_energy", question: "How are you arriving today?", options: [
    { emoji: "😴", label: "Low energy", value: 1 }, { emoji: "😐", label: "Neutral", value: 2 },
    { emoji: "🙂", label: "Alright", value: 3 }, { emoji: "⚡", label: "Buzzing", value: 4 },
  ]},
  { id: "arrival_mood", question: "What's the mood?", options: [
    { emoji: "😤", label: "Stressed", value: 1 }, { emoji: "😔", label: "Down", value: 2 },
    { emoji: "😶", label: "Calm", value: 3 }, { emoji: "😊", label: "Good", value: 4 },
  ]},
  { id: "arrival_ready", question: "Ready to create?", options: [
    { emoji: "🤷", label: "Not really", value: 1 }, { emoji: "🤔", label: "Maybe", value: 2 },
    { emoji: "👍", label: "Yeah", value: 3 }, { emoji: "🔥", label: "Let's go", value: 4 },
  ]},
];
// Optional post-session feedback from the young person's perspective.
// Quick, emoji-based or simple taps. Should take under 2 minutes.
export const YP_FEEDBACK_QUESTIONS = [
  {
    id: "yp_feel",
    question: "How did today's session feel?",
    type: "emoji",
    options: [
      { emoji: "😔", label: "Not great", value: 1 },
      { emoji: "😐", label: "Okay", value: 2 },
      { emoji: "🙂", label: "Good", value: 3 },
      { emoji: "😊", label: "Really good", value: 4 },
      { emoji: "🔥", label: "Loved it", value: 5 },
    ],
  },
  {
    id: "yp_heard",
    question: "Did you feel heard today?",
    type: "emoji",
    options: [
      { emoji: "🚫", label: "Not at all", value: 1 },
      { emoji: "🤏", label: "A little", value: 2 },
      { emoji: "👍", label: "Yeah", value: 3 },
      { emoji: "💯", label: "Fully", value: 4 },
    ],
  },
  {
    id: "yp_creative",
    question: "How did the creative work feel?",
    type: "emoji",
    options: [
      { emoji: "😶", label: "Stuck", value: 1 },
      { emoji: "🤔", label: "Unsure", value: 2 },
      { emoji: "✨", label: "Flowing", value: 3 },
      { emoji: "🚀", label: "On fire", value: 4 },
    ],
  },
  {
    id: "yp_safe",
    question: "Did you feel safe being yourself?",
    type: "emoji",
    options: [
      { emoji: "😬", label: "Not really", value: 1 },
      { emoji: "😶", label: "Mostly", value: 2 },
      { emoji: "😌", label: "Yeah", value: 3 },
      { emoji: "🫶", label: "Completely", value: 4 },
    ],
  },
  {
    id: "yp_takeaway",
    question: "One thing you're taking away from today?",
    type: "text",
    placeholder: "Anything — a lyric, a feeling, something you learned...",
  },
  {
    id: "yp_next",
    question: "Anything you want to do differently next time?",
    type: "text",
    placeholder: "Optional — skip if nothing comes to mind",
  },
];

// ── SET PACE FEEDBACK QUESTIONS ──────────────
export const SP_FEEDBACK_QUESTIONS = [
  {
    id: "sp_feel",
    question: "How did today's session feel?",
    type: "emoji",
    options: [
      { emoji: "😔", label: "Rough", value: 1 },
      { emoji: "😐", label: "Okay", value: 2 },
      { emoji: "💪", label: "Strong", value: 3 },
      { emoji: "🔥", label: "Powerful", value: 4 },
      { emoji: "⚡", label: "Unstoppable", value: 5 },
    ],
  },
  {
    id: "sp_pushed",
    question: "Did you push yourself today?",
    type: "emoji",
    options: [
      { emoji: "🤷", label: "Not really", value: 1 },
      { emoji: "👍", label: "A bit", value: 2 },
      { emoji: "💪", label: "Yeah", value: 3 },
      { emoji: "🏆", label: "Gave it everything", value: 4 },
    ],
  },
  {
    id: "sp_headspace",
    question: "How's your headspace now compared to when you walked in?",
    type: "emoji",
    options: [
      { emoji: "😤", label: "Worse", value: 1 },
      { emoji: "😐", label: "Same", value: 2 },
      { emoji: "😌", label: "Clearer", value: 3 },
      { emoji: "🧘", label: "Calm & focused", value: 4 },
    ],
  },
  {
    id: "sp_team",
    question: "How did the group feel today?",
    type: "emoji",
    options: [
      { emoji: "😬", label: "Awkward", value: 1 },
      { emoji: "😶", label: "Quiet", value: 2 },
      { emoji: "🤝", label: "Connected", value: 3 },
      { emoji: "⚡", label: "Electric", value: 4 },
    ],
  },
  {
    id: "sp_takeaway",
    question: "One thing from today you'll carry into the week?",
    type: "text",
    placeholder: "Could be a feeling, something you learned about yourself, anything...",
  },
];

// ── 5-STEP WRITING PROMPTS ──────────────────
export const SESSION_ACTIVITIES = {
  Reset: [
    { type: "conversation", prompt: "What does feeling safe actually look like for you?", mentorNote: "Don't push for depth. Let them lead. The goal is them staying in the room and talking." },
    { type: "conversation", prompt: "What's been on your mind this week — anything heavy or light?", mentorNote: "Temperature check. Follow whatever they give you. If they say 'nothing', sit with that." },
    { type: "listening", prompt: "Play a track they like and talk about what it makes them feel", mentorNote: "Let them choose. Ask 'what draws you to this?' Not 'what does it mean?'" },
    { type: "listening", prompt: "Play a track with a calm energy and just sit with it together", mentorNote: "No analysis needed. Sometimes sharing a moment of quiet is the session." },
    { type: "freewrite", prompt: "Write anything — bars, thoughts, a list, whatever comes out. No rules.", mentorNote: "Zero pressure on quality. The act of putting pen to paper is the win." },
    { type: "freewrite", prompt: "If you had to describe today in one word, what is it? Now write four lines around that word.", mentorNote: "Tiny creative ask. Enough to feel like they made something. Don't critique." },
    { type: "voice-note", prompt: "Record a 30-second voice note about how you're feeling right now — just for you, no one else hears it", mentorNote: "The phone is less intimidating than the mic. Private expression." },
    { type: "songwriting", prompt: "Write a song about the difference between who you have to be out there and who you are in here", mentorNote: "Only offer this if they're settled and willing. Don't force it." },
  ],
  Reframe: [
    { type: "conversation", prompt: "Do you think you're the same person you were a year ago — what's changed?", mentorNote: "This is identity work. Reflect back what they say. 'So you're saying you used to... and now you...' " },
    { type: "conversation", prompt: "What's something people assume about you that isn't true?", mentorNote: "Separating identity from reputation. Let them feel the difference." },
    { type: "pulse-card", prompt: "Draw a Pulse Card and spend 15–20 minutes unpacking whatever it surfaces", mentorNote: "The card is the session. Don't rush past it to 'make something'. The conversation IS the work." },
    { type: "listening", prompt: "Play a track where the artist is being vulnerable — talk about what it takes to do that", mentorNote: "Modelling emotional honesty through someone else's art before asking for theirs." },
    { type: "freewrite", prompt: "Write a letter to the version of yourself from two years ago. What would you say?", mentorNote: "Doesn't have to be bars. Can be prose. The reflection is the point." },
    { type: "songwriting", prompt: "Write something about a belief you used to hold that turned out to be wrong", mentorNote: "This is reframe in action — old narrative vs new understanding." },
    { type: "songwriting", prompt: "Write about who you're becoming — even if you're not there yet", mentorNote: "Future identity work. Aspirational but grounded in their real experience." },
    { type: "conversation", prompt: "What triggers you most — and do you know why?", mentorNote: "Self-awareness work. Don't therapise. Just ask and listen." },
  ],
  Rebuild: [
    { type: "songwriting", prompt: "Finish something you started last session — the goal is completion, not perfection", mentorNote: "This is the stage where you push for follow-through. Gently but clearly." },
    { type: "songwriting", prompt: "Write and record a full verse and hook in this session — start to finish", mentorNote: "Set a deadline within the session. Structure breeds discipline." },
    { type: "recording", prompt: "Take something they've written and get it recorded properly — focus on delivery and quality", mentorNote: "Craft matters now. Give technical feedback. Push for another take." },
    { type: "recording", prompt: "Re-record a track from a previous session and compare the two versions", mentorNote: "Shows them their own growth. Powerful for confidence and skill awareness." },
    { type: "freewrite", prompt: "Write 16 bars in 15 minutes — no stopping, no editing, just flow", mentorNote: "Building creative muscle. Speed and consistency over perfection." },
    { type: "songwriting", prompt: "Write a song about what discipline feels like from the inside — not punishment, but commitment", mentorNote: "The theme matches the stage. Meta but effective." },
    { type: "conversation", prompt: "What's your creative goal for the next month — and what would it take to actually hit it?", mentorNote: "10 minutes max. Then hold them to it in future sessions." },
    { type: "collaboration", prompt: "Work on a track together — mentor produces, young person writes and records", mentorNote: "Collaborative studio work. Models professional creative process." },
  ],
  Release: [
    { type: "review", prompt: "Listen back to one of their tracks and interrogate it — 'why this word? who is this for? what do you want someone to feel?'", mentorNote: "Signal Card energy. Creative interrogation. This is the stage for it." },
    { type: "songwriting", prompt: "Write something that tells the truth about an experience without glorifying or minimising it", mentorNote: "Responsible expression. The craft of honesty." },
    { type: "songwriting", prompt: "Write a track where every line is intentional — be able to explain every choice", mentorNote: "Intentionality over impulse. Challenge them on lazy lines." },
    { type: "conversation", prompt: "If a younger kid heard your music, what would they take from it — and are you OK with that?", mentorNote: "Impact awareness. Not censorship — consciousness." },
    { type: "recording", prompt: "Record a final version of a track ready to share — master it, own it", mentorNote: "Release-ready work. Treat it like it matters, because it does." },
    { type: "peer-work", prompt: "Listen to another young person's track and give them honest, constructive feedback", mentorNote: "If you have two YPs, this is gold. If not, use a published track." },
    { type: "conversation", prompt: "What's the difference between performing toughness and actually being strong — and which is in your music?", mentorNote: "Deep question. Only ask when trust is solid." },
    { type: "songwriting", prompt: "Write a song as a letter to someone you've never been able to say the right thing to", mentorNote: "Emotional directness through creative distance." },
  ],
  Rise: [
    { type: "peer-work", prompt: "Co-run the first 15 minutes of a session with a newer young person", mentorNote: "Give them real responsibility. Debrief afterward — how did it feel to lead?" },
    { type: "peer-work", prompt: "Help a younger participant develop an idea into bars — mentor them through it", mentorNote: "Your role is to watch, not intervene. Let them lead." },
    { type: "songwriting", prompt: "Write a song for someone just starting out who is where you used to be", mentorNote: "Legacy work. Passing on what they've learned." },
    { type: "songwriting", prompt: "Write something about what it means to have influence — and what you want to do with yours", mentorNote: "Platform consciousness. Small audience still matters." },
    { type: "review", prompt: "Review your own catalogue — what does your body of work say about who you are?", mentorNote: "Step back and see the arc. Powerful reflective exercise." },
    { type: "conversation", prompt: "What does legacy mean to you at your age — not fame, legacy?", mentorNote: "Big question. Give it space. Don't rush to the next thing." },
    { type: "recording", prompt: "Produce and record something from scratch in one session — full creative ownership", mentorNote: "Trust them with the whole process. Your job is to step back." },
    { type: "conversation", prompt: "Where do you want to take your music next — and what support do you need to get there?", mentorNote: "Transition conversation. What happens after Pathways?" },
  ],
};

// Keep WRITING_PROMPTS as backwards-compatible alias (extracts just songwriting prompts)
export const WRITING_PROMPTS = Object.fromEntries(
  Object.entries(SESSION_ACTIVITIES).map(([stage, activities]) => [
    stage,
    activities.filter(a => a.type === "songwriting").map(a => a.prompt),
  ])
);

// ── READING THE SIGNAL CATEGORIES ───────────
export const SIGNAL_CATEGORIES = [
  {
    id: "aggression",
    title: "Aggression & Threat Language",
    signal: "Song contains threats, violent imagery, or language designed to intimidate.",
    questions: [
      "Who are you actually angry at in real life — and is this song really about them?",
      "Is the aggression in this song protecting something in you that feels exposed?",
      "If you took the threatening language out, what emotion would be left underneath it?",
      "What do you actually want the listener to feel — fear, or respect?",
    ],
    realSignal: "I am in pain. I want to be taken seriously. I don't feel safe.",
  },
  {
    id: "substance",
    title: "Substance Glorification",
    signal: "Song presents drug or alcohol use as a solution, a status symbol, or a lifestyle.",
    questions: [
      "What does the substance in this song actually represent — freedom, escape, belonging, numbness?",
      "If you wrote about what you're escaping from instead, what would that song be?",
      "Who in your life has been hurt by what you're making sound appealing here?",
      "Is this your real experience or are you performing what you think is expected of you?",
    ],
    realSignal: "I am trying to cope. I want to feel free. I want to belong.",
  },
  {
    id: "disrespect_women",
    title: "Disrespect Toward Women",
    signal: "Song degrades, objectifies, or dismisses women or girls.",
    questions: [
      "Who are the women in your life that you actually respect — would this song change how they see you?",
      "Is the way you're talking about women in this song how you actually feel, or is it borrowed from what you've heard?",
      "What are you trying to prove with this language — and to who?",
      "Could you write the same energy with the same confidence without reducing anyone?",
    ],
    realSignal: "I want to feel powerful. I want to be desired. I don't know how to be vulnerable with women.",
  },
  {
    id: "materialism",
    title: "Materialism as Identity",
    signal: "Song equates worth, success, or identity entirely with possessions, money, or status symbols.",
    questions: [
      "What does the money or the things in this song actually represent to you emotionally?",
      "What did you go without growing up that this song is really about?",
      "If you lost everything you're describing — what would be left of you, and is that in the song?",
      "What would it feel like to write about wanting security or dignity rather than the things themselves?",
    ],
    realSignal: "I want to feel secure. I want to be respected. I never want to feel powerless again.",
  },
  {
    id: "victim",
    title: "Victim Mentality Without Resolution",
    signal: "Song stays in pain, blame, or grievance without any movement toward agency or truth.",
    questions: [
      "Is this song helping you process something or keeping you stuck in it?",
      "Is there a version of this story where you have any power — even just the power to survive it?",
      "Who else might hear this song and feel like there's no way out — is that the message you want to send?",
      "What do you know now that you didn't know then, and does that belong in this song?",
    ],
    realSignal: "I need to be witnessed. I haven't been heard. I am still carrying this.",
  },
  {
    id: "coded",
    title: "Coded or Indirect Harmful Content",
    signal: "Song uses language or imagery that signals involvement in or glorification of gang culture or criminal activity.",
    questions: [
      "If someone who didn't know you heard this, what would they assume about your life?",
      "Is what you're referencing something you're proud of, or something you're still attached to out of habit?",
      "What part of you is this content speaking for — and is that the part you want to be known for?",
      "Could you tell the same story from the perspective of someone who came through it, rather than someone still in it?",
    ],
    realSignal: "This is where I came from. I don't want to pretend. I'm not sure who I am without it.",
  },
  {
    id: "performing",
    title: "Performing Emotion Without Feeling It",
    signal: "Song sounds technically competent but emotionally hollow — uses the right words but doesn't feel true.",
    questions: [
      "What were you actually feeling when you wrote this — before you made it sound good?",
      "Is there a line in here that surprises even you, that came from somewhere real?",
      "What would you have to risk to make this song actually cost you something?",
      "Who are you writing for — the audience, or yourself?",
    ],
    realSignal: "I don't feel safe being vulnerable. I don't know if my real feelings are good enough.",
  },
];
