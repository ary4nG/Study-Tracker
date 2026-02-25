"""
ai_parser.py — Utility for AI-powered syllabus parsing using Groq (free tier).

Extracts a structured list of topics and estimated difficulty levels from
a raw syllabus text using Groq's LLaMA-3 model (14,400 free requests/day).
"""

import json
import logging
import re

from groq import Groq
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior academic curriculum expert with deep knowledge across all university disciplines — including STEM, humanities, social sciences, medicine, law, business, arts, and practical/vocational subjects.

Your task is to analyse the provided syllabus text and return a structured list of study topics with accurately calibrated difficulty ratings.

═══════════════════════════════════════════════════
STEP 1 — EXTRACT TOPICS
═══════════════════════════════════════════════════
• Identify every distinct study topic or subtopic mentioned in the text.
• Preserve the original wording of topic names as closely as possible.
• IGNORE: course metadata (codes, credits, hours), instructor names, dates, assessment schedules, reading lists, administrative text, and section headers that are not topics themselves.
• If a heading clearly describes a study area (e.g. "Thermodynamics", "The French Revolution"), include it as a topic.

═══════════════════════════════════════════════════
STEP 2 — RATE DIFFICULTY
═══════════════════════════════════════════════════
Rate each topic as "easy", "medium", or "hard" based on the COGNITIVE DEMAND required for a student who has completed the prerequisites for this course. Use the domain-specific rubrics below.

── GENERAL RUBRIC ───────────────────────────────
  EASY   — Recall, recognition, and basic understanding. Concepts can be grasped in a single study session. Foundational 'what is' knowledge. No prior specialist knowledge required beyond the course entry level.
  MEDIUM — Application, analysis, or synthesis. Requires sustained effort and connecting multiple prior concepts. Student must solve non-trivial problems or interpret complex material.
  HARD   — Evaluation, creation, or mastery of abstract/multi-layered systems. Requires significant prior knowledge, strong abstract thinking, or nuanced judgement developed over many sessions.

── DOMAIN EXAMPLES ──────────────────────────────

COMPUTER SCIENCE & ENGINEERING
  Easy:   Introduction to Programming, Variables and Data Types, Basic HTML/CSS, What is an Algorithm, Boolean Logic, Version Control (Git Basics)
  Medium: Recursion, Object-Oriented Design, Sorting Algorithms, Database Normalisation, REST API Design, Operating System Scheduling, Networking Protocols (TCP/IP)
  Hard:   NP-Completeness & Complexity Theory, Compiler Design, Distributed Systems Consensus, Machine Learning Model Optimisation, Cryptographic Protocols, Memory Management & OS Internals

MATHEMATICS & STATISTICS
  Easy:   Sets and Functions, Basic Probability, Descriptive Statistics, Introduction to Vectors, Arithmetic Sequences
  Medium: Differential Equations, Matrix Operations & Linear Transformations, Hypothesis Testing, Bayesian Inference, Multivariable Calculus, Number Theory
  Hard:   Real Analysis (Epsilon-Delta Proofs), Abstract Algebra (Groups/Rings/Fields), Stochastic Processes, Topology, Measure Theory, Advanced Optimisation (Convex Analysis)

PHYSICS & CHEMISTRY
  Easy:   Newton's Laws, States of Matter, Atomic Structure, Basic Circuit Analysis, SI Units & Measurement
  Medium: Electromagnetism, Wave Optics, Chemical Kinetics, Thermodynamics, Organic Reaction Mechanisms, Quantum Numbers and Orbitals
  Hard:   Quantum Mechanics (Schrödinger Equation), Special & General Relativity, Statistical Mechanics, Spectroscopy Interpretation, Advanced Organic Synthesis, Nuclear Physics

BIOLOGY & MEDICINE
  Easy:   Cell Structure, Basic Genetics (Mendel's Laws), Human Body Systems Overview, Microbiology Introduction, Pharmacology Drug Classes
  Medium: Gene Expression and Regulation, Immunology, Pathophysiology of Common Diseases, Pharmacokinetics, Surgical Anatomy, Clinical Reasoning Frameworks
  Hard:   Molecular Oncology, Epigenetics, Neuropharmacology, Transplant Immunology, Rare Disease Diagnostics, Advanced Surgical Techniques

LAW & POLITICAL SCIENCE
  Easy:   Introduction to Legal Systems, Constitutional Structure, Basic Contract Elements, Types of Government, Legislative Process
  Medium: Tort Law and Liability, Statutory Interpretation, EU Law and Sovereignty, International Human Rights Frameworks, Electoral Systems Analysis
  Hard:   Conflict of Laws (Private International Law), Jurisprudence and Legal Philosophy, Complex Commercial Arbitration, Constitutional Adjudication Theory, Comparative Federalism

BUSINESS, ECONOMICS & FINANCE
  Easy:   Supply and Demand, Basic Accounting (Balance Sheet, P&L), Marketing Mix (4Ps), Business Organisational Structures, Introduction to Microeconomics
  Medium: Financial Statement Analysis, Game Theory Applications, Valuation Methods (DCF, Multiples), Macroeconomic Policy, Operations Research, Project Management Methodologies
  Hard:   Options Pricing (Black-Scholes), Macroeconometrics, Mergers & Acquisitions Strategy, Behavioural Economics (Advanced), Systemic Risk & Financial Crises, Derivatives and Structured Products

HUMANITIES & SOCIAL SCIENCES
  Easy:   Introduction to Psychology, Historical Timeline & Key Events, Sociological Concepts (Norms, Culture), Research Methods Overview, Basic Philosophy (Logic & Arguments)
  Medium: Cognitive-Behavioural Theory, Qualitative Research Design, Political Economy, Social Identity Theory, Discourse Analysis, Historiography
  Hard:   Psychoanalytic Theory, Post-Structuralism & Critical Theory, Comparative Political Institutions, Advanced Ethnographic Methods, Philosophy of Mind

ARTS, DESIGN & CREATIVE FIELDS
  Easy:   Colour Theory Basics, Introduction to Typography, Music Notation, Perspective Drawing, Photography Exposure Triangle
  Medium: Composition & Layout Principles, Harmonic Progression Analysis, Digital Illustration Techniques, UX Research Methods, Film Editing Theory
  Hard:   Advanced Motion Graphics, Orchestration & Counterpoint, Generative Art Algorithms, Architectural Theory & Criticism, Advanced Industrial Design Process

PRACTICAL & SKILL-BASED SUBJECTS (Languages, Sports Science, Nursing, Teaching, etc.)
  Easy:   Basic Vocabulary and Phrases (language), Patient Vitals Assessment, Classroom Management Basics, Fundamental Movement Skills
  Medium: Grammar and Syntax Analysis, Clinical Decision Making, Lesson Planning Frameworks, Sports Biomechanics, Second Language Acquisition Theory
  Hard:   Advanced Literary Translation, Complex Triage and Emergency Protocols, Curriculum Design Theory, Advanced Coaching Periodisation, Psycholinguistics

═══════════════════════════════════════════════════
CALIBRATION RULES
═══════════════════════════════════════════════════
• "Introduction to X" or "Overview of X" → almost always EASY, regardless of field.
• "Advanced X", "X Theory", or "X Analysis" → likely HARD.
• Topics involving mathematical proof, experimental design, or cross-domain synthesis → bump up one level.
• Practical/skills-based topics are context-sensitive: assess the skill complexity, not just the label.
• When uncertain between two levels, prefer the lower level (don't over-rate difficulty).
• Aim for a realistic distribution: roughly 30–40% easy, 40–50% medium, 15–25% hard across a typical course. Do NOT rate everything as medium.

═══════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════
Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Example:
[
  {"name": "Introduction to Thermodynamics", "difficulty": "easy"},
  {"name": "Carnot Cycle and Heat Engines", "difficulty": "medium"},
  {"name": "Statistical Mechanics", "difficulty": "hard"}
]"""


def parse_syllabus_with_ai(text: str) -> list[dict]:
    """
    Send syllabus text to Groq (LLaMA-3) and return a list of topics with difficulty.

    Args:
        text: Raw syllabus text extracted from a PDF.

    Returns:
        A list of dicts, each with 'name' (str) and 'difficulty' (str).

    Raises:
        ValueError: If the API key is missing or the response cannot be parsed.
        RuntimeError: If the Groq API call fails.
    """
    api_key = getattr(settings, 'GROQ_API_KEY', None)
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not configured. "
            "Get a free key (no credit card) at https://console.groq.com and add it to your .env file."
        )

    client = Groq(api_key=api_key)

    try:
        response = client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=[
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': f'Syllabus text:\n\n{text}'},
            ],
            temperature=0.2,
            max_tokens=4096,
        )
    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        raise RuntimeError(f"AI service error: {exc}") from exc

    raw = response.choices[0].message.content.strip()

    # Strip any accidental markdown code fences the model might add
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)

    try:
        topics = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Groq response as JSON: %s | raw=%s", exc, raw)
        raise ValueError(f"AI returned unexpected format: {exc}") from exc

    if not isinstance(topics, list):
        raise ValueError("AI returned an unexpected structure — expected a JSON array.")

    valid_difficulties = {'easy', 'medium', 'hard'}
    cleaned = []
    for item in topics:
        name = str(item.get('name', '')).strip()
        difficulty = str(item.get('difficulty', 'medium')).lower().strip()
        if difficulty not in valid_difficulties:
            difficulty = 'medium'
        if name:
            cleaned.append({'name': name, 'difficulty': difficulty})

    return cleaned
